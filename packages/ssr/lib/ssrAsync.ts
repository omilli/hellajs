import type { HellaNode } from "@hellajs/dom";
import { ssrNodeGen } from "./internal/walk";
import { assertNode } from "./internal/assert";
import type { SsrOptions } from "./types";

/**
 * @internal
 * Serializes a HellaNode AST into an HTML string — the `ssr.async` namespace member. A thin collect-wrapper
 * over the shared async generator (`ssrNodeGen`): awaits any Promise a resolved value returns (including
 * `Lazy`'s loader — the loaded component renders server-side; a rejection renders `fallback` or rejects),
 * then returns the concatenated HTML. `<Suspense>` renders its children directly (fallback dropped — everything resolves
 * before the string returns). Marker wrapping is byte-identical to `ssr`, so `hydrate` consumes the output
 * unchanged. Walk failures (including rejected Promises) propagate to the caller (no try/catch).
 * @param node The HellaNode AST to serialize
 * @param options Walk options — `head` hoists head-eligible elements (`<title>`/`<meta>`/`<link>`/`<style>`) from the tree into the bag (from `ssr.head()`) instead of emitting them, same rules as the sync call; pass the filled bag to `doc({ head })`.
 * @returns A Promise resolving to the rendered HTML string
 * @throws {Error} When `node` is null, undefined, or not a HellaNode (an object with a `tag`).
 */
export async function ssrAsync(node: HellaNode, options?: SsrOptions): Promise<string> {
  assertNode(node, "ssr.async");
  let out = "";
  for await (const chunk of ssrNodeGen(node, undefined, options?.head)) out += chunk;
  return out;
}
