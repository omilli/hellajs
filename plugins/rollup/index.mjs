import babelHellaJS from "babel-plugin-hellajs";
import { transformSync } from "@babel/core";
import presetTypeScript from "@babel/preset-typescript";
import { readFileSync } from "fs";

/**
 * Rollup wrapper around babel-plugin-hellajs. `{ target }` is forwarded to the
 * babel plugin ("dom" default — imperative `@hellajs/dom/runtime` construction;
 * rollup is a client-bundle tool; pass `"ast"` explicitly for a server target);
 * unknown options throw at plugin construction via the babel plugin's validation.
 * @param {import("./index.d.ts").RollupHellaJSOptions} [options] `{ target }` — forwarded to `babelHellaJS`
 * @returns {import("./index.d.ts").RollupPlugin} Rollup plugin object
 */
export default function rollupHellaJS(options) {
  const pluginOptions = options || {};
  const target = pluginOptions.target ?? "dom";
  // Eager construction validates { target } at wrapper construction — babel would
  // otherwise first reach the validation at the initial transform. The plugin API's
  // first positional argument (babel's core module) is unused by the validation.
  babelHellaJS(undefined, pluginOptions);
  return {
    name: "rollup-plugin-hellajs",
    enforce: "pre",
    resolveId(source, importer) {
      if (source.endsWith(".jsx") || source.endsWith(".tsx")) {
        return this.resolve(source, importer, { skipSelf: true }).then((res) => res && res.id);
      }
      return null;
    },
    load(id) {
      if (id.endsWith(".jsx") || id.endsWith(".tsx")) {
        const code = readFileSync(id, "utf8");
        const result = transformSync(code, {
          plugins: [[babelHellaJS, { ...pluginOptions, target }]],
          presets: [presetTypeScript],
          filename: id,
          ast: false,
          sourceMaps: true,
          configFile: false,
          babelrc: false,
          parserOpts: { plugins: ["jsx"] },
        });
        return { code: result.code, map: result.map };
      }
      return null;
    },
    transform(code, id) {
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
