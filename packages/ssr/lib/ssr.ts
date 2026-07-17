import type { HellaNode, HellaChild, SsrMeta } from "@hellajs/dom";
import { serializeProp, escapeHtml, VOID } from "./internal/serialize";
import { resolveValue } from "./internal/resolve";
import { MARK_OPEN, MARK_CLOSE } from "./internal/walk";
import type { DynamicFn } from "./internal/walk";

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
    case "suspense":
      return props.children !== undefined ? walkChild(props.children as HellaChild) : "";   // sync — render children, fallback dropped (no async)
    default:
      console.warn(`[ssr] unknown isDynamic kind: ${String(meta.kind)}`);
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
  // Parity invariant: `walkChild` (sync) and `walkChildGen` (async, `lib/internal/walk.ts`) classify
  // children identically and emit byte-identical marker wrapping (`MARK_OPEN`…`MARK_CLOSE` around every
  // dynamic region). The async path additionally awaits Promises before classifying. Any change to the
  // classification branches, marker placement, or isDynamic dispatch in one MUST be mirrored in the other.
  // The parity tests (`tests/ssr-async.test.ts`, `tests/ssr-stream.test.ts`) assert this for every branch.
  // Adding a new child classification or `SsrMeta.kind` requires a new entry in `tests/helpers.ts`
  // (`parityCases`/`attributeCases`), or the async pair can diverge silently.
  if (child === null || child === undefined || child === false) return "";
  if (typeof child === "string") return child;                       // static template text — raw
  if (typeof child === "number") return escapeHtml(`${child}`);
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
        body = escapeHtml(resolved === false || resolved === null || resolved === undefined ? "" : `${resolved}`);
      }
    }
    return MARK_OPEN + body + MARK_CLOSE;          // wrap every dynamic region
  }
  if (typeof child === "object" && child !== null && "raw" in child) {
    return MARK_OPEN + child.raw + MARK_CLOSE;   // raw HTML region — verbatim, marker-bounded (opaque to hydrate)
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
 * @throws {Error} When `node` is null or undefined.
 */
export function ssr(node: HellaNode): string {
  if (node === null || node === undefined) {
    throw new Error(`[ssr] ssr: node is required, received ${node}`);
  }
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
