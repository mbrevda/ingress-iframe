import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {cleanTarget, extractAddonSlug, isTemplate} from "#src/urlResolver.ts";

void describe("urlResolver", () => {
  void describe("isTemplate", () => {
    void it("detects Jinja expression braces", () => {
      assert.equal(isTemplate("{{ states('sensor.test') }}"), true);
      assert.equal(isTemplate("prefix {{ val }} suffix"), true);
    });

    void it("detects Jinja statement braces", () => {
      assert.equal(isTemplate("{% if true %} addon {% endif %}"), true);
    });

    void it("returns false for non-templates", () => {
      assert.equal(isTemplate("/d5369777_music_assistant"), false);
      assert.equal(isTemplate("https://google.com"), false);
      assert.equal(isTemplate(null), false);
      assert.equal(isTemplate(undefined), false);
    });
  });

  void describe("cleanTarget", () => {
    void it("trims whitespace", () => {
      assert.equal(cleanTarget("  /test  "), "/test");
      assert.equal(cleanTarget(""), "");
      assert.equal(cleanTarget(null), "");
    });
  });

  void describe("extractAddonSlug", () => {
    void it("identifies direct addon slugs with hashes", () => {
      const match = extractAddonSlug("d5369777_music_assistant");
      assert.deepEqual(match, {
        addonSlug: "d5369777_music_assistant",
        subpath: "",
      });
    });

    void it("identifies direct addon slugs with leading slashes and subpaths", () => {
      const match = extractAddonSlug(
        "/d5369777_music_assistant/settings/audio",
      );
      assert.deepEqual(match, {
        addonSlug: "d5369777_music_assistant",
        subpath: "/settings/audio",
      });
    });

    void it("resolves panel names from Home Assistant panels mapping", () => {
      const panels = {
        esphome: {config: {addon: "5c53de3b_esphome"}},
        music: {config: {addon: "d5369777_music_assistant"}},
      };

      const match = extractAddonSlug("/music", panels);
      assert.deepEqual(match, {
        addonSlug: "d5369777_music_assistant",
        subpath: "",
      });

      const matchWithSubpath = extractAddonSlug("/esphome/devices", panels);
      assert.deepEqual(matchWithSubpath, {
        addonSlug: "5c53de3b_esphome",
        subpath: "/devices",
      });
    });

    void it("returns null for non-addon paths without matching panels", () => {
      const match = extractAddonSlug("/lovelace/overview");
      assert.equal(match, null);

      const matchUrl = extractAddonSlug("https://example.com");
      assert.equal(matchUrl, null);
    });
  });
});
