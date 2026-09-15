# Ingress Card for Home Assistant

A Lovelace card for Home Assistant that embeds Add-on Ingress interfaces (Music Assistant, ESPHome, Node-RED, Zigbee2MQTT, etc.) directly inside your dashboard views without losing your top header, tabs, or navigation bar.

Works reliably in desktop browsers, mobile browsers, and the **Home Assistant Android and iOS Companion Apps**.

---

## Why this exists

If you've ever tried using the standard Lovelace `iframe` / `webpage` card to embed an add-on panel like `/d5369777_music_assistant`, you've likely noticed:

1. **It works on Desktop Chrome** because desktop web sessions share `localStorage` credentials across same-origin frames.
2. **It hangs forever on the mobile Companion App** because the mobile app authenticates using a native Android/iOS bridge (`window.externalAuth`) injected only into the root window. Sandboxed iframes don't inherit this bridge, so nested Home Assistant instances cannot log in.

**Ingress Card** solves this by establishing the Supervisor Ingress session through Home Assistant's authenticated WebSocket connection and pointing the iframe directly at the add-on's raw Ingress stream.

---

## Features

- **Mobile Companion App Support**: Full compatibility with Android & iOS companion apps.
- **Header & Menu Preservation**: Keeps your Lovelace tabs, dashboard headers, and sidebar visible.
- **Smart URL & Addon Resolution**: Automatically recognizes addon slugs (`d5369777_music_assistant`), panel routes (`/d5369777_music_assistant`), subpaths (`/d5369777_music_assistant/settings`), or external URLs.
- **Live Jinja Templating**: Change embedded panels or URLs dynamically via templates (e.g. `{{ states('input_text.active_dashboard') }}`).
- **Session Keep-Alive**: Background heartbeat prevents Ingress session timeouts on wall tablets and long-lived dashboards.
- **Flexible Sizing**: Fullscreen panel view, custom heights, or aspect ratio scaling for grid/masonry cards.

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

## Configuration

### Example 1: Fullscreen Dashboard View (Panel Mode)

To display Music Assistant (or any addon) full-screen while keeping your dashboard top tabs:

```yaml
title: Music
path: music
icon: mdi:music-assistant
type: panel
cards:
  - type: custom:ingress-card
    url: /d5369777_music_assistant
```

### Example 2: Dynamic / Templated URL

Switch the displayed addon dynamically based on an input boolean or helper:

```yaml
type: custom:ingress-card
url: "{{ 'd5369777_music_assistant' if is_state('input_boolean.show_music', 'on') else '5c53de3b_esphome' }}"
```

### Example 3: Grid / Masonry Card with Aspect Ratio

Embed an add-on inside a standard dashboard column alongside other cards:

```yaml
type: custom:ingress-card
url: /5c53de3b_esphome
aspect_ratio: 56.25% # 16:9
```

---

## Configuration Reference

| Option                    | Type     | Default                                                                                                    | Description                                                                                                      |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `url` / `addon` / `panel` | `string` | **Required**                                                                                               | Addon slug (e.g. `d5369777_music_assistant`), panel route (`/d5369777_music_assistant`), Jinja template, or URL. |
| `height`                  | `string` | `calc(100dvh - var(--header-height, 64px))`                                                                | Custom CSS height (ignored if `aspect_ratio` is set).                                                            |
| `aspect_ratio`            | `string` | `undefined`                                                                                                | Responsive aspect ratio (e.g. `56.25%` for 16:9, `100%` for 1:1).                                                |
| `allow`                   | `string` | `fullscreen; autoplay; clipboard-write; microphone; camera`                                                | Iframe `allow` feature policy attribute.                                                                         |
| `sandbox`                 | `string` | `allow-forms allow-modals allow-popups allow-pointer-lock allow-same-origin allow-scripts allow-downloads` | Iframe `sandbox` attribute.                                                                                      |

---

## License

MIT © Moshe Brevda
