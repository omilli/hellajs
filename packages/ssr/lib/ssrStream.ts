import type { HellaNode } from "@hellajs/dom";
import { escapeHtml } from "./internal/serialize";
import { ssrNodeGen } from "./internal/walk";
import type { PendingSwap } from "./internal/walk";
import { assertNode } from "./internal/assert";
import type { StreamOptions } from "./types";

/**
 * The inline swap function emitted once at the start of a streamed `<Suspense>` flush (only when there are
 * staged swaps). Defines a global `$hs(id)`: finds the sentinel comment (`nodeValue === id`) via a comment
 * TreeWalker, balance-walks to the region's `<!--[->` (`[`) / `<!--]-&gt;` (`]`) bounds, replaces the
 * fallback+sentinel range with the staged `<template>`'s content **wrapped in an extra `<!--[->…<!--]-&gt;` pair**,
 * and removes the template. The wrapper is required: hydrate's `hydrateDynamic` eats the region's outer marker
 * pair via `consumeRegion`, so the inner pair left by the wrapper becomes the resolved getter's reactive-region
 * markers — matching what β's `swapSuspenseStage` returns (marker-including childNodes), so hydrate adopts the
 * resolved content without re-evaluating the getter (which would stringify its Promise → `[object Promise]`).
 * Mirrors dom's `swapSuspenseStage` (the no-script/HappyDOM fallback); parity enforced by `tests/ssr-suspense.test.ts`.
 * `@hellajs/ssr` cannot import `@hellajs/dom` at runtime (zero-runtime invariant), so this ships as an inline
 * string — memory 014 clears inline scripts against that invariant.
 */
const HS_SWAP_SCRIPT = `function $hs(id){
  var t=document.getElementById(id);if(!t)return;
  var w=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_COMMENT,null),s=null,n;
  while((n=w.nextNode())){if(n.nodeValue===id){s=n;break;}}
  if(!s)return;
  var p=s.parentNode;
  var o=null,d=0,x=s.previousSibling;
  while(x){if(x.nodeType===8){if(x.nodeValue==="]"){d++;}else if(x.nodeValue==="["){if(d===0){o=x;break;}d--;}}x=x.previousSibling;}
  if(!o)return;
  var c=null;d=0;var y=s.nextSibling;
  while(y){if(y.nodeType===8){if(y.nodeValue==="["){d++;}else if(y.nodeValue==="]"){if(d===0){c=y;break;}d--;}}y=y.nextSibling;}
  if(!c)return;
  var ib=c.nextSibling;
  var rn=o;
  while(rn){var nx=rn.nextSibling;p.removeChild(rn);if(rn===c)break;rn=nx;}
  var f=document.createDocumentFragment();
  f.appendChild(document.createComment("["));
  while(t.content.firstChild)f.appendChild(t.content.firstChild);
  f.appendChild(document.createComment("]"));
  p.insertBefore(f,ib);
  t.remove();
}`;

/**
 * @internal
 * Serializes a HellaNode AST into a streaming HTML response — the `ssr.stream` namespace member.
 * yields chunks as the walk proceeds, flushing the static prefix before each awaited Promise (TTFB). Delivery
 * is pull-driven — the walk advances at most one chunk per consumer `pull()`, so a slow client exerts real
 * backpressure instead of buffering the whole response in the stream queue (read-ahead bounded by the
 * queue's high-water mark). A
 * `Lazy` loader is awaited like a bare Promise: in-order outside `<Suspense>`, resolved within the
 * staged `<template>` inside it (a rejection renders `fallback` or errors the swap). A
 * `<Suspense>` boundary opts a subtree into out-of-order streaming: its `fallback` flushes inline, then each
 * resolved region streams a `<template>` + an inline `<script>$hs(id)</script>` that swaps it in the moment it
 * arrives (progressive reveal, React/Solid parity); `hydrate` later adopts the already-swapped nodes. Multiple
 * regions stage concurrently — each as its own region resolves (completion order, not document order). A
 * rejecting staged region is isolated: its `<template>` is skipped (fallback + sentinel remain in the shell)
 * and `hydrate` re-suspends that region client-side, where the rejection reaches the nearest error boundary.
 * Returns a web `ReadableStream<string>`; pipe through `new TextEncoderStream()` for a `Response` body.
 * Bare Promises are awaited in-order; a rejected bare Promise errors the stream. Zero runtime imports.
 * @param node The HellaNode AST to serialize
 * @param options Stream options — `nonce` threads a CSP `nonce="…"` attribute (escaped) onto the `$hs`
 * bootstrap and every per-swap `<script>`, so a strict `Content-Security-Policy` (no `unsafe-inline`)
 * still lets the progressive swaps run; omitted emits them unattributed (byte-identical output). `head`
 * hoists head-eligible elements into the bag (from `ssr.head()`) like the other members — staged
 * `<Suspense>` swaps keep filling it as they resolve — but the bag is post-hoc under streaming: a
 * streamed document emits its `<head>` up front, so collected entries cannot join it; streaming
 * callers pass head entries to `doc` explicitly.
 * @returns A `ReadableStream<string>` of HTML chunks
 * @throws {Error} When `node` is null, undefined, or not a HellaNode (an object with a `tag`).
 */
