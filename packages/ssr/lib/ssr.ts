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
    case "suspense":
      return props.children !== undefined ? walkChild(props.children as HellaChild) : "";   // sync — render children, fallback dropped (no async)
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

/** True for thenables — a reactive getter may resolve to a Promise that the async walker awaits. */
function isPromise(value: unknown): value is Promise<unknown> {
  return value !== null && typeof value === "object" && typeof (value as { then?: unknown }).then === "function";
}

/** Resolves a value by calling it if it is a function, then awaiting it if it is a Promise. Async counterpart to `resolveValue`; one `await` fully unwraps nested thenables. */
async function resolveAsync(value: unknown): Promise<unknown> {
  const resolved = resolveValue(value);
  return isPromise(resolved) ? await resolved : resolved;
}

/** A deferred `<Suspense>` swap: the server emits `fallback` inline now, then stages the resolved children in a `<template id="hsN">` for `hydrate` to swap in (β: hydrate-swap, no inline script). */
interface PendingSwap {
  /** The `<template>` id; also the nodeValue of the sentinel comment inside the region. */
  id: string;
  /** Generator producing the resolved children HTML (non-streaming — nested suspense resolves eagerly within). */
  childGen: AsyncGenerator<string>;
}

/** Renders an isDynamic component's content from its `ssr` descriptor — async generator yielding HTML chunks; awaits Promise `each`/`show`/`loading`. `<Suspense>` defers a swap onto `pending` (streaming) or renders children directly (non-streaming). */
async function* renderDynamicGen(meta: SsrMeta, pending?: PendingSwap[]): AsyncGenerator<string> {
  const props = meta.props as Record<string, unknown>;
  switch (meta.kind) {
    case "forEach": {
      const arr = ((await resolveAsync(props.each)) as unknown[]) ?? [];
      const use = props.use as (item: unknown, index: number) => HellaChild;
      let i = 0;
      const len = arr.length;
      while (i < len) {
        yield* walkChildGen(use(arr[i]!, i), pending);
        i++;
      }
      return;
    }
    case "transition":
      if (await resolveAsync(props.show)) yield* walkChildGen(props.children as HellaChild, pending);
      return;
    case "portal":
      return;
    case "lazy":
      if (props.loading !== undefined) yield* walkChildGen(props.loading as HellaChild, pending);
      return;
    case "suspense":
      if (pending) {                                                  // streaming — defer: emit fallback now, stage resolved children for hydrate to swap in
        const id = `hs${pending.length}`;
        yield* walkChildGen(props.fallback as HellaChild, pending);   // fallback sits inside the region walkChildGen already opened
        yield `<!--${id}-->`;                                         // sentinel comment carrying the <template> id
        pending.push({ id, childGen: walkChildGen(props.children as HellaChild, undefined) });  // children collected non-streaming → nested suspense resolves eagerly
        return;
      }
      yield* walkChildGen(props.children as HellaChild, undefined);   // non-streaming (ssrAsync) — render children directly, fallback dropped
      return;
    default:
      return;                        // unknown kind — render nothing, never call the RenderFn
  }
}

/**
 * Walks a single child into HTML chunks — async generator. A function child is resolved and, if it yields
 * a Promise, awaited before classification. `MARK_OPEN` and `MARK_CLOSE` bracket the region's chunks, so
 * `hydrate` consumes `ssrStream`/`ssrAsync` output exactly as it consumes `ssr` output.
 */
async function* walkChildGen(child: HellaChild, pending?: PendingSwap[]): AsyncGenerator<string> {
  if (child === null || child === undefined || child === false) return;
  if (typeof child === "string") { yield child; return; }              // static template text — raw
  if (typeof child === "number") { yield escapeText(`${child}`); return; }
  if (typeof child === "function") {
    yield MARK_OPEN;
    if ((child as DynamicFn).isDynamic) {
      const meta = (child as DynamicFn).ssr;
      if (meta) yield* renderDynamicGen(meta, pending);               // user-authored isDynamic fn with no ssr → empty region
    } else {
      const resolved = await resolveAsync(child);                      // reactive — resolve, await if Promise, classify
      if (typeof resolved === "function" && (resolved as DynamicFn).isDynamic) {
        const meta = (resolved as DynamicFn).ssr;                      // reactive getter returning an isDynamic component
        if (meta) yield* renderDynamicGen(meta, pending);
      } else if (resolved !== null && typeof resolved === "object" && (resolved as HellaNode).tag !== undefined) {
        yield* ssrNodeGen(resolved as HellaNode, pending);
      } else {
        yield escapeText(resolved === false || resolved === null || resolved === undefined ? "" : `${resolved}`);
      }
    }
    yield MARK_CLOSE;
    return;
  }
  if (typeof child === "object" && (child as HellaNode).tag !== undefined) {
    const node = child as HellaNode;
    if (node.tag === "$") { yield MARK_OPEN; yield* walkChildrenGen(node.children, pending); yield MARK_CLOSE; }  // fragment — extent marker
    else yield* ssrNodeGen(node, pending);                            // element — bounded, no marker
    return;
  }
  // true / DOM Node / unknown — nothing
}

