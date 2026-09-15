import {defineConfig} from "oxfmt";

export default defineConfig({
  bracketSpacing: false,
  embeddedLanguageFormatting: "auto",
  ignorePatterns: ["ingress-card.js", "dist/**", "node_modules/**"],
  objectWrap: "collapse",
  printWidth: 80,
  sortImports: {
    groups: [
      ["type-import", "value-builtin", "value-external"],
      ["type-internal", "value-internal"],
      [
        "type-parent",
        "type-sibling",
        "type-index",
        "value-parent",
        "value-sibling",
        "value-index",
      ],
      "unknown",
    ],
    newlinesBetween: false,
  },
});
