import type { HellaNode, HellaChild, SsrMeta } from "@hellajs/dom";
import { serializeProp, escapeHtml, VOID } from "./serialize";
import { resolveAsync } from "./resolve";
import { hoistHeadAsync } from "./head";
import type { HeadOptions } from "../types";

/**
 * @internal
 * SSR region-boundary markers (Vue-style). The HTML parser turns these into Comment nodes (nodeValue `[` / `]`) that `hydrate` locates to bind dynamic regions without structural inference.
 */
export const MARK_OPEN = "<!--[-->";
export const MARK_CLOSE = "<!--]-->";

/**
 * @internal
 * Structural shape of an isDynamic component function (avoids importing the runtime `RenderFn`).
 */
export interface DynamicFn {
  isDynamic?: true;
  ssr?: SsrMeta;
}

/**
 * @internal
 * A deferred `<Suspense>` swap: the server emits `fallback` inline now, then stages the resolved children in a `<template id="hsN">` followed by an inline `<script>$hs("hsN")</script>` (a one-time `$hs` bootstrap precedes them) so the browser swaps on arrival; `hydrate`'s `swapSuspenseStage` is the no-script fallback.
 */
export interface PendingSwap {
  /** The `<template>` id; also the nodeValue of the sentinel comment inside the region. */
  id: string;
  /** Generator producing the resolved children HTML (non-streaming — nested suspense resolves eagerly within). */
  childGen: AsyncGenerator<string>;
}

/** Monotonic counter for deferred `<Suspense>` swap ids — unique across `ssr.stream` calls in one process, so composed streamed outputs never collide on `hs0`. */
let suspenseSeq = 0;

/** Renders an isDynamic component's content from its `ssr` descriptor — async generator yielding HTML chunks; awaits Promise `each`/`show` and the `Lazy` loader. `<Suspense>` defers a swap onto `pending` (streaming) or renders children directly (non-streaming). */
async function* renderDynamicGen(meta: SsrMeta, pending?: PendingSwap[], head?: HeadOptions): AsyncGenerator<string> {
  const props = meta.props as Record<string, unknown>;
  switch (meta.kind) {
    case "forEach": {
      const arr = ((await resolveAsync(props.each)) as unknown[]) ?? [];
      const use = props.use as (item: unknown, index: number) => HellaChild;
      let i = 0;
      const len = arr.length;
      while (i < len) {
        yield* walkChildGen(use(arr[i]!, i), pending, head);
        i++;
      }
      return;
    }
    case "transition":
      if (await resolveAsync(props.show)) yield* walkChildGen(props.children as HellaChild, pending, head);
      return;
    case "portal":
      return;
    case "lazy": {
      // Async pair only — the sync walker stays loading-only (it cannot await). Mirrors dom's `.then`:
      // a function result is called with `props.props`; anything else walks as-is. `signal` is passed for
      // call-shape fidelity with dom — it never aborts server-side. A rejection renders `fallback` when
      // present (dom parity); with none it propagates, like a rejected bare Promise.
      let resolved: HellaChild;
      try {
        const loaded = await (props.loader as (o: { signal: AbortSignal }) => unknown)({ signal: new AbortController().signal });
        resolved = typeof loaded === "function" ? (loaded as (p: unknown) => HellaChild)(props.props) : loaded as HellaChild;
      } catch (err) {
        if (props.fallback !== undefined) {
          yield* walkChildGen(props.fallback as HellaChild, pending, head);
          return;
        }
        throw err;
      }
      yield* walkChildGen(resolved, pending, head);
      return;
    }
    case "suspense":
      if (pending) {                                                  // streaming — defer: emit fallback now, stage resolved children for hydrate to swap in
        const id = `hs${suspenseSeq++}`;
        yield* walkChildGen(props.fallback as HellaChild, pending, head);   // fallback sits inside the region walkChildGen already opened
        yield `<!--${id}-->`;                                         // sentinel comment carrying the <template> id
        pending.push({ id, childGen: walkChildGen(props.children as HellaChild, undefined, head) });  // children collected non-streaming → nested suspense resolves eagerly; head keeps filling from staged swaps
        return;
      }
      yield* walkChildGen(props.children as HellaChild, undefined, head);   // non-streaming (ssr.async) — render children directly, fallback dropped
      return;
    default:
      console.warn(`[ssr] unknown isDynamic kind: ${String(meta.kind)}`);
      return;                        // unknown kind — render nothing, never call the RenderFn
  }
}

/**
 * Walks a single child into HTML chunks — async generator. A function child is resolved and, if it yields
 * a Promise, awaited before classification. `MARK_OPEN` and `MARK_CLOSE` bracket the region's chunks, so
 * `hydrate` consumes `ssr.async`/`ssr.stream` output exactly as it consumes `ssr` output.
 */
