import {DynamicIngressCard} from "#src/ingressCard.ts";
import type {CustomCardInfo} from "#src/types.ts";

type CustomGlobal = typeof globalThis & {customCards?: CustomCardInfo[]};

if (!globalThis.customElements.get("ingress-card")) {
  globalThis.customElements.define("ingress-card", DynamicIngressCard);
}

const customGlobal = globalThis as CustomGlobal;
customGlobal.customCards ??= [];
customGlobal.customCards.push({
  description:
    "Drop-in replacement for the Home Assistant Webpage/Iframe card that seamlessly supports Add-on Ingress and companion apps.",
  documentationURL: "https://github.com/mbrevda/lovelace-ingress-card",
  name: "Ingress Card",
  preview: true,
  type: "ingress-card",
});

export {DynamicIngressCard} from "#src/ingressCard.ts";
