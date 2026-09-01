import type { HellaNode, HellaChild, SsrMeta } from "@hellajs/dom";
import { serializeProp, escapeHtml, VOID } from "./internal/serialize";
import { resolveValue, isPromise } from "./internal/resolve";
import { assertNode } from "./internal/assert";
import { hoistHead } from "./internal/head";
import { MARK_OPEN, MARK_CLOSE } from "./internal/walk";
import type { DynamicFn } from "./internal/walk";
import { ssrAsync } from "./ssrAsync";
import { ssrStream } from "./ssrStream";
import { ssrHead } from "./ssrHead";
import type { StreamOptions, SsrOptions, HeadOptions } from "./types";

/** The warn emitted when a thenable reaches the sync walk — it cannot await, so the value stringifies to `[object Promise]` into the HTML exactly as before; `ssr.async`/`ssr.stream` await it instead. */
const SYNC_PROMISE_WARN = "[ssr] Promise value under sync ssr - use ssr.async or ssr.stream, got [object Promise] emitted";

/** Renders an isDynamic component's content from its `ssr` descriptor — shared by the direct-isDynamic-child and reactive-resolved-isDynamic dispatch paths. */
function renderDynamic(meta: SsrMeta, options?: SsrOptions): string {
  const props = meta.props as Record<string, unknown>;
  switch (meta.kind) {
    case "forEach": {
      const arr = (resolveValue(props.each) as unknown[]) ?? [];
      const use = props.use as (item: unknown, index: number) => HellaChild;
      let out = "";
      let i = 0;
      const len = arr.length;
      while (i < len) {
        out += walkChild(use(arr[i]!, i), options);
        i++;
      }
      return out;
    }
    case "transition":
      return resolveValue(props.show) ? walkChild(props.children as HellaChild, options) : "";
    case "portal":
      return "";
    case "lazy":
      return props.loading !== undefined ? walkChild(props.loading as HellaChild, options) : "";   // sync cannot await the loader — loading-only; the async pair (`walkChildGen` case "lazy") awaits it
    case "suspense":
      return props.children !== undefined ? walkChild(props.children as HellaChild, options) : "";   // sync — render children, fallback dropped (no async)
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
function walkChild(child: HellaChild, options?: SsrOptions): string {
  // Parity invariant: `walkChild` (sync) and `walkChildGen` (async, `lib/internal/walk.ts`) classify
  // children identically and emit byte-identical marker wrapping (`MARK_OPEN`…`MARK_CLOSE` around every
  // dynamic region). The async path additionally awaits Promises before classifying. Any change to the
  // classification branches, marker placement, isDynamic dispatch, or the head-hoist pass (`hoistHead`
  // here, `hoistHeadAsync` there) in one MUST be mirrored in the other.
  // The parity tests (`tests/ssr-async.test.ts`, `tests/ssr-stream.test.ts`) assert this for every branch.
  // Adding a new child classification or `SsrMeta.kind` requires a new entry in `tests/helpers.ts`
  // (`parityCases`/`attributeCases`), or the async pair can diverge silently.
  if (child === null || child === undefined || child === false) return "";
  if (Array.isArray(child)) return walkChildren(child, options);              // array (e.g. JSX component children) — iterate
  if (typeof child === "string") return child;                       // static template text — raw
  if (typeof child === "number") return escapeHtml(`${child}`);
  if (typeof child === "function") {
    let body: string;
    if ((child as DynamicFn).isDynamic) {
      const meta = (child as DynamicFn).ssr;
      body = meta ? renderDynamic(meta, options) : "";       // no ssr meta (user-authored isDynamic fn) — empty region, parity with walkChildGen
    } else {
      const resolved = resolveValue(child);                            // reactive — resolve + classify
      if (typeof resolved === "function" && (resolved as DynamicFn).isDynamic) {
        const meta = (resolved as DynamicFn).ssr;                      // reactive getter returning an isDynamic component — dispatch on its descriptor
        body = meta ? renderDynamic(meta, options) : "";
      } else if (Array.isArray(resolved)) {
        body = walkChildren(resolved, options);                                 // reactive getter returning an array of children — walk each (parity with dom resolveNode)
      } else if (resolved !== null && typeof resolved === "object" && (resolved as HellaNode).tag !== undefined) {
        body = ssr(resolved as HellaNode, options);
      } else {
        if (isPromise(resolved)) console.warn(SYNC_PROMISE_WARN);   // sync cannot await a resolved Promise — [object Promise] emitted as today
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
    if (node.tag === "$") return MARK_OPEN + walkChildren(node.children, options) + MARK_CLOSE;  // fragment — extent marker
    return ssr(node, options);                              // element — bounded, no marker
  }
  return "";                                       // true / DOM Node / unknown — nothing in v1
}

/** Concatenates walked children into HTML. */
function walkChildren(children?: HellaChild[], options?: SsrOptions): string {
  if (!children) return "";
  let out = "";
  let i = 0;
  const len = children.length;
  while (i < len) {
    out += walkChild(children[i]!, options);
    i++;
  }
  return out;
}

/**
 * The `ssr` callable namespace — one serialization pass, three timing strategies. The base call
 * walks synchronously; `ssr.async` awaits every Promise in the tree; `ssr.stream` flushes
 * progressively. All three emit byte-identical markers, so `hydrate` consumes any output unchanged.
 */
interface SsrFn {
  /**
   * Serializes a HellaNode AST into an HTML string — synchronous walk.
   *
   * Pure stringifier with zero runtime imports from any `@hellajs/*` package — only a type-only
   * `HellaNode` import (erased at compile time). Walk failures propagate to the caller (no try/catch).
   * @param node The HellaNode AST to serialize
   * @param options Walk options — `head` hoists head-eligible elements (`<title>`/`<meta>`/`<link>`/`<style>`) from the tree into the bag (from `ssr.head()`) instead of emitting them; pass the filled bag to `doc({ head })`. Omitted renders every element inline (byte-identical to before the option existed).
   * @returns The rendered HTML string
   * @throws {Error} When `node` is null, undefined, or not a HellaNode (an object with a `tag`).
   */
  (node: HellaNode, options?: SsrOptions): string;
  /**
   * Async counterpart — awaits any Promise a resolved value returns (child, function-ref prop,
   * `each`, `show`, `Lazy`'s loader), then returns the concatenated HTML. A `Lazy` region renders its
   * loaded component server-side; a rejected loader renders `fallback` when present, otherwise rejects
   * the returned Promise. `<Suspense>` renders its children directly
   * (fallback dropped — everything resolves before the string returns). Marker wrapping is
   * byte-identical to the sync call, so `hydrate` consumes the output unchanged. Walk failures
   * (including rejected Promises) propagate to the caller (no try/catch).
   * @param node The HellaNode AST to serialize
   * @param options Walk options — `head` hoists head-eligible elements from the tree into the bag (from `ssr.head()`) instead of emitting them, same rules as the sync call; pass the filled bag to `doc({ head })`.
   * @returns A Promise resolving to the rendered HTML string
   * @throws {Error} When `node` is null, undefined, or not a HellaNode (an object with a `tag`).
   */
  async(node: HellaNode, options?: SsrOptions): Promise<string>;
  /**
   * Streaming counterpart — yields chunks as the walk proceeds, flushing the static prefix before
   * each awaited Promise (TTFB). A `Lazy` loader is awaited like a bare Promise: in-order outside
   * `<Suspense>`, resolved within the staged `<template>` inside it. A `<Suspense>` boundary opts a subtree into out-of-order streaming:
   * its `fallback` flushes inline, then each resolved region streams a `<template>` + an inline
   * `<script>$hs(id)</script>` that swaps it in the moment it arrives (progressive reveal, React/Solid
   * parity); `hydrate` later adopts the already-swapped nodes. Multiple regions stage concurrently —
   * each as its own region resolves (completion order, not document order). A rejecting staged region is
   * isolated: its `<template>` is skipped (fallback + sentinel remain) and `hydrate` re-suspends that region
   * client-side. Bare Promises are awaited in-order; a rejected bare Promise errors the stream. Pipe through
   * `new TextEncoderStream()` for a `Response` body. Pass `{ nonce }` to thread a CSP `nonce="…"` attribute
   * onto the `$hs` bootstrap and every per-swap `<script>` — required when the response ships a strict
   * `Content-Security-Policy` (no `unsafe-inline`); omitted emits them unattributed. Pass `head` (from
   * `ssr.head()`) to hoist head-eligible elements into the bag like the other members — the bag fills
   * as the walk proceeds (staged `<Suspense>` swaps included), but a streamed document emits its
   * `<head>` up front, so collected entries are post-hoc inspection; streaming callers pass head
   * entries to `doc` explicitly.
   * @param node The HellaNode AST to serialize
   * @param options Stream options — `nonce` for the inline swap scripts under a strict CSP; `head` for head collection (post-hoc under streaming)
   * @returns A `ReadableStream<string>` of HTML chunks
   * @throws {Error} When `node` is null, undefined, or not a HellaNode (an object with a `tag`).
   */
  stream(node: HellaNode, options?: StreamOptions): ReadableStream<string>;
  /**
   * Creates a fresh head collection bag — `{ meta: [], links: [], styles: [] }`, structurally the
   * `HeadOptions` `doc({ head })` already consumes. Pass it as `{ head }` to any member: the walk
   * hoists the tree's `<title>`/`<meta>`/`<link>`/`<style>` elements into it (title text into `title`,
   * last wins; attribute maps appended to `meta`/`links`; CSS text appended unescaped to `styles`) and
   * omits them from the body — so a route component owns its head entries. Under `ssr.stream` the bag
   * fills during the walk (post-hoc — a streamed document's `<head>` is emitted up front).
   * @returns A fresh, empty head bag.
   */
  head(): HeadOptions;
}

/**
 * Serializes a HellaNode AST into an HTML string. Callable namespace: the base call is the synchronous
 * stringifier; `ssr.async(node)` awaits the Promises in the tree; `ssr.stream(node)` returns a streaming
 * response; `ssr.head()` creates the head collection bag any member accepts as `{ head }`. Each member's
 * full contract lives on `SsrFn`.
 */
export const ssr: SsrFn = Object.assign(ssrImpl, { async: ssrAsync, stream: ssrStream, head: ssrHead });

/** Sync walk — the base call target of the `ssr` namespace (see `SsrFn` for the public contract). */
function ssrImpl(node: HellaNode, options?: SsrOptions): string {
  assertNode(node, "ssr");
  const tag = node.tag;
  if (tag === "$") return walkChildren(node.children, options);               // fragment — concatenate, no markers
  if (options?.head !== undefined && hoistHead(node, options.head)) return "";   // head-eligible element collected into the bag — omitted from the body
  let open = `<${tag}`;
  if (node.props) {
    const keys = Object.keys(node.props);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i]!;
      const value = resolveValue((node.props as Record<string, unknown>)[key]);
      if (isPromise(value)) console.warn(SYNC_PROMISE_WARN);        // sync cannot await a function-ref prop's Promise — stringified as today
      open += serializeProp(key, value);
      i++;
    }
  }
  // on:/e:/hooks/error: are DOM/runtime-only — not emitted
  if (VOID.has(tag as string)) return `${open}>`;                    // void element — no body, no closing tag
  return `${open}>${walkChildren(node.children, options)}</${tag}>`;
}
