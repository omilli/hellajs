import { transform } from "hellajs-compiler";
import { readFileSync } from "fs";

/** Source language for the engine, derived from the file extension. */
const langOf = (id) =>
  id.endsWith(".tsx") ? "tsx" : id.endsWith(".ts") ? "ts" : id.endsWith(".jsx") ? "jsx" : "js";

/**
 * Rollup wrapper around hellajs-compiler. `{ target }` is forwarded to the
 * engine ("dom" default — imperative `@hellajs/dom/runtime` construction;
 * rollup is a client-bundle tool; pass `"ast"` explicitly for a server target);
 * unknown options throw at plugin construction via the engine's validation.
 * @param {import("./index.d.ts").RollupHellaJSOptions} [options] `{ target }` — forwarded to the engine
 * @returns {import("./index.d.ts").RollupPlugin} Rollup plugin object
 */
export default function rollupHellaJS(options) {
  const pluginOptions = options || {};
  const target = pluginOptions.target ?? "dom";
  // Eager construction validates { target } at wrapper construction — the engine
  // would otherwise first reach the validation at the initial transform. The probe
  // throws before the JSX sniff, so an empty input only exercises the validation.
  transform("", { filename: "hellajs-validate.js", target });
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
        const result = transform(code, { filename: id, lang: langOf(id), target });
        if (result) return { code: result.code, map: result.map };
        return null;
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

      const result = transform(code, { filename: id, lang: langOf(id), target });
      if (result) return { code: result.code, map: result.map };
      // JSX-free file: Rollup's native pass handles it instead (the cheap-skip win).
      return null;
    },
  };
}
