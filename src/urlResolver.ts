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
 * - Direct addon slug: "a0d7b954_nodered", "core_ssh", "5c53de3b_esphome"
 * - Panel route: "/nodered", "/esphome", "/d5369777_music_assistant"
 * - Panel route with subpath: "/nodered/ui", "/esphome/devices"
 */
function extractAddonSlug(
  target: string,
  panels?: Record<string, HassPanelInfo>,
): {addonSlug: string; subpath: string} | null {
  if (/^https?:\/\//i.test(target) || target.startsWith("//")) return null;

  const normalized = target.replace(/^\/+/, "");
  const [firstPart, ...rest] = normalized.split("/");
  const subpath = rest.length > 0 ? `/${rest.join("/")}` : "";

  // 1. Look up in registered HA panels (e.g. sidebar panels with configured addon)
  if (panels && panels[firstPart]) {
    const panel = panels[firstPart];
    const configuredAddon = panel?.config?.addon;
    if (typeof configuredAddon === "string" && configuredAddon.length > 0) {
      return {addonSlug: configuredAddon, subpath};
    }
  }

  // 2. Direct addon slug pattern (e.g. core_ssh, a0d7b954_nodered, 5c53de3b_esphome)
  const isDirectSlug = /^[a-zA-Z0-9]+_[a-zA-Z0-9_-]+$/.test(firstPart);
  if (isDirectSlug) return {addonSlug: firstPart, subpath};

  return null;
}

export {cleanTarget, extractAddonSlug, isTemplate};
