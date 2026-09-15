type HassPanelInfo = {
  component_name?: string;
  config?: {addon?: string; url?: string; [key: string]: unknown};
  icon?: string | null;
  title?: string | null;
  url_path?: string;
  [key: string]: unknown;
};

function isTemplate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.includes("{{") || value.includes("{%");
}

function cleanTarget(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function stripOrigin(target: string): string {
  if (typeof location !== "undefined" && target.startsWith(location.origin)) {
    return target.slice(location.origin.length);
  }
  try {
    if (/^https?:\/\//i.test(target)) {
      const parsed = new URL(target);
      if (typeof location !== "undefined" && parsed.host === location.host) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    }
  } catch {
    // Ignore URL parse error
  }
  return target;
}

function getPanelSlug(
  panel: HassPanelInfo | undefined,
  fallback: string,
): string | null {
  if (!panel) return null;
  const addon = panel.config?.addon;
  if (typeof addon === "string" && addon.length > 0) return addon;
  if (panel.component_name === "hassio") return panel.url_path ?? fallback;
  return null;
}

function findPanelAddon(
  firstPart: string,
  panels?: Record<string, HassPanelInfo>,
): string | null {
  if (!panels) return null;

  const directSlug = getPanelSlug(panels[firstPart], firstPart);
  if (directSlug) return directSlug;

  const query = firstPart.toLowerCase();
  for (const [key, panel] of Object.entries(panels)) {
    const keyMatch = key.toLowerCase() === query;
    const urlMatch = panel?.url_path?.toLowerCase() === query;
    const titleMatch = panel?.title?.toLowerCase() === query;

    if (keyMatch || urlMatch || titleMatch) {
      const slug = getPanelSlug(panel, key);
      if (slug) return slug;
    }
  }

  return null;
}

/**
 * Extracts the addon slug if the target refers to an addon or panel.
 *
 * Targets can be:
 * - Direct addon slug: "a0d7b954_nodered", "core_ssh", "5c53de3b_esphome"
 * - Panel route: "/nodered", "/esphome", "/d5369777_music_assistant"
 * - Panel route with subpath: "/nodered/ui", "/esphome/devices"
 * - Full Home Assistant origin URL: "http://homeassistant:8123/5c53de3b_esphome"
 */
function extractAddonSlug(
  target: string,
  panels?: Record<string, HassPanelInfo>,
): {addonSlug: string; subpath: string} | null {
  const localTarget = stripOrigin(target);

  if (/^https?:\/\//i.test(localTarget) || localTarget.startsWith("//")) {
    return null;
  }

  if (localTarget.startsWith("/api/hassio_ingress/")) return null;

  const normalized = localTarget.replace(/^\/+/, "");
  const [firstPart, ...rest] = normalized.split("/");
  if (!firstPart) return null;

  const subpath = rest.length > 0 ? `/${rest.join("/")}` : "";
  const panelAddon = findPanelAddon(firstPart, panels);
  if (panelAddon) return {addonSlug: panelAddon, subpath};

  if (/^[a-zA-Z0-9]+_[a-zA-Z0-9_-]+$/.test(firstPart)) {
    return {addonSlug: firstPart, subpath};
  }

  return null;
}

export {
  cleanTarget,
  extractAddonSlug,
  findPanelAddon,
  getPanelSlug,
  isTemplate,
  stripOrigin,
};
export type {HassPanelInfo};
