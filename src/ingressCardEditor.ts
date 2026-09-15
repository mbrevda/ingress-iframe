import type {HomeAssistant, IngressCardConfig} from "#src/ingressCard.ts";

const SCHEMA = [
  {
    name: "url",
    required: true,
    selector: {text: {multiline: false, type: "text"}},
  },
  {name: "title", selector: {text: {}}},
  {name: "aspect_ratio", selector: {text: {}}},
  {name: "height", selector: {text: {}}},
  {
    name: "",
    schema: [
      {name: "allow", selector: {text: {}}},
      {name: "sandbox", selector: {text: {}}},
    ],
    title: "Advanced Permissions & Sandbox",
    type: "expandable",
  },
] as const;

function computeLabel(schema: {name: string}): string {
  switch (schema.name) {
    case "url":
      return "URL / Add-on / Panel Route";
    case "title":
      return "Title (Optional)";
    case "aspect_ratio":
      return "Aspect Ratio (e.g. 56.25%, 50%)";
    case "height":
      return "Height (e.g. calc(100dvh - 64px), 600px)";
    case "allow":
      return "Iframe Allow Permissions";
    case "sandbox":
      return "Iframe Sandbox Rules";
    default:
      return schema.name;
  }
}

function computeHelper(schema: {name: string}): string {
  switch (schema.name) {
    case "url":
      return "Add-on slug (e.g. 5c53de3b_esphome), sidebar path (/esphome), URL, or Jinja template";
    case "aspect_ratio":
      return "Responsive aspect ratio (e.g. 56.25% for 16:9). Overrides height when set.";
    case "height":
      return "CSS height used when aspect ratio is not specified.";
    case "allow":
      return "Leave blank for default media & fullscreen permissions.";
    case "sandbox":
      return "Leave blank for standard secure sandbox defaults.";
    default:
      return "";
  }
}

type HaFormElement = HTMLElement & {
  hass?: HomeAssistant;
  data?: Record<string, unknown>;
  schema?: typeof SCHEMA;
  computeLabel?: (schema: {name: string}) => string;
  computeHelper?: (schema: {name: string}) => string;
};

const BaseElement =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

class IngressCardEditor extends BaseElement {
  private _config?: IngressCardConfig;
  private _hass?: HomeAssistant;
  private _formElement: HaFormElement | null = null;

  public constructor() {
    super();
    if (typeof this.attachShadow === "function") {
      this.attachShadow({mode: "open"});
    }
  }

  public setConfig(config: IngressCardConfig): void {
    if (!config) {
      throw new Error("Invalid configuration for ingress-card-editor");
    }
    this._config = {...config};
    if (this._formElement) {
      this._formElement.data = this._config;
    } else {
      this._render();
    }
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._formElement) this._formElement.hass = hass;
  }

  public connectedCallback(): void {
    if (!this.shadowRoot && typeof this.attachShadow === "function") {
      this.attachShadow({mode: "open"});
    }
    this._render();
  }

  private _render(): void {
    if (!this.shadowRoot || !this._config) return;

    if (this._formElement) {
      this._formElement.hass = this._hass;
      this._formElement.data = this._config;
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
      </style>
    `;

    const form = document.createElement("ha-form") as HaFormElement;
    form.hass = this._hass;
    form.data = this._config;
    form.schema = SCHEMA;
    form.computeLabel = computeLabel;
    form.computeHelper = computeHelper;

    form.addEventListener("value-changed", (ev: Event) => {
      const customEv = ev as CustomEvent<{value: Record<string, unknown>}>;
      const detailValue = customEv.detail?.value;
      if (!detailValue || !this._config) return;

      const updatedConfig: IngressCardConfig = {
        ...this._config,
        ...detailValue,
        type: this._config.type ?? "custom:ingress-card",
      };

      const cleanConfig: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(updatedConfig)) {
        if (val !== "" && val !== undefined) cleanConfig[key] = val;
      }

      this._config = cleanConfig as IngressCardConfig;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          bubbles: true,
          composed: true,
          detail: {config: this._config},
        }),
      );
    });

    this._formElement = form;
    this.shadowRoot.appendChild(form);
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("ingress-card-editor")
) {
  customElements.define("ingress-card-editor", IngressCardEditor);
}

export {IngressCardEditor};
