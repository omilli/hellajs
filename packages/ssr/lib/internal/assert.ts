import type { HellaNode } from "@hellajs/dom";

/**
 * @internal
 * Validates a serializer entry's root — the shared guard behind `ssr`/`ssr.async`/`ssr.stream`. Rejects
 * both a missing root and a tag-less non-node root (e.g. an uninvoked component fn passed to `ssr`),
 * which would otherwise silently serialize to garbage HTML (`<undefined></undefined>`).
 * @param node The root value the caller passed (validated, not trusted).
 * @param member The calling member's name (`"ssr"` / `"ssr.async"` / `"ssr.stream"`), woven into the message.
 * @throws {Error} When `node` is null or undefined, or is not an object carrying a `tag`.
 */
export function assertNode(node: unknown, member: string): void {
  if (node === null || node === undefined) {
    throw new Error(`[ssr] ${member}: node is required, received ${node}`);
  }
  if (typeof node !== "object" || (node as HellaNode).tag === undefined) {
    throw new Error(`[ssr] ${member}: node must be a HellaNode (object with a tag), received ${typeof node}`);
  }
}
