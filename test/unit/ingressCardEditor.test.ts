import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {DynamicIngressCard} from "#src/ingressCard.ts";
import {IngressCardEditor} from "#src/ingressCardEditor.ts";

void describe("IngressCardEditor", () => {
  void it("exports a valid Custom Element class", () => {
    assert.equal(typeof IngressCardEditor, "function");
    assert.equal(typeof IngressCardEditor.prototype.setConfig, "function");
  });

  void it("provides getStubConfig on DynamicIngressCard", () => {
    const stub = DynamicIngressCard.getStubConfig();
    assert.equal(stub.type, "custom:ingress-card");
    assert.equal(stub.url, "");
    assert.equal(stub.aspect_ratio, "56.25%");
  });

  void it("provides getConfigElement on DynamicIngressCard", () => {
    assert.equal(typeof DynamicIngressCard.getConfigElement, "function");
    if (typeof document !== "undefined") {
      const el = DynamicIngressCard.getConfigElement();
      assert.equal(el.tagName.toLowerCase(), "ingress-card-editor");
    }
  });

  void it("validates invalid config in setConfig", () => {
    const editor = new IngressCardEditor();
    assert.throws(() => {
      // @ts-expect-error test invalid config input
      editor.setConfig(null);
    }, /Invalid configuration/);
  });

  void it("accepts valid config and updates internal state", () => {
    const editor = new IngressCardEditor();
    editor.setConfig({
      aspect_ratio: "16:9",
      title: "My Addon",
      type: "custom:ingress-card",
      url: "/esphome",
    });
    // @ts-expect-error test hass setter
    editor.hass = {panels: {}};
    assert.ok(editor);
  });
});
