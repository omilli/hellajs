import type { HellaNode } from "@hellajs/dom";
import { ssrNodeGen } from "./internal/walk";

/**
 * @internal
 * Serializes a HellaNode AST into an HTML string — the `ssr.async` namespace member. A thin collect-wrapper
 * over the shared async generator (`ssrNodeGen`): awaits any Promise a resolved value returns, then returns
 * the concatenated HTML. `<Suspense>` renders its children directly (fallback dropped — everything resolves
 * before the string returns). Marker wrapping is byte-identical to `ssr`, so `hydrate` consumes the output
 * unchanged. Walk failures (including rejected Promises) propagate to the caller (no try/catch).
 * @param node The HellaNode AST to serialize
 * @returns A Promise resolving to the rendered HTML string
 * @throws {Error} When `node` is null or undefined.
 */
export async function ssrAsync(node: HellaNode): Promise<string> {
  if (node === null || node === undefined) {
    throw new Error(`[ssr] ssr.async: node is required, received ${node}`);
  }
  let out = "";
  for await (const chunk of ssrNodeGen(node, undefined)) out += chunk;
  return out;
}
