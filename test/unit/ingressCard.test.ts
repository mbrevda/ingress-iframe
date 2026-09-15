import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {DynamicIngressCard, setIngressCookie} from "#src/ingressCard.ts";

void describe("DynamicIngressCard", () => {
  void it("handles setIngressCookie safely in node environment", () => {
    assert.doesNotThrow(() => {
      setIngressCookie("test_session_token");
    });
  });

  void it("exports a valid Custom Element class", () => {
    assert.equal(typeof DynamicIngressCard, "function");
    assert.equal(typeof DynamicIngressCard.prototype.setConfig, "function");
    assert.equal(typeof DynamicIngressCard.prototype.getCardSize, "function");
    assert.equal(
      typeof DynamicIngressCard.prototype.getLayoutOptions,
      "function",
    );
  });

  void it("calculates dynamic card size matching official HA iframe card", () => {
    const card = new DynamicIngressCard();
    card.setConfig({type: "custom:ingress-card", url: "/esphome"});
    assert.equal(card.getCardSize(), 4);

    card.setConfig({
      aspect_ratio: "50%",
      type: "custom:ingress-card",
      url: "/esphome",
    });
    // 1 + ceil(50/15) = 5
    assert.equal(card.getCardSize(), 5);

    card.setConfig({
      aspect_ratio: "16:9",
      title: "My Addon",
      type: "custom:ingress-card",
      url: "/esphome",
    });
    // 16:9 -> 56.25% -> 1 + ceil(56.25/15) + 1 = 6
    assert.equal(card.getCardSize(), 6);

    card.setConfig({
      height: "500px",
      type: "custom:ingress-card",
      url: "/esphome",
    });
    // ceil(500 / 50) = 10
    assert.equal(card.getCardSize(), 10);
  });

  void it("returns layout options for Lovelace sections view", () => {
    const card = new DynamicIngressCard();
    card.setConfig({type: "custom:ingress-card", url: "/esphome"});
    assert.deepEqual(card.getLayoutOptions(), {
      grid_columns: "full",
      grid_min_columns: 1,
      grid_min_rows: 2,
      grid_rows: 8,
    });

    card.setConfig({
      aspect_ratio: "16:9",
      type: "custom:ingress-card",
      url: "/esphome",
    });
    assert.deepEqual(card.getLayoutOptions(), {
      grid_columns: "auto",
      grid_min_columns: 1,
      grid_min_rows: 2,
      grid_rows: "auto",
    });

    card.setConfig({
      grid_options: {columns: 3, rows: 5},
      type: "custom:ingress-card",
      url: "/esphome",
    });
    assert.deepEqual(card.getLayoutOptions(), {
      grid_columns: 3,
      grid_min_columns: 1,
      grid_min_rows: 2,
      grid_rows: 5,
    });
  });

  void it("validates empty configuration", () => {
    const card = new DynamicIngressCard();
    assert.throws(() => {
      // @ts-expect-error test invalid input
      card.setConfig(null);
    }, /Invalid configuration/);
  });
});
