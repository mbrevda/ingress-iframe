# Ingress Card for Home Assistant

A drop-in replacement for the official Home Assistant **Webpage / Iframe** card that adds native **Supervisor Ingress** support and companion app compatibility.

Embed any add-on interface (Node-RED, ESPHome, Zigbee2MQTT, Grafana, Music Assistant, etc.) or external website directly inside your Lovelace dashboards while keeping your top header, tabs, and menu bar intact.

---

## Why this exists

The official Home Assistant `iframe` / `webpage` card works for standard external websites, but when pointing to Home Assistant add-on panel routes (e.g. `/a0d7b954_nodered` or `/d5369777_music_assistant`):

1. **It works on Desktop Chrome** because desktop web sessions share browser storage credentials across same-origin frames.
2. **It hangs forever on the mobile Companion App** because the mobile app authenticates through a native Android/iOS bridge (`window.externalAuth`) available only to the root window. Sandboxed iframes don't inherit this bridge, leaving nested Home Assistant sessions unauthenticated.

**Ingress Card** drops directly in place of the core `iframe` card. It detects add-on and panel routes, establishes an authenticated Ingress session via Home Assistant's WebSocket connection, and embeds the add-on's direct web stream.

---

## Drop-In Replacement

Ingress Card supports the exact same configuration schema as the official Webpage card:

```yaml
# Before (Standard Home Assistant Iframe Card)
type: iframe
url: /a0d7b954_nodered
aspect_ratio: 50%

# After (Drop-In Ingress Card)
type: custom:ingress-card
url: /a0d7b954_nodered
aspect_ratio: 50%
```

---

## Features

- **100% Drop-In Compatible**: Supports `url`, `title`, `aspect_ratio`, `allow`, and `sandbox` matching core Home Assistant behavior.
- **Mobile Companion App Support**: Works seamlessly on Android and iOS companion apps.
- **Header & Tab Preservation**: Keeps your Lovelace top navigation, tabs, and sidebar visible.
- **Universal Add-on Resolution**: Accepts direct add-on slugs (`a0d7b954_nodered`, `core_ssh`), sidebar panel routes (`/esphome`, `/zigbee2mqtt`), subpaths (`/esphome/devices`), or external URLs (`https://...`).
- **Live Jinja Templating**: Change embedded panels or URLs dynamically via templates (e.g. `{{ states('input_text.active_dashboard') }}`).
- **Session Keep-Alive**: Background heartbeat maintains Supervisor Ingress sessions for wall tablets and continuous displays.

---

## Installation

### Via HACS (Recommended)

1. Open **HACS** in your Home Assistant sidebar.
2. Go to **Frontend** → Three dots (top right) → **Custom repositories**.
3. Add `https://github.com/mbrevda/lovelace-ingress-card` (Category: **Lovelace** / **Dashboard**).
4. Search for **Ingress Card** and click **Download**.

### Manual Installation

1. Download `ingress-card.js` from the [latest release](https://github.com/mbrevda/lovelace-ingress-card/releases).
2. Copy `ingress-card.js` into your `/config/www/` folder.
3. In Home Assistant, go to **Settings → Dashboards → Resources** and add:
   - **URL:** `/local/ingress-card.js`
   - **Resource type:** `JavaScript Module`

---

## Configuration Examples

### Example 1: Fullscreen Dashboard View (Panel Mode)

To display an add-on full-screen while keeping your dashboard top tabs:

```yaml
title: ESPHome
path: esphome
icon: mdi:chip
type: panel
cards:
  - type: custom:ingress-card
    url: /5c53de3b_esphome
```

### Example 2: Dashboard Card with Title & Aspect Ratio

Embed an add-on inside a standard dashboard column alongside other cards:

```yaml
type: custom:ingress-card
title: Node-RED Flows
url: /a0d7b954_nodered
aspect_ratio: 56.25% # 16:9
```

### Example 3: Dynamic / Templated URL

Switch the displayed addon or web app dynamically based on an entity or input helper:

```yaml
type: custom:ingress-card
url: "{{ '5c53de3b_esphome' if is_state('input_boolean.show_esphome', 'on') else 'a0d7b954_nodered' }}"
```

---

## Configuration Reference

| Option                    | Type     | Default                                                                                                    | Description                                                                             |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `url` / `addon` / `panel` | `string` | **Required**                                                                                               | Addon slug (e.g. `5c53de3b_esphome`), panel route (`/esphome`), Jinja template, or URL. |
| `title`                   | `string` | `undefined`                                                                                                | Optional card header title.                                                             |
| `aspect_ratio`            | `string` | `undefined`                                                                                                | Responsive aspect ratio (e.g. `50%`, `56.25%`, `100%`).                                 |
| `height`                  | `string` | `calc(100dvh - var(--header-height, 64px))`                                                                | Custom CSS height (used when `aspect_ratio` is omitted).                                |
| `allow`                   | `string` | `fullscreen; autoplay; clipboard-write; microphone; camera`                                                | Iframe `allow` feature policy attribute.                                                |
| `sandbox`                 | `string` | `allow-forms allow-modals allow-popups allow-pointer-lock allow-same-origin allow-scripts allow-downloads` | Iframe `sandbox` attribute.                                                             |

---

## License

MIT © Moshe Brevda
