import {DynamicIngressCard} from "#src/ingressCard.ts";
import {IngressCardEditor} from "#src/ingressCardEditor.ts";

type CustomCardInfo = {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
};

type CustomGlobal = typeof globalThis & {customCards?: CustomCardInfo[]};

if (!globalThis.customElements.get("ingress-card")) {
  globalThis.customElements.define("ingress-card", DynamicIngressCard);
}

if (!globalThis.customElements.get("ingress-card-editor")) {
  globalThis.customElements.define("ingress-card-editor", IngressCardEditor);
}

const customGlobal = globalThis as CustomGlobal;
customGlobal.customCards ??= [];
customGlobal.customCards.push({
  description:
    "Drop-in replacement for the Home Assistant Webpage/Iframe card that seamlessly supports Add-on Ingress and companion apps.",
  documentationURL: "https://github.com/mbrevda/ingress-iframe",
  name: "Ingress Card",
  preview: true,
  type: "ingress-card",
});

export {DynamicIngressCard} from "#src/ingressCard.ts";
export {IngressCardEditor} from "#src/ingressCardEditor.ts";
export type {CustomCardInfo};
