import {
  type HassPanelInfo,
  cleanTarget,
  extractAddonSlug,
  isTemplate,
} from "#src/urlResolver.ts";

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
};

type AddonInfo = {
  ingress_url?: string;
  ingress_entry?: string;
  version?: string;
  state?: string;
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

export class DynamicIngressCard extends BaseElement {
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

  private async _refreshIngressSession(): Promise<void> {
    if (!this._hass) return;
    try {
      await this._hass.callWS({
        endpoint: "/ingress/session",
        method: "post",
        type: "supervisor/api",
      });
    } catch {
      // Background session refresh failure is non-fatal; iframe will retry on reload
    }
  }

  private async _resolveAndLoad(
    target: string,
    hass: HomeAssistant,
  ): Promise<void> {
    if (!target) {
      this._showError("No URL, addon, or panel specified.");
      return;
    }

    const addonMatch = extractAddonSlug(target, hass.panels);
    let resolvedUrl = target;

    if (addonMatch) {
      try {
        await this._refreshIngressSession();

        const info = await hass.callWS<AddonInfo>({
          endpoint: `/addons/${addonMatch.addonSlug}/info`,
          method: "get",
          type: "supervisor/api",
        });

        if (!info?.ingress_url) {
          this._showError(
            `No Ingress endpoint available for addon '${addonMatch.addonSlug}'. Ensure the addon is started.`,
          );
          return;
        }

        const baseIngress = info.ingress_url.replace(/\/+$/, "");
        resolvedUrl = `${baseIngress}${addonMatch.subpath}`;
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
    const aspectRatio = this._config?.aspect_ratio;
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
    const aspectRatio = this._config?.aspect_ratio;
    const title = this._config?.title;
    if (aspectRatio) {
      const match = /^(\d+)%?$/.exec(aspectRatio.trim());
      const percent = match ? Number(match[1]) : 50;
      return 1 + Math.ceil(percent / 15) + (title ? 1 : 0);
    }
    return (this._config?.height ? 10 : 4) + (title ? 1 : 0);
  }

  public getLayoutOptions(): {grid_columns: string; grid_rows: string} {
    return {
      grid_columns: this._config?.aspect_ratio ? "auto" : "full",
      grid_rows: "auto",
    };
  }
}

export type {AddonInfo, HomeAssistant, IngressCardConfig};
