import type {HassPanelInfo} from "#src/types.ts";

function isTemplate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.includes("{{") || value.includes("{%");
}

function cleanTarget(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/**
 * Extracts the addon slug if the target refers to an addon or panel.
 *
 * Targets can be:
 * - Direct addon slug: "d5369777_music_assistant", "a0d7b954_nodered", "core_configurator"
 * - Panel route: "/d5369777_music_assistant", "d5369777_music_assistant"
 * - Panel route with subpath: "/d5369777_music_assistant/settings"
 */
function extractAddonSlug(
  target: string,
  panels?: Record<string, HassPanelInfo>,
): {addonSlug: string; subpath: string} | null {
  const normalized = target.replace(/^\/+/, "");
  const [firstPart, ...rest] = normalized.split("/");
  const subpath = rest.length > 0 ? `/${rest.join("/")}` : "";

  // 1. Direct addon slug pattern (e.g. d5369777_music_assistant or core_mosquitto)
  const isDirectSlug = /^[a-f0-9]+_[a-zA-Z0-9_-]+$/.test(firstPart);
  if (isDirectSlug) return {addonSlug: firstPart, subpath};

  // 2. Look up in registered HA panels
  if (panels && panels[firstPart]) {
    const panel = panels[firstPart];
    const configuredAddon = panel?.config?.addon;
    if (typeof configuredAddon === "string" && configuredAddon.length > 0) {
      return {addonSlug: configuredAddon, subpath};
    }
  }

  return null;
}

export {cleanTarget, extractAddonSlug, isTemplate};
