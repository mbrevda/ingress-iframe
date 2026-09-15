import {
  type HassPanelInfo,
  cleanTarget,
  extractAddonSlug,
  isTemplate,
  parseAspectRatio,
  stripOrigin,
} from "#src/urlResolver.ts";

type GridOptions = {
  columns?: number | "full" | "auto";
  rows?: number | "auto";
  min_columns?: number;
  min_rows?: number;
  max_columns?: number;
  max_rows?: number;
  grid_columns?: number | "full" | "auto";
  grid_rows?: number | "auto";
  grid_min_columns?: number;
  grid_min_rows?: number;
  grid_max_columns?: number;
  grid_max_rows?: number;
};

type IngressCardConfig = {
  type: string;
  url?: string;
  title?: string;
  addon?: string;
  panel?: string;
  height?: string;
  aspect_ratio?: string;
  allow?: string;
  sandbox?: string;
  grid_options?: GridOptions;
  layout_options?: GridOptions;
};

type AddonInfo = {
  ingress_url?: string;
  ingress_entry?: string;
  version?: string;
  state?: string;
  slug?: string;
  name?: string;
  [key: string]: unknown;
};

type HomeAssistant = {
  panels?: Record<string, HassPanelInfo>;
  connection: {
    subscribeMessage: <T>(
      callback: (result: T) => void,
      params: Record<string, unknown>,
    ) => Promise<() => void>;
  };
  callWS: <T>(params: {
    type: string;
    endpoint?: string;
    method?: string;
    [key: string]: unknown;
  }) => Promise<T>;
};

const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000;
const DEFAULT_ALLOW =
  "fullscreen; autoplay; clipboard-write; microphone; camera";
const DEFAULT_SANDBOX =
  "allow-forms allow-modals allow-popups allow-pointer-lock allow-same-origin allow-scripts allow-downloads";

const BaseElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

function setIngressCookie(session: string): void {
  if (typeof document === "undefined") return;
  const isHttps =
    typeof location !== "undefined" && location.protocol === "https:";
  const cookieStr = `ingress_session=${session};path=/api/hassio_ingress/;SameSite=Strict${
    isHttps ? ";Secure" : ""
  }`;

  const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
  if (desc?.set) {
    desc.set.call(document, cookieStr);
  } else {
    Reflect.set(document, "cookie", cookieStr);
  }
}

function resolveGridOptions(config?: IngressCardConfig): {
  grid_columns?: number;
  grid_rows: number | "auto";
  grid_min_columns: number;
  grid_min_rows: number;
} {
  const isAspect = Boolean(config?.aspect_ratio);
  const opts = config?.grid_options || config?.layout_options;
  if (!opts) {
    return {
      grid_min_columns: 1,
      grid_min_rows: 2,
      grid_rows: isAspect ? "auto" : 8,
    };
  }

  const rawCols = opts.grid_columns ?? opts.columns;
  const rawRows = opts.grid_rows ?? opts.rows;
  const cols = typeof rawCols === "number" ? rawCols : undefined;
  let rows: number | "auto" = isAspect ? "auto" : 8;
  if (rawRows !== undefined) rows = rawRows;

  const rawMinCols = opts.grid_min_columns ?? opts.min_columns;
  const rawMinRows = opts.grid_min_rows ?? opts.min_rows;
  const minCols = typeof rawMinCols === "number" ? rawMinCols : 1;
  const minRows = typeof rawMinRows === "number" ? rawMinRows : 2;

  return {
    grid_columns: cols,
    grid_min_columns: minCols,
    grid_min_rows: minRows,
    grid_rows: rows,
  };
}

class DynamicIngressCard extends BaseElement {
  public static getConfigElement(): HTMLElement {
    return document.createElement("ingress-card-editor");
  }

  public static getStubConfig(): IngressCardConfig {
    return {aspect_ratio: "56.25%", type: "custom:ingress-card", url: ""};
  }

  private _config?: IngressCardConfig;
  private _hass?: HomeAssistant;
  private _initialized = false;
  private _currentSrc: string | null = null;
  private _unsubTemplate: (() => void) | null = null;
  private _refreshInterval: ReturnType<typeof setInterval> | null = null;

  public constructor() {
    super();
    if (typeof this.attachShadow === "function") {
      this.attachShadow({mode: "open"});
    }
  }