async function* walkChildGen(child: HellaChild, pending?: PendingSwap[], head?: HeadOptions): AsyncGenerator<string> {
  // Parity invariant: `walkChildGen` (async) and `walkChild` (sync, `lib/ssr.ts`) classify children
  // identically and emit byte-identical marker wrapping (`MARK_OPEN`…`MARK_CLOSE` around every dynamic
  // region). This path additionally awaits Promises before classifying. Any change to the classification
  // branches, marker placement, isDynamic dispatch, or the head-hoist pass (`hoistHeadAsync` here,
  // `hoistHead` there) in one MUST be mirrored in the other. The parity tests
  // (`tests/ssr-async.test.ts`, `tests/ssr-stream.test.ts`) assert this for every branch.
  // Adding a new child classification or `SsrMeta.kind` requires a new entry in `tests/helpers.ts`
  // (`parityCases`/`attributeCases`), or the async pair can diverge silently.
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) { yield* walkChildrenGen(child, pending, head); return; }  // array (e.g. JSX component children) — iterate
  if (typeof child === "string") { yield child; return; }              // static template text — raw
  if (typeof child === "number") { yield escapeHtml(`${child}`); return; }
  if (typeof child === "function") {
    yield MARK_OPEN;
    if ((child as DynamicFn).isDynamic) {
      const meta = (child as DynamicFn).ssr;
      if (meta) yield* renderDynamicGen(meta, pending, head);               // user-authored isDynamic fn with no ssr → empty region
    } else {
      const resolved = await resolveAsync(child);                      // reactive — resolve, await if Promise, classify
      if (typeof resolved === "function" && (resolved as DynamicFn).isDynamic) {
        const meta = (resolved as DynamicFn).ssr;                      // reactive getter returning an isDynamic component
        if (meta) yield* renderDynamicGen(meta, pending, head);
      } else if (Array.isArray(resolved)) {
        yield* walkChildrenGen(resolved, pending, head);                     // reactive getter returning an array of children — walk each (parity with dom resolveNode)
      } else if (resolved !== null && typeof resolved === "object" && (resolved as HellaNode).tag !== undefined) {
        yield* ssrNodeGen(resolved as HellaNode, pending, head);
      } else {
        yield escapeHtml(resolved === false || resolved === null || resolved === undefined ? "" : `${resolved}`);
      }
    }
    yield MARK_CLOSE;
    return;
  }
  if (typeof child === "object" && child !== null && "raw" in child) {
    yield MARK_OPEN;
    yield child.raw;                                                 // raw HTML region — verbatim, marker-bounded (parity with sync walkChild)
    yield MARK_CLOSE;
    return;
  }
  if (typeof child === "object" && (child as HellaNode).tag !== undefined) {
    const node = child as HellaNode;
    if (node.tag === "$") { yield MARK_OPEN; yield* walkChildrenGen(node.children, pending, head); yield MARK_CLOSE; }  // fragment — extent marker
    else yield* ssrNodeGen(node, pending, head);                            // element — bounded, no marker
    return;
  }
  // true / DOM Node / unknown — nothing
}

/** Walks children into HTML chunks — async generator. */
async function* walkChildrenGen(children?: HellaChild[], pending?: PendingSwap[], head?: HeadOptions): AsyncGenerator<string> {
  if (!children) return;
  let i = 0;
  const len = children.length;
  while (i < len) {
    yield* walkChildGen(children[i]!, pending, head);
    i++;
  }
}

/**
 * @internal
 * Serializes a HellaNode AST into HTML chunks — async generator; the single async walker shared by
 * `ssr.async` (collect-wrapper) and `ssr.stream` (ReadableStream wrapper). Each resolved value (child,
 * `each`, `show`) is awaited when it is a Promise. Marker wrapping is byte-identical to `ssr`. When
 * `head` is present, head-eligible elements hoist into the bag (`hoistHeadAsync`) instead of emitting.
 */
export async function* ssrNodeGen(node: HellaNode, pending?: PendingSwap[], head?: HeadOptions): AsyncGenerator<string> {
  const tag = node.tag;
  if (tag === "$") { yield* walkChildrenGen(node.children, pending, head); return; }   // fragment — concatenate, no markers
  if (head !== undefined && (await hoistHeadAsync(node, head))) return;   // head-eligible element collected into the bag — omitted from the body
  let open = `<${tag}`;
  if (node.props) {
    const keys = Object.keys(node.props);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i]!;
      open += serializeProp(key, await resolveAsync((node.props as Record<string, unknown>)[key]));
      i++;
    }
  }
  // on:/e:/hooks/error: are DOM/runtime-only — not emitted
  if (VOID.has(tag as string)) { yield `${open}>`; return; }           // void element — no body, no closing tag
  yield `${open}>`;
  yield* walkChildrenGen(node.children, pending, head);
  yield `</${tag}>`;
}
