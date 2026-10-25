import babelHellaJS from "babel-plugin-hellajs";
import { transformSync } from "@babel/core";
import presetTypeScript from "@babel/preset-typescript";

/**
 * Vite wrapper around babel-plugin-hellajs. `{ target }` is forwarded to the babel
 * plugin per build environment: an explicit `target` option wins verbatim; otherwise
 * SSR/server builds emit `"ast"` (byte-identical HellaNode, `@hellajs/ssr`'s currency)
 * and client builds emit `"dom"` (imperative `@hellajs/dom/runtime` construction — the
 * default); unknown options throw at plugin construction via the babel plugin's
 * validation.
 * @param {import("./index.d.ts").ViteHellaJSOptions} [options] `{ target }` — forwarded to `babelHellaJS` unless resolved per environment
 * @returns {import("./index.d.ts").VitePlugin} Vite plugin object
 */
export default function viteHellaJS(options) {
  const pluginOptions = options || {};
  // Eager construction validates { target } at wrapper construction — babel would
  // otherwise first reach the validation at the initial transform. The plugin API's
  // first positional argument (babel's core module) is unused by the validation.
  babelHellaJS(undefined, pluginOptions);
  return {
    name: "vite-plugin-hellajs",
    enforce: "pre",
    async transform(code, id, transformOptions) {
      // Transform all JS/TS files for JSX
      if (
        !id.endsWith(".jsx") &&
        !id.endsWith(".tsx") &&
        !id.endsWith(".js") &&
        !id.endsWith(".ts")
      )
        return null;

      // Skip node_modules
      if (id.includes("node_modules")) return null;

      // Per-environment target: explicit option wins; server builds (the ssr flag, or a
      // Vite 6+ server-consumer environment) emit the AST the stringifier consumes. The
      // test runner's ssr:true is module-fetch transport, not a build target — tests run
      // in DOM environments and get the flipped client default — EXCEPT the ssr package's
      // own suite: its inline JSX is the server-currency fixture (the ast target's only
      // test consumer), so those files resolve ast under the runner too.
      const server =
        process.env.VITEST === undefined &&
        (transformOptions?.ssr === true || this.environment?.config?.consumer === "server");
      const ssrSuite = process.env.VITEST !== undefined && /[\\/]packages[\\/]ssr[\\/]/.test(id);
      const target = pluginOptions.target ?? (server || ssrSuite ? "ast" : "dom");

      const result = transformSync(code, {
        plugins: [[babelHellaJS, { ...pluginOptions, target }]],
        presets: id.endsWith(".tsx") || id.endsWith(".ts") ? [presetTypeScript] : [],
        filename: id,
        ast: false,
        sourceMaps: true,
        configFile: false,
        babelrc: false,
        parserOpts: { plugins: ["jsx"] },
      });
      if (typeof result?.code === "string") {
        return { code: result.code, map: result.map || null };
      }
      return null;
    },
  };
}