  public setConfig(config: IngressCardConfig): void {
    if (!config) throw new Error("Invalid configuration for ingress-card");
    this._config = {...config};
    const rawTarget = cleanTarget(
      this._config.url ?? this._config.addon ?? this._config.panel ?? "",
    );
    if (!rawTarget) {
      this._renderPlaceholder();
    } else if (this._initialized && this._hass) {
      this._init(this._hass);
    }
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this._initialized && hass && this._config) {
      this._initialized = true;
      this._init(hass);
    }
  }

  public connectedCallback(): void {
    if (!this.shadowRoot && typeof this.attachShadow === "function") {
      this.attachShadow({mode: "open"});
    }
    const rawTarget = cleanTarget(
      this._config?.url ?? this._config?.addon ?? this._config?.panel ?? "",
    );
    if (!rawTarget) this._renderPlaceholder();
  }

  public disconnectedCallback(): void {
    if (this._unsubTemplate) {
      this._unsubTemplate();
      this._unsubTemplate = null;
    }
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
    this._initialized = false;
  }

  private _init(hass: HomeAssistant): void {
    if (this._unsubTemplate) {
      this._unsubTemplate();
      this._unsubTemplate = null;
    }

    const rawTarget = cleanTarget(
      this._config?.url ?? this._config?.addon ?? this._config?.panel ?? "",
    );

    if (!rawTarget) {
      this._renderPlaceholder();
      return;
    }

    if (isTemplate(rawTarget)) {
      hass.connection
        .subscribeMessage<string>(
          (msg) => {
            void this._resolveAndLoad(msg, hass);
          },
          {template: rawTarget, type: "render_template"},
        )
        .then((unsub) => {
          this._unsubTemplate = unsub;
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this._showError(`Template render error: ${message}`);
        });
    } else {
      void this._resolveAndLoad(rawTarget, hass);
    }

    if (!this._refreshInterval) {
      this._refreshInterval = setInterval(() => {
        void this._refreshIngressSession();
      }, KEEP_ALIVE_INTERVAL_MS);
    }
  }

  private async _refreshIngressSession(): Promise<string | null> {
    if (!this._hass) return null;
    try {
      const resp = await this._hass.callWS<{session?: string}>({
        endpoint: "/ingress/session",
        method: "post",
        type: "supervisor/api",
      });
      if (resp?.session) {
        setIngressCookie(resp.session);
        return resp.session;
      }
    } catch {
      // Non-fatal background refresh
    }
    return null;
  }

  private async _resolveAndLoad(
    target: string,
    hass: HomeAssistant,
  ): Promise<void> {
    if (!target) {
      this._renderPlaceholder();
      return;
    }

    const cleaned = cleanTarget(target);
    const localTarget = stripOrigin(cleaned);

    // Direct Ingress URL (/api/hassio_ingress/...)
    if (localTarget.startsWith("/api/hassio_ingress/")) {
      await this._refreshIngressSession();
      const base = localTarget.replace(/\/+$/, "");
      const resolvedUrl = `${base}/`;
      if (this._currentSrc !== resolvedUrl) {
        this._currentSrc = resolvedUrl;
        this._renderIframe(resolvedUrl);
      }
      return;
    }

    const addonMatch = extractAddonSlug(localTarget, hass.panels);
    let resolvedUrl = localTarget;

    if (addonMatch) {
      try {
        await this._refreshIngressSession();

        let info: AddonInfo | null = null;
        try {
          info = await hass.callWS<AddonInfo>({
            endpoint: `/addons/${addonMatch.addonSlug}/info`,
            method: "get",
            type: "supervisor/api",
          });
        } catch {
          // If direct addon slug failed, fallback to querying /addons list
          const list = await hass.callWS<{addons?: AddonInfo[]}>({
            endpoint: "/addons",
            method: "get",
            type: "supervisor/api",
          });
          const found = list?.addons?.find(
            (a) =>
              (typeof a.slug === "string" &&
                a.slug.toLowerCase() === addonMatch.addonSlug.toLowerCase()) ||
              (typeof a.name === "string" &&
                a.name.toLowerCase() === addonMatch.addonSlug.toLowerCase()),
          );
          if (found?.slug) {
            info = await hass.callWS<AddonInfo>({
              endpoint: `/addons/${found.slug}/info`,
              method: "get",
              type: "supervisor/api",
            });
          }
        }

        if (!info?.ingress_url) {
          this._showError(
            `No Ingress endpoint available for addon '${addonMatch.addonSlug}'. Ensure the addon is installed and started.`,
          );
          return;
        }

        const baseIngress = info.ingress_url.replace(/\/+$/, "");
        resolvedUrl = addonMatch.subpath
          ? `${baseIngress}${addonMatch.subpath}`
          : `${baseIngress}/`;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this._showError(`Failed to establish Ingress session: ${message}`);
        return;
      }
    }

    if (this._currentSrc !== resolvedUrl) {
      this._currentSrc = resolvedUrl;
      this._renderIframe(resolvedUrl);
    }
  }

  private _renderPlaceholder(): void {
    if (!this.shadowRoot) return;
    this._currentSrc = null;

    const title = this._config?.title || "Ingress Card";
    const aspectRatio = parseAspectRatio(this._config?.aspect_ratio);
    const height = aspectRatio ? "auto" : (this._config?.height ?? "240px");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          box-sizing: border-box;
        }
        ha-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px 20px;
          min-height: ${height};
          box-sizing: border-box;
          background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
          border-radius: var(--ha-card-border-radius, 12px);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, rgba(255, 255, 255, 0.12)));
          color: var(--primary-text-color, #ffffff);
          font-family: var(--paper-font-body1_-_font-family, inherit);
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .window-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 28px;
          background: rgba(127, 127, 127, 0.08);
          border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 6px;
        }
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          opacity: 0.7;
        }
        .dot.red { background: #ff5f56; }
        .dot.yellow { background: #ffbd2e; }
        .dot.green { background: #27c93f; }
        .window-title {
          font-size: 11px;
          color: var(--secondary-text-color, #9e9e9e);
          margin-left: 6px;
          font-weight: 500;
          letter-spacing: 0.3px;
        }
        .icon-container {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--primary-color, #03a9f4);
          color: var(--text-primary-color, #ffffff);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 14px;
          margin-bottom: 10px;
        }
        .icon-container svg {
          width: 24px;
          height: 24px;
          fill: currentColor;
        }
        .title {
          font-size: 15px;
          font-weight: 600;
          color: var(--primary-text-color, #ffffff);
          margin: 0 0 4px 0;
        }
        .subtitle {
          font-size: 11px;
          color: var(--secondary-text-color, #9e9e9e);
          max-width: 260px;
          line-height: 1.4;
          margin: 0 0 12px 0;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          justify-content: center;
          max-width: 300px;
        }
        .chip {
          background: rgba(127, 127, 127, 0.12);
          border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
          border-radius: 10px;
          padding: 2px 7px;
          font-size: 10px;
          font-weight: 500;
          color: var(--secondary-text-color, #b0b0b0);
        }
      </style>
      <ha-card>
        <div class="window-header">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
          <span class="window-title">${title}</span>
        </div>
        <div class="icon-container">
          <svg viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm0-13H5V5h14v1z"/>
          </svg>
        </div>
        <h2 class="title">${title}</h2>
        <p class="subtitle">Embed any Supervisor add-on or web application with Ingress session support.</p>
        <div class="chips">
          <span class="chip">ESPHome</span>
          <span class="chip">Node-RED</span>
          <span class="chip">Grafana</span>
          <span class="chip">Zigbee2MQTT</span>
        </div>
      </ha-card>
    `;
  }

  private _renderIframe(src: string): void {
    if (!this.shadowRoot) return;

    const title = this._config?.title;
    const height =
      this._config?.height ?? "calc(100dvh - var(--header-height, 64px))";
    const rawAspect = this._config?.aspect_ratio;
    const aspectRatio = parseAspectRatio(rawAspect);
    const isAspect = Boolean(aspectRatio);
    const paddingStyle = isAspect ? `padding-top: ${aspectRatio};` : "";
    const allow = this._config?.allow ?? DEFAULT_ALLOW;
    const sandbox = this._config?.sandbox ?? DEFAULT_SANDBOX;

    const headerHtml = title ? `<h1 class="card-header">${title}</h1>` : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        ha-card {
          overflow: hidden;
          height: 100%;
          width: 100%;
          box-sizing: border-box;
        }
        .card-header {
          color: var(--ha-card-header-color, --primary-text-color);
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-card-header-font-size, 24px);
          font-weight: normal;
          margin-block-start: 0;
          margin-block-end: 0;
          padding: 16px 16px 8px;
        }
        #root {
          position: relative;
          width: 100%;
          height: ${isAspect ? "0" : height};
          ${paddingStyle}
        }
        iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
      </style>
      <ha-card>
        ${headerHtml}
        <div id="root">
          <iframe
            src="${src}"
            allow="${allow}"
            sandbox="${sandbox}"
          ></iframe>
        </div>
      </ha-card>
    `;
  }

  private _showError(message: string): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 16px;
          color: var(--error-color, #db4437);
          background-color: var(--card-background-color, #fff);
          border-radius: var(--ha-card-border-radius, 12px);
          border: 1px solid var(--error-color, #db4437);
          font-family: var(--primary-font-family, inherit);
          font-size: 14px;
          line-height: 1.5;
        }
      </style>
      <ha-card>
        <strong>Ingress Card Error:</strong> ${message}
      </ha-card>
    `;
  }

  public getCardSize(): number {
    const rawAspect = this._config?.aspect_ratio;
    const aspectRatio = parseAspectRatio(rawAspect);
    const title = this._config?.title;
    if (aspectRatio) {
      const match = /^(\d+(?:\.\d+)?)%?$/.exec(aspectRatio.trim());
      const percent = match ? Number.parseFloat(match[1]) : 50;
      return 1 + Math.ceil(percent / 15) + (title ? 1 : 0);
    }
    const height = this._config?.height;
    if (height) {
      const pxMatch = /^(\d+)px$/i.exec(height.trim());
      if (pxMatch) {
        return (
          Math.max(1, Math.ceil(Number(pxMatch[1]) / 50)) + (title ? 1 : 0)
        );
      }
      return 10 + (title ? 1 : 0);
    }
    return 4 + (title ? 1 : 0);
  }

  public getLayoutOptions(): {
    grid_columns?: number;
    grid_rows: number | "auto";
    grid_min_columns: number;
    grid_min_rows: number;
  } {
    return resolveGridOptions(this._config);
  }
}

export {DynamicIngressCard, resolveGridOptions, setIngressCookie};
export type {AddonInfo, GridOptions, HomeAssistant, IngressCardConfig};
