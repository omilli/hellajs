import { serializeProp, escapeHtml } from "./serialize";
import type { HeadOptions, MetaTag, LinkTag } from "../types";

/**
 * Builds the HTML attribute string for a tag's attribute map. Each entry runs through
 * `serializeProp`, so falsy values are omitted, `true` renders bare, and strings are quoted
 * and escaped — the same rules `ssr` applies to element attributes.
 * @param attrs The attribute map (a `MetaTag`, `LinkTag`, or `ScriptTag`).
 * @param skip A key (or keys) to exclude from the output — keeps a script's `content` (and `src`, when inline `content` is set) out of its attributes.
 * @returns The concatenated attribute string, each entry leading with a space (empty when none).
 */
function buildAttrs(attrs: Record<string, unknown>, skip?: string | string[]): string {
  const keys = Object.keys(attrs);
  let i = 0;
  const len = keys.length;
  let out = "";
  while (i < len) {
    const key = keys[i]!;
    i++;
    if (key === skip) continue;
    if (Array.isArray(skip) && skip.indexOf(key) !== -1) continue;
    out += serializeProp(key, attrs[key]);
  }
  return out;
}

/**
 * Renders a sequence of void tags (`<meta>` / `<link>`) — one per entry, in order, with no closing tag.
 * @param tag The element name (`"meta"` or `"link"`).
 * @param tags The attribute maps to render.
 * @returns The concatenated void tags.
 */
function renderVoidTags(tag: string, tags: ReadonlyArray<MetaTag | LinkTag>): string {
  let out = "";
  let i = 0;
  const len = tags.length;
  while (i < len) {
    out += `<${tag}${buildAttrs(tags[i]! as Record<string, unknown>)}>`;
    i++;
  }
  return out;
}

/**
 * @internal
 * Renders a document `<head>` from its options — the single head builder shared by `doc` (string
 * document) and `doc` (streamed document), so both assemblers emit identical head HTML.
 * Fields emit in declaration order: `title`, `meta`, `links`, `styles`, `scripts`, then `raw`.
 * `title` text and attribute values run through the same `serializeProp`/`escapeHtml` rules the
 * stringifiers apply to element attributes; `styles` and `raw` pass through unchanged (already HTML).
 * @param head The head options to render (`undefined` renders an empty head).
 * @returns The concatenated head HTML (no `<head>` wrapper).
 */
export function buildHead(head: HeadOptions | undefined): string {
  let headHtml = "";
  if (head !== undefined) {
    if (head.title !== undefined) {
      headHtml += `<title>${escapeHtml(head.title)}</title>`;
    }
    if (head.meta !== undefined) {
      headHtml += renderVoidTags("meta", head.meta);
    }
    if (head.links !== undefined) {
      headHtml += renderVoidTags("link", head.links);
    }
    if (head.styles !== undefined) {
      let css = "";
      let i = 0;
      const len = head.styles.length;
      while (i < len) {
        css += head.styles[i]!;
        i++;
      }
      headHtml += `<style>${css}</style>`;
    }
    if (head.scripts !== undefined) {
      let i = 0;
      const len = head.scripts.length;
      while (i < len) {
        const script = head.scripts[i]!;
        // inline content wins: drop `src` too — a `<script src=…>` ignores its body, so emitting both would silently suppress the inline script
        const scriptAttrs = buildAttrs(script, script.content !== undefined ? ["content", "src"] : "content");
        headHtml += script.content !== undefined
          ? `<script${scriptAttrs}>${script.content}</script>`
          : `<script${scriptAttrs}></script>`;
        i++;
      }
    }
    if (head.raw !== undefined) {
      headHtml += head.raw;
    }
  }
  return headHtml;
}
