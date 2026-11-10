import { build, context } from "esbuild";
import { transform } from "hellajs-compiler";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const hellajsJsx = (target) => ({
  name: "hellajs-jsx",
  setup(build) {
    build.onLoad({ filter: /\.tsx$/ }, async (args) => {
      if (args.path.includes("node_modules")) return undefined;
      const source = await readFile(args.path, "utf8");
      const result = transform(source, {
        filename: args.path,
        lang: "tsx",
        target: target ?? "ast",
      });
      if (!result) return undefined;
      return { contents: result.code, loader: "js" };
    });
  },
});

const client = {
  entryPoints: ["src/client.tsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: "dist/client.js",
  plugins: [hellajsJsx("dom")],
};

const server = {
  entryPoints: ["src/server.tsx"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: "dist/server.mjs",
  external: ["@hellajs/*", "hono", "@hono/node-server"],
  plugins: [hellajsJsx()],
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
  await build(client);
  await build(server);
}
