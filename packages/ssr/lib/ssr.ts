import type { HellaNode, HellaChild, SsrMeta } from "@hellajs/dom";

/** HTML void elements — emitted as `<tag ...>` with no closing tag (the DOM has no child nodes for these). */
const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/** SSR region-boundary markers (Vue-style). The HTML parser turns these into Comment nodes (nodeValue `[` / `]`) that `hydrate` locates to bind dynamic regions without structural inference. */
const MARK_OPEN = "<!--[-->";
const MARK_CLOSE = "<!--]-->";

/** Structural shape of an isDynamic component function (avoids importing the runtime `RenderFn`). */
interface DynamicFn {
  isDynamic?: true;
  ssr?: SsrMeta;
}

/** Resolves a value by calling it if it is a function (signal/getter). */
function resolveValue(value: unknown): unknown {
  return typeof value === "function" ? (value as () => unknown)() : value;
}

/** Escapes the HTML-significant characters for text or a double-quoted attribute (`& < > "`). */
function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Serializes a property/attribute to its HTML string form, mirroring dom's `renderProp` rules.
 *
 * `renderProp`'s DIRECT_PROPS special-case (value/checked/selected/innerHTML → set the DOM IDL
 * property) is intentionally NOT mirrored — emitting `checked=""` would mean CHECKED in HTML.
 */
function serializeProp(key: string, value: unknown): string {
  const isFalsy = value === false || value === null || value === undefined;
  if (isFalsy) return "";                          // omit (renderProp removeAttribute equivalent)
  if (value === true) return ` ${key}`;            // boolean attribute (renderProp setAttribute(key,"") equivalent)
  if (Array.isArray(value)) {                      // class lists — renderProp joins filtering falsy
    const joined = value.filter(Boolean).join(" ");
    return joined ? ` ${key}="${escapeText(joined)}"` : "";
  }
  return ` ${key}="${escapeText(`${value}`)}"`;    // generic value (covers value/innerHTML strings)
}

/** Renders an isDynamic component's content from its `ssr` descriptor — shared by the direct-isDynamic-child and reactive-resolved-isDynamic dispatch paths. */
function renderDynamic(meta: SsrMeta): string {
  const props = meta.props as Record<string, unknown>;
  switch (meta.kind) {
    case "forEach": {
      const arr = (resolveValue(props.each) as unknown[]) ?? [];
      const use = props.use as (item: unknown, index: number) => HellaChild;
      let out = "";
      let i = 0;
      const len = arr.length;
      while (i < len) {
        out += walkChild(use(arr[i]!, i));
        i++;
      }
      return out;
    }
    case "transition":
      return resolveValue(props.show) ? walkChild(props.children as HellaChild) : "";
    case "portal":
      return "";
    case "lazy":
      return props.loading !== undefined ? walkChild(props.loading as HellaChild) : "";
    default:
      return "";                       // unknown kind — render nothing, never call the RenderFn
  }
}

/**
 * Walks a single child into HTML. Static template text is raw; resolved interpolation is escaped
 * (mirrors dom's `toText`); isDynamic components dispatch on their `ssr` descriptor. Every dynamic
 * region (reactive child, isDynamic component, nested fragment) is wrapped in `MARK_OPEN`…`MARK_CLOSE`
 * so `hydrate` locates it by Comment nodes instead of structural inference. Static elements/text are
 * unwrapped (element-bounded, consumed by position).
 */
function walkChild(child: HellaChild): string {
  if (child === null || child === undefined || child === false) return "";
  if (typeof child === "string") return child;                       // static template text — raw
  if (typeof child === "number") return escapeText(`${child}`);
  if (typeof child === "function") {
    let body: string;
    if ((child as DynamicFn).isDynamic) {
      const meta = (child as DynamicFn).ssr;
      if (!meta) return "";                       // user-authored isDynamic fn — no region
      body = renderDynamic(meta);
    } else {
      const resolved = resolveValue(child);                            // reactive — resolve + classify
      if (typeof resolved === "function" && (resolved as DynamicFn).isDynamic) {
        const meta = (resolved as DynamicFn).ssr;                      // reactive getter returning an isDynamic component — dispatch on its descriptor
        body = meta ? renderDynamic(meta) : "";
      } else if (resolved !== null && typeof resolved === "object" && (resolved as HellaNode).tag !== undefined) {
        body = ssr(resolved as HellaNode);
      } else {
        body = escapeText(resolved === false || resolved === null || resolved === undefined ? "" : `${resolved}`);
      }
    }
    return MARK_OPEN + body + MARK_CLOSE;          // wrap every dynamic region
  }
  if (typeof child === "object" && (child as HellaNode).tag !== undefined) {
    const node = child as HellaNode;
    if (node.tag === "$") return MARK_OPEN + walkChildren(node.children) + MARK_CLOSE;  // fragment — extent marker
    return ssr(node);                              // element — bounded, no marker
  }
  return "";                                       // true / DOM Node / unknown — nothing in v1
}

/** Concatenates walked children into HTML. */
function walkChildren(children?: HellaChild[]): string {
  if (!children) return "";
  let out = "";
  let i = 0;
  const len = children.length;
  while (i < len) {
    out += walkChild(children[i]!);
    i++;
  }
  return out;
}

/**
 * Serializes a HellaNode AST into an HTML string.
 *
 * Pure stringifier with zero runtime imports from any `@hellajs/*` package — only a type-only
 * `HellaNode` import (erased at compile time). Walk failures propagate to the caller (no try/catch).
 * @param node The HellaNode AST to serialize
 * @returns The rendered HTML string
 */
export function ssr(node: HellaNode): string {
  if (node === null || node === undefined) return "";
  const tag = node.tag;
  if (tag === "$") return walkChildren(node.children);               // fragment — concatenate, no markers
  let open = `<${tag}`;
  if (node.props) {
    const keys = Object.keys(node.props);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i]!;
      open += serializeProp(key, (node.props as Record<string, unknown>)[key]);
      i++;
    }
  }
  if (node.bind) {                                                   // bind: initial value, resolved once
    const keys = Object.keys(node.bind);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i]!;
      open += serializeProp(key, resolveValue((node.bind as Record<string, unknown>)[key]));
      i++;
    }
  }
  // on:/e:/hooks/error: are DOM/runtime-only — not emitted
  if (VOID.has(tag as string)) return `${open}>`;                    // void element — no body, no closing tag
  return `${open}>${walkChildren(node.children)}</${tag}>`;
}
