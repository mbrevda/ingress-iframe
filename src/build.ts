import {build} from "esbuild";

async function run(): Promise<void> {
  const commonOptions = {
    bundle: true,
    entryPoints: ["src/index.ts"],
    format: "esm" as const,
    legalComments: "none" as const,
    minify: true,
    platform: "browser" as const,
    sourcemap: false,
    target: ["es2022"],
  };

  // Build root bundle for direct HACS serving
  await build({...commonOptions, outfile: "ingress-card.js"});

  // Build dist bundle
  await build({...commonOptions, outfile: "dist/ingress-card.js"});

  console.log(
    "Build complete: ingress-card.js and dist/ingress-card.js generated.",
  );
}

await run();
