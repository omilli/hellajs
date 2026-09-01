import { serializeProp, escapeHtml } from "./serialize";
import { resolveValue, resolveAsync } from "./resolve";
import type { HeadOptions, MetaTag, LinkTag } from "../types";
import type { HellaNode } from "@hellajs/dom";

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

/**
 * @internal
 * Hoist pass for the sync walk — attempts to collect a head-eligible element (`<title>`/`<meta>`/
 * `<link>`/`<style>`) into the `{ head }` bag instead of emitting it. Props and children resolve via
 * `resolveValue` (current value — a Promise stringifies, as everywhere under the sync walk). Only text
 * children hoist for `<title>`/`<style>`; any other child (an element, raw HTML) leaves the tag
 * rendered in place. Missing bag arrays are created on first push, so a hand-written bag works too.
 * @param node The element the walk encountered.
 * @param head The collection bag (from `ssr.head()`).
 * @returns True when the node was hoisted (the walker omits it from the body); false when it stays in place.
 */
export function hoistHead(node: HellaNode, head: HeadOptions): boolean {
  // Parity invariant: `hoistHead` (sync) and `hoistHeadAsync` (async) classify and collect identically —
  // the pair mirrors `walkChild`/`walkChildGen`. Only the resolver differs (resolveValue vs awaited resolveAsync).
  const tag = node.tag as string;
  if (tag === "meta" || tag === "link") {
    const attrs: Record<string, string> = {};
    const props = node.props as Record<string, unknown> | undefined;
    if (props !== undefined) {
      const keys = Object.keys(props);
      let i = 0;
      const len = keys.length;
      while (i < len) {
        const key = keys[i]!;
        i++;
        const value = resolveValue(props[key]);
        if (value !== false && value !== null && value !== undefined) attrs[key] = `${value}`;   // falsy dropped — buildHead's buildAttrs omits these
      }
    }
    if (tag === "meta") (head.meta ??= []).push(attrs);
    else (head.links ??= []).push(attrs);
    return true;
  }
  if (tag !== "title" && tag !== "style") return false;
  let text = "";
  let isText = true;                     // every child resolves to text — otherwise the tag stays in place (only text hoists)
  const children = node.children;
  if (children !== undefined) {
    let i = 0;
    const len = children.length;
    while (i < len) {
      const resolved = resolveValue(children[i]!);
      i++;
      if (resolved === null || resolved === undefined || typeof resolved === "boolean") continue;
      if (typeof resolved === "string" || typeof resolved === "number") { text += resolved; continue; }
      isText = false;
      break;
    }
  }
  if (!isText) return false;
  if (tag === "title") head.title = text;        // last title wins
  else (head.styles ??= []).push(text);          // CSS text, raw — buildHead emits styles unescaped
  return true;
}

/**
 * @internal
 * Hoist pass for the shared async walker — the awaited pair of `hoistHead`: props and children resolve
 * via `resolveAsync` (a Promise value is awaited, then stringified). Collection rules are identical.
 * @param node The element the walk encountered.
 * @param head The collection bag (from `ssr.head()`).
 * @returns A Promise resolving true when the node was hoisted (the walker omits it from the body); false when it stays in place.
 */
export async function hoistHeadAsync(node: HellaNode, head: HeadOptions): Promise<boolean> {
  const tag = node.tag as string;
  if (tag === "meta" || tag === "link") {
    const attrs: Record<string, string> = {};
    const props = node.props as Record<string, unknown> | undefined;
    if (props !== undefined) {
      const keys = Object.keys(props);
      let i = 0;
      const len = keys.length;
      while (i < len) {
        const key = keys[i]!;
        i++;
        const value = await resolveAsync(props[key]);
        if (value !== false && value !== null && value !== undefined) attrs[key] = `${value}`;   // falsy dropped — buildHead's buildAttrs omits these
      }
    }
    if (tag === "meta") (head.meta ??= []).push(attrs);
    else (head.links ??= []).push(attrs);
    return true;
  }
  if (tag !== "title" && tag !== "style") return false;
  let text = "";
  let isText = true;                     // every child resolves to text — otherwise the tag stays in place (only text hoists)
  const children = node.children;
  if (children !== undefined) {
    let i = 0;
    const len = children.length;
    while (i < len) {
      const resolved = await resolveAsync(children[i]!);
      i++;
      if (resolved === null || resolved === undefined || typeof resolved === "boolean") continue;
      if (typeof resolved === "string" || typeof resolved === "number") { text += resolved; continue; }
      isText = false;
      break;
    }
  }
  if (!isText) return false;
  if (tag === "title") head.title = text;        // last title wins
  else (head.styles ??= []).push(text);          // CSS text, raw — buildHead emits styles unescaped
  return true;
}
