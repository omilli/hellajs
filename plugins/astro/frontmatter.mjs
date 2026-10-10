import { createHash } from "node:crypto";
import { extractFrontmatter } from "./evaluate.mjs";

const VIRTUAL_PREFIX = "virtual:hella-frontmatter/";
const RESOLVED_PREFIX = `\0${VIRTUAL_PREFIX}`;

/**
 * Escapes collected island CSS for embedding inside the compiled template
 * literal: backslash, backtick, and `${` are template-literal escapes the
 * runtime unescapes verbatim; `</` becomes `<\\/` so the evaluated text
 * carries `<\/` — never a `</style` end tag for the HTML tokenizer, and a
 * valid CSS string escape (`\/` → `/`) inside content values.
 * @param {string} text Collected island CSS
 * @returns {string} Template-literal-safe CSS text
 */
function escapeIslandCss(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${")
    .replace(/<\//g, "<\\\\/");
}

/**
 * Locates where the island style tag enters the compiled template: inside
 * the first `$$render` quasi (anchor `return $$render\``, falling back to
 * the first `$$render\``), after the `<head…>` open tag when present, else
 * after `<body…>`, else at the quasi start. Returns -1 when the module
 * carries no template (the island CSS then merges into the virtual import).
 * @param {string} code Compiled `.astro` module source
 * @returns {number} Insertion offset into `code`, or -1 without an anchor
 */
function findIslandAnchor(code) {
  let anchor = code.indexOf("return $$render`");
  if (anchor === -1) anchor = code.indexOf("$$render`");
  if (anchor === -1) return -1;
  const quasiStart = code.indexOf("`", anchor) + 1;
  let i = quasiStart;
  while (i < code.length) {
    const ch = code[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "`" || (ch === "$" && code[i + 1] === "{")) break;
    i++;
  }
  const quasi = code.slice(quasiStart, i);
  const head = /<head(?=[\s>])[^>]*>/.exec(quasi);
  if (head) return quasiStart + head.index + head[0].length;
  const body = /<body(?=[\s>])[^>]*>/.exec(quasi);
  if (body) return quasiStart + body.index + body[0].length;
  return quasiStart;
}

/**
 * Vite plugin extracting statically foldable `css()`/`style()`/`keyframes()`
 * calls from compiled `.astro` modules (`enforce: "post"` — the transform
 * sees the compiler's output, frontmatter inside the `$$createComponent`
 * arrow). Creator calls fold at build against the real `@hellajs/css`
 * package; collected main-module CSS is delivered through Astro's own
 * pipeline via a virtual CSS import injected at the module top, while
 * collected island-module CSS rides an adoptable `<style id="hella-css">`
 * spliced into the page template (merged into the virtual import when the
 * module has no template). Modules importing and referencing `cssText` keep
 * byte-identical behavior (manual-management opt-out).
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
      const { pageCss, islandCss, replacements, watchFiles } = batch;
      // Island rules ride the adoptable `hella-css` tag — hydration claims
      // its delivered rules against the islands' re-registrations, so the
      // rules never duplicate. No template anchor → status-quo single-batch
      // delivery (duplicate-but-styled degradation for degenerate compiled
      // shapes).
      let virtualCss = pageCss;
      if (islandCss) {
        const anchor = findIslandAnchor(code);
        if (anchor === -1) virtualCss = pageCss + islandCss;
        else {
          replacements.push({
            start: anchor,
            end: anchor,
            text: `<style id="hella-css">${escapeIslandCss(islandCss)}</style>`,
          });
        }
      }
      // Splice right to left so earlier edits never shift later offsets.
      // Ranges are non-overlapping: nested creator calls are evicted when
      // their enclosing call records its own replacement, and the style tag
      // sits in a quasi literal while creator calls sit in statements or
      // `${…}` expressions.
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
      const hash = createHash("sha256").update(virtualCss).digest("hex").slice(0, 12);
      const source = `${VIRTUAL_PREFIX}${sanitized}-${hash}.css`;
      batches.set(source, virtualCss);
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
