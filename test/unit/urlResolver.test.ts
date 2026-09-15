import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {
  cleanTarget,
  extractAddonSlug,
  isTemplate,
  parseAspectRatio,
  stripOrigin,
} from "#src/urlResolver.ts";

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
      assert.equal(isTemplate("/a0d7b954_nodered"), false);
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

  void describe("parseAspectRatio", () => {
    void it("converts standard ratio notation to percentage", () => {
      assert.equal(parseAspectRatio("16:9"), "56.25%");
      assert.equal(parseAspectRatio("16 / 9"), "56.25%");
      assert.equal(parseAspectRatio("4:3"), "75%");
      assert.equal(parseAspectRatio("1:1"), "100%");
      assert.equal(parseAspectRatio("21:9"), "42.86%");
    });

    void it("preserves direct percentage notation", () => {
      assert.equal(parseAspectRatio("50%"), "50%");
      assert.equal(parseAspectRatio("56.25%"), "56.25%");
    });

    void it("handles null, empty, and non-ratio values gracefully", () => {
      assert.equal(parseAspectRatio(null), null);
      assert.equal(parseAspectRatio(""), null);
      assert.equal(parseAspectRatio("auto"), "auto");
    });
  });

  void describe("stripOrigin", () => {
    void it("leaves relative URLs intact", () => {
      assert.equal(stripOrigin("/a0d7b954_nodered"), "/a0d7b954_nodered");
      assert.equal(stripOrigin("core_ssh"), "core_ssh");
    });

    void it("leaves external URLs intact when location is not defined", () => {
      assert.equal(stripOrigin("https://google.com"), "https://google.com");
    });
  });

  void describe("extractAddonSlug", () => {
    void it("identifies direct addon slugs with hashes and core prefixes", () => {
      assert.deepEqual(extractAddonSlug("a0d7b954_nodered"), {
        addonSlug: "a0d7b954_nodered",
        subpath: "",
      });

      assert.deepEqual(extractAddonSlug("core_ssh"), {
        addonSlug: "core_ssh",
        subpath: "",
      });

      assert.deepEqual(extractAddonSlug("5c53de3b_esphome"), {
        addonSlug: "5c53de3b_esphome",
        subpath: "",
      });
    });

    void it("identifies direct addon slugs with leading slashes and subpaths", () => {
      const match = extractAddonSlug("/a0d7b954_nodered/ui/dashboard");
      assert.deepEqual(match, {
        addonSlug: "a0d7b954_nodered",
        subpath: "/ui/dashboard",
      });
    });

    void it("resolves panel names and titles from Home Assistant panels mapping", () => {
      const panels = {
        custom_music: {
          component_name: "hassio",
          title: "Music Assistant",
          url_path: "d5369777_music_assistant",
        },
        esphome: {config: {addon: "5c53de3b_esphome"}},
        nodered: {config: {addon: "a0d7b954_nodered"}},
        zigbee2mqtt: {config: {addon: "7be23e32_zigbee2mqtt"}},
      };

      assert.deepEqual(extractAddonSlug("/nodered", panels), {
        addonSlug: "a0d7b954_nodered",
        subpath: "",
      });

      assert.deepEqual(extractAddonSlug("/esphome/devices", panels), {
        addonSlug: "5c53de3b_esphome",
        subpath: "/devices",
      });

      assert.deepEqual(extractAddonSlug("/zigbee2mqtt/#/map", panels), {
        addonSlug: "7be23e32_zigbee2mqtt",
        subpath: "/#/map",
      });

      assert.deepEqual(extractAddonSlug("/custom_music", panels), {
        addonSlug: "d5369777_music_assistant",
        subpath: "",
      });

      assert.deepEqual(extractAddonSlug("/Music Assistant", panels), {
        addonSlug: "d5369777_music_assistant",
        subpath: "",
      });
    });

    void it("returns null for direct ingress paths (handled separately)", () => {
      assert.equal(
        extractAddonSlug("/api/hassio_ingress/abc123xyz_token/"),
        null,
      );
    });

    void it("returns null for external URLs and non-addon paths without panels", () => {
      assert.equal(extractAddonSlug("https://example.com"), null);
      assert.equal(extractAddonSlug("http://192.168.1.50:8080"), null);
      assert.equal(extractAddonSlug("//cdn.example.com/app"), null);
      assert.equal(extractAddonSlug("/lovelace/overview"), null);
    });
  });
});