/** Walks children into HTML chunks — async generator. */
async function* walkChildrenGen(children?: HellaChild[], pending?: PendingSwap[]): AsyncGenerator<string> {
  if (!children) return;
  let i = 0;
  const len = children.length;
  while (i < len) {
    yield* walkChildGen(children[i]!, pending);
    i++;
  }
}

/**
 * Serializes a HellaNode AST into HTML chunks — async generator; the single async walker shared by
 * `ssrAsync` (collect-wrapper) and `ssrStream` (ReadableStream wrapper). Each resolved value (child,
 * `bind:`, `each`, `show`) is awaited when it is a Promise. Marker wrapping is byte-identical to `ssr`.
 */
async function* ssrNodeGen(node: HellaNode, pending?: PendingSwap[]): AsyncGenerator<string> {
  if (node === null || node === undefined) return;
  const tag = node.tag;
  if (tag === "$") { yield* walkChildrenGen(node.children, pending); return; }   // fragment — concatenate, no markers
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
  if (node.bind) {                                                    // bind: resolved + awaited
    const keys = Object.keys(node.bind);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i]!;
      open += serializeProp(key, await resolveAsync((node.bind as Record<string, unknown>)[key]));
      i++;
    }
  }
  // on:/e:/hooks/error: are DOM/runtime-only — not emitted
  if (VOID.has(tag as string)) { yield `${open}>`; return; }           // void element — no body, no closing tag
  yield `${open}>`;
  yield* walkChildrenGen(node.children, pending);
  yield `</${tag}>`;
}

/**
 * Serializes a HellaNode AST into an HTML string — async counterpart to {@link ssr}. A thin collect-wrapper
 * over the shared async generator (`ssrNodeGen`): awaits any Promise a resolved value returns, then returns
 * the concatenated HTML. `<Suspense>` renders its children directly (fallback dropped — everything resolves
 * before the string returns). Marker wrapping is byte-identical to `ssr`, so `hydrate` consumes the output
 * unchanged. Walk failures (including rejected Promises) propagate to the caller (no try/catch).
 * @param node The HellaNode AST to serialize
 * @returns A Promise resolving to the rendered HTML string
 */
export async function ssrAsync(node: HellaNode): Promise<string> {
  let out = "";
  for await (const chunk of ssrNodeGen(node, undefined)) out += chunk;
  return out;
}

/**
 * Serializes a HellaNode AST into a streaming HTML response — a streaming counterpart of {@link ssr} that
 * yields chunks as the walk proceeds, flushing the static prefix before each awaited Promise (TTFB). A
 * `<Suspense>` boundary opts a subtree into out-of-order streaming: its `fallback` flushes inline and the
 * resolved children are staged in a `<template>` at stream end for `hydrate` to swap in (β: hydrate-swap).
 * Returns a web `ReadableStream<string>`; pipe through `new TextEncoderStream()` for a `Response` body.
 * Bare Promises are awaited in-order; a rejected Promise errors the stream. Zero runtime imports.
 * @param node The HellaNode AST to serialize
 * @returns A `ReadableStream<string>` of HTML chunks
 */
export function ssrStream(node: HellaNode): ReadableStream<string> {
  const pending: PendingSwap[] = [];
  const gen = ssrNodeGen(node, pending);
  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of gen) controller.enqueue(chunk);
        for (const swap of pending) {                                // flush deferred <Suspense> swaps: stage resolved children in a <template> hydrate swaps in
          let html = "";
          for await (const chunk of swap.childGen) html += chunk;
          controller.enqueue(`<template id="${swap.id}">${html}</template>`);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      void gen.return(undefined);           // best-effort: stop the generator when the consumer cancels
    },
  });
}
