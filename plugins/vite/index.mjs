import { transform } from "hellajs-compiler";

/** Source language for the engine, derived from the file extension. */
const langOf = (id) =>
  id.endsWith(".tsx") ? "tsx" : id.endsWith(".ts") ? "ts" : id.endsWith(".jsx") ? "jsx" : "js";

/**
 * Vite wrapper around hellajs-compiler. `{ target }` is forwarded to the engine
 * per build environment: an explicit `target` option wins verbatim; otherwise
 * SSR/server builds emit `"ast"` (byte-identical HellaNode, `@hellajs/ssr`'s currency)
 * and client builds emit `"dom"` (imperative `@hellajs/dom/runtime` construction — the
 * default); unknown options throw at plugin construction via the engine's validation.
 * @param {import("./index.d.ts").ViteHellaJSOptions} [options] `{ target }` — forwarded to the engine unless resolved per environment
 * @returns {import("./index.d.ts").VitePlugin} Vite plugin object
 */
export default function viteHellaJS(options) {
  const pluginOptions = options || {};
  // Eager construction validates { target } at wrapper construction — the engine
  // would otherwise first reach the validation at the initial transform. The probe
  // throws before the JSX sniff, so an empty input only exercises the validation.
  transform("", { filename: "hellajs-validate.js", target: pluginOptions.target ?? "dom" });
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

      const result = transform(code, { filename: id, lang: langOf(id), target });
      if (result) return { code: result.code, map: result.map };
      // JSX-free file: Vite's native esbuild pass strips TS instead (the cheap-skip win).
      return null;
    },
  };
}