export function ssrStream(node: HellaNode, options?: StreamOptions): ReadableStream<string> {
  assertNode(node, "ssr.stream");
  const nonceAttr = options?.nonce !== undefined ? ` nonce="${escapeHtml(options.nonce)}"` : "";
  const pending: PendingSwap[] = [];
  const gen = ssrNodeGen(node, pending, options?.head);
  let done = false;                         // shared by pull/cancel: suppress late enqueues once the stream is done (cancel/error)
  let mainDone = false;                     // main walk finished — staged-swap flush phase (bootstrap + resolved templates)
  let settled = true;                       // false while kicked swap drains are in flight — close only after the flush queue drains
  const queue: string[] = [];               // staged-flush chunks (the $hs bootstrap + each resolved <template>+script), drained one per pull
  let wake: (() => void) | undefined;       // resolves a pull parked on an empty flush queue (a swap appended, or all settled)
  return new ReadableStream<string>({
    // pull-driven drain — `pull()` is the only backpressure signal a ReadableStream offers (a busy-wait on
    // `desiredSize` inside `start` is not real backpressure): the walk advances at most one chunk per pull,
    // so a slow consumer never buffers the whole response in the stream queue — the machinery's own
    // read-ahead is bounded by the queue's high-water mark. Enqueue happens exclusively inside pull,
    // never from a background drain; the first pull fires immediately, preserving TTFB.
    async pull(controller) {
      if (done) return;
      try {
        if (!mainDone) {
          const next = await gen.next();    // advance the main walk by exactly one chunk
          if (done) return;                 // cancelled while parked in the generator
          if (!next.done) { controller.enqueue(next.value); return; }
          mainDone = true;
          if (pending.length) {
            // flush deferred <Suspense> swaps concurrently: each region's resolved <template> is appended
            // the moment its own async work completes (completion order, not document order). A one-time
            // `$hs` bootstrap precedes them (only when there are staged swaps); each template is followed
            // by an inline swap script so the browser swaps it in on arrival (progressive). hydrate resolves
            // staged templates by id (getElementById on the sentinel's nodeValue), so order-independent
            // emission is safe. Each swap's drain carries its own catch — one rejecting region is skipped
            // (fallback + sentinel stay) instead of erroring the stream, so healthy siblings still flush;
            // hydrate's stageMissing path re-suspends the failed region client-side (its rejection bubbles
            // to the nearest error boundary — React $RX parity).
            queue.push(`<script${nonceAttr}>${HS_SWAP_SCRIPT}</script>`);
            settled = false;
            void Promise.all(pending.map(async (swap) => {
              let html = "";
              try {
                for await (const chunk of swap.childGen) html += chunk;
              } catch (err) {
                console.warn(`[ssr] suspense region ${swap.id} failed - template skipped; hydrate will re-suspend it`, err);
                return;
              }
              queue.push(`<template id="${swap.id}">${html}</template><script${nonceAttr}>$hs("${swap.id}")</script>`);
              if (wake) { wake(); wake = undefined; }  // deliver the parked pull (none parked → next pull shifts directly)
            })).then(() => {
              settled = true;
              if (wake) { wake(); wake = undefined; }  // close the parked pull — every drain settled
            });
          }
        }
        while (queue.length === 0) {        // flush queue empty — park until a swap appends or all settle (pull stays pending: no progress without demand)
          if (settled) { controller.close(); return; }  // guard mirrors doc.ts's suffix flush — a cancel between the last enqueue and close() would otherwise throw here
          await new Promise<void>((resolve) => { wake = resolve; });
          if (done) return;                 // cancelled while parked
        }
        controller.enqueue(queue.shift()!);
      } catch (err) {
        done = true;                        // a main-walk rejection — surface it (staged-swap rejections are isolated per drain above)
        controller.error(err);
      }
    },
    cancel() {
      done = true;                          // best-effort: suppress further enqueues into the cancelled stream
      void gen.return(undefined);           // stop the main generator when the consumer cancels
      let si = 0;                           // also return any staged <Suspense> swaps, so their deferred work doesn't continue into a dead stream
      const sLen = pending.length;
      while (si < sLen) {
        void pending[si]!.childGen.return(undefined);
        si++;
      }
    },
  });
}
