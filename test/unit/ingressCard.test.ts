import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {DynamicIngressCard} from "#src/ingressCard.ts";

void describe("DynamicIngressCard", () => {
  void it("exports a valid Custom Element class", () => {
    assert.equal(typeof DynamicIngressCard, "function");
    assert.equal(typeof DynamicIngressCard.prototype.setConfig, "function");
    assert.equal(typeof DynamicIngressCard.prototype.getCardSize, "function");
    assert.equal(
      typeof DynamicIngressCard.prototype.getLayoutOptions,
      "function",
    );
  });

  void it("returns layout options for Lovelace sections view", () => {
    const card = new DynamicIngressCard();
    const layout = card.getLayoutOptions();
    assert.deepEqual(layout, {grid_columns: "full", grid_rows: "auto"});
  });

  void it("returns card size", () => {
    const card = new DynamicIngressCard();
    assert.equal(card.getCardSize(), 10);
  });

  void it("validates empty configuration", () => {
    const card = new DynamicIngressCard();
    assert.throws(() => {
      // @ts-expect-error test invalid input
      card.setConfig(null);
    }, /Invalid configuration/);
  });
});
