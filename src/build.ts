import {build} from "esbuild";

async function run(): Promise<void> {
  await build({
    bundle: true,
    entryPoints: ["src/index.ts"],
    format: "esm",
    legalComments: "none",
    minify: true,
    outfile: "dist/ingress-card.js",
    platform: "browser",
    sourcemap: false,
    target: ["es2022"],
  });

  console.log("Build complete: dist/ingress-card.js generated.");
}

await run();
