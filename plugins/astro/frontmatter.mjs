import { createHash } from "node:crypto";
import { extractFrontmatter } from "./evaluate.mjs";

const VIRTUAL_PREFIX = "virtual:hella-frontmatter/";
const RESOLVED_PREFIX = `\0${VIRTUAL_PREFIX}`;

/**
 * Vite plugin extracting statically foldable `css()`/`style()`/`keyframes()`
 * calls from compiled `.astro` modules (`enforce: "post"` — the transform
 * sees the compiler's output, frontmatter inside the `$$createComponent`
 * arrow). Creator calls fold at build against the real `@hellajs/css`
 * package; the collected page CSS is delivered through Astro's own pipeline
 * via a virtual CSS import injected at the module top. Modules importing and
 * referencing `cssText` keep byte-identical behavior (manual-management
 * opt-out).
 * @param {object} [options] Injection seams for tests
 * @param {(specifier: string, importer: string) => string | null} [options.resolve] Module resolver overriding the default relative-path probe
 * @param {(id: string) => string} [options.load] Module source loader overriding the default file read
 * @returns Vite plugin object (`name: "hella-frontmatter"`, `enforce: "post"`, `transform`/`resolveId`/`load` hooks)
 * @throws {Error} When a page's frontmatter creator call has non-foldable arguments, or `vars()` appears in the page.
 */
export function frontmatterCss(options = {}) {
  const batches = new Map();
  const resolve = options.resolve;
  const load = options.load;
  return {
    name: "hella-frontmatter",
    enforce: "post",
    resolveId(source) {
      if (!source.startsWith(VIRTUAL_PREFIX)) return null;
      return `\0${source}`;
    },
    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return null;
      const css = batches.get(id.slice(1));
      return css === undefined ? null : css;
    },
    transform(code, id) {
      if (!id.endsWith(".astro") || id.includes("node_modules")) return null;
      const batch = extractFrontmatter({ code, id, resolve, load });
      if (!batch) return null;
      const { css, replacements, watchFiles } = batch;
      // Splice right to left so earlier edits never shift later offsets.
      // Ranges are non-overlapping: nested creator calls are evicted when
      // their enclosing call records its own replacement.
      const sorted = [...replacements].sort((a, b) => b.start - a.start);
      let out = code;
      let replacedStart = Number.MAX_SAFE_INTEGER;
      let i = 0;
      while (i < sorted.length) {
        const replacement = sorted[i++];
        if (replacement.end > replacedStart) continue;
        out = out.slice(0, replacement.start) + replacement.text + out.slice(replacement.end);
        replacedStart = replacement.start;
      }
      // Content hash in the virtual id busts vite's module cache in dev.
      const sanitized = id.replace(/[^a-zA-Z0-9-]/g, "-");
      const hash = createHash("sha256").update(css).digest("hex").slice(0, 12);
      const source = `${VIRTUAL_PREFIX}${sanitized}-${hash}.css`;
      batches.set(source, css);
      if (typeof this.addWatchFile === "function") {
        let w = 0;
        while (w < watchFiles.length) this.addWatchFile(watchFiles[w++]);
      }
      return {
        code: `import ${JSON.stringify(source)};\n${out}`,
        map: null,
      };
    },
  };
}
