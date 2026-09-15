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
  grid_columns: number | string;
  grid_rows: number | string;
  grid_min_columns: number;
  grid_min_rows: number;
} {
  const isAspect = Boolean(config?.aspect_ratio);
  const opts = config?.grid_options || config?.layout_options;
  if (!opts) {
    return {
      grid_columns: isAspect ? "auto" : "full",
      grid_min_columns: 1,
      grid_min_rows: 2,
      grid_rows: isAspect ? "auto" : 8,
    };
  }

  const cols = opts.grid_columns || opts.columns;
  const rows = opts.grid_rows || opts.rows;
  const minCols = opts.grid_min_columns || opts.min_columns;
  const minRows = opts.grid_min_rows || opts.min_rows;

  return {
    grid_columns: cols || (isAspect ? "auto" : "full"),
    grid_min_columns: minCols || 1,
    grid_min_rows: minRows || 2,
    grid_rows: rows || (isAspect ? "auto" : 8),
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
    if (this._initialized && this._hass) this._init(this._hass);
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this._initialized && hass && this._config) {
      this._initialized = true;
      this._init(hass);
    }
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
      this._showError("No URL, addon, or panel specified.");
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
    grid_columns: number | string;
    grid_rows: number | string;
    grid_min_columns: number;
    grid_min_rows: number;
  } {
    return resolveGridOptions(this._config);
  }
}

export {DynamicIngressCard, resolveGridOptions, setIngressCookie};
export type {AddonInfo, GridOptions, HomeAssistant, IngressCardConfig};
