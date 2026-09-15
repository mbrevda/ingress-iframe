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
    "Seamlessly embed Add-on Ingress interfaces or URLs in Lovelace with full mobile app support.",
  name: "Ingress Card",
  preview: true,
  type: "ingress-card",
});

export {DynamicIngressCard} from "#src/ingressCard.ts";
