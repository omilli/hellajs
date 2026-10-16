// Build glue for JSX everywhere: the same babel-plugin-hellajs pass the test
// preload uses, applied to both entries. The client bundles for the browser;
// the server bundles for node (`platform: "node"`), keeping `@hellajs/*` and
// hono external so they resolve from node_modules at runtime. JSX cannot run
// under raw `node`, so the server entry is compiled here too — `npm run dev`
// watches both and restarts the built server on change.
//
// Usage: `node build.mjs` (one-shot) or `node build.mjs --watch`.
import { build, context } from "esbuild";
import { transformAsync } from "@babel/core";
import babelPluginHellajs from "babel-plugin-hellajs";
import presetTypeScript from "@babel/preset-typescript";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const hellajsJsx = {
  name: "hellajs-jsx",
  setup(build) {
    build.onLoad({ filter: /\.tsx$/ }, async (args) => {
      if (args.path.includes("node_modules")) return undefined;
      const source = await readFile(args.path, "utf8");
      const result = await transformAsync(source, {
        filename: args.path,
        plugins: [babelPluginHellajs],
        presets: [presetTypeScript],
        sourceType: "module",
        babelrc: false,
        configFile: false,
      });
      return { contents: result.code, loader: "js" };
    });
  },
};

const client = {
  entryPoints: ["src/client.tsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: "dist/client.js",
  plugins: [hellajsJsx],
};

const server = {
  entryPoints: ["src/server.tsx"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: "dist/server.mjs",
  external: ["@hellajs/*", "hono", "@hono/node-server"],
  plugins: [hellajsJsx],
};

const watch = process.argv.includes("--watch");

if (watch) {
  const clientCtx = await context(client);
  const serverCtx = await context(server);
  await clientCtx.rebuild();
  await serverCtx.rebuild();
  await clientCtx.watch();
  await serverCtx.watch();
  spawn("node", ["--watch", "dist/server.mjs"], { stdio: "inherit" });
} else {
  // `build()` tears esbuild's service down when done; `context()` would keep
  // the process alive for incremental rebuilds.
  await build(client);
  await build(server);
}
