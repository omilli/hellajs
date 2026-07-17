import type { HellaNode } from "@hellajs/dom";
import { ssrNodeGen } from "./internal/walk";
import type { PendingSwap } from "./internal/walk";

/**
 * Serializes a HellaNode AST into a streaming HTML response — a streaming counterpart of {@link ssr} that
 * yields chunks as the walk proceeds, flushing the static prefix before each awaited Promise (TTFB). A
 * `<Suspense>` boundary opts a subtree into out-of-order streaming: its `fallback` flushes inline and the
 * resolved children are staged in a `<template>` at stream end for `hydrate` to swap in (β: hydrate-swap).
 * Returns a web `ReadableStream<string>`; pipe through `new TextEncoderStream()` for a `Response` body.
 * Bare Promises are awaited in-order; a rejected Promise errors the stream. Zero runtime imports.
 * @param node The HellaNode AST to serialize
 * @returns A `ReadableStream<string>` of HTML chunks
 * @throws {Error} When `node` is null or undefined.
 */
export function ssrStream(node: HellaNode): ReadableStream<string> {
  if (node === null || node === undefined) {
    throw new Error(`[ssr] ssrStream: node is required, received ${node}`);
  }
  const pending: PendingSwap[] = [];
  const gen = ssrNodeGen(node, pending);
  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of gen) controller.enqueue(chunk);
        // flush deferred <Suspense> swaps: stage resolved children in a <template> hydrate swaps in
        let si = 0;
        const sLen = pending.length;
        while (si < sLen) {
          const swap = pending[si]!;
          let html = "";
          for await (const chunk of swap.childGen) html += chunk;
          controller.enqueue(`<template id="${swap.id}">${html}</template>`);
          si++;
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
