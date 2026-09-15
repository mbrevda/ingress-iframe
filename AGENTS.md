# AGENTS.md

A Home Assistant Lovelace custom card plugin that embeds Supervisor Ingress add-ons and dynamic URLs seamlessly across desktop and mobile companion apps.

## Layout

- `src/index.ts` — Custom element registration (`customElements.define('ingress-card', ...)`) and `window.customCards` declaration.
- `src/ingressCard.ts` — Main `DynamicIngressCard` custom element managing lifecycle, Shadow DOM, Supervisor Ingress session negotiation, keep-alive heartbeat, and template subscriptions.
- `src/urlResolver.ts` — Pure helper functions for parsing URLs, detecting add-on slugs, extracting subpaths, and identifying Jinja templates.
- `src/build.ts` — esbuild bundling script generating `ingress-card.js` (root) and `dist/ingress-card.js`.
- `test/` — Unit tests executed via `node --test` with `node:assert/strict`.

## Conventions & Rules

- **Node runs TypeScript directly** for development and test execution via native type stripping.
- Imports use the `#src/*` and `#test/*` package aliases and **must include the `.ts` extension** (`allowImportingTsExtensions`).
- `verbatimModuleSyntax` is on. Type-only imports must be top-level `import type { ... }`.
- **Lint & Format is oxlint + oxfmt**. Run `npm run lint` or `npm run lint:fix`. Filenames use camelCase (`unicorn/filename-case`).
- **NEVER** disable lint rules or change linter configurations without explicit user direction.

## Commands

- **Build:** `npm run build`
- **Lint:** `npm run lint` (auto-fix with `npm run lint:fix`)
- **Test:** `npm test`
