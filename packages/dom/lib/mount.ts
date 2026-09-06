import type { HellaNode, HellaElement, MountHandle } from "./types/nodes";
import { isString } from "./internal/core";
import { resolveValue } from "./internal/utils";
import { setMountNode } from "./internal/dispatch";
import { mountNode } from "./internal/render";
import { registerContainer } from "./internal/queue";
import { createMountHandle } from "./internal/handle";

// Wrapper breaks circular import: dispatch.ts needs mountNode from render.ts, render.ts imports from dispatch.ts
setMountNode((node: HellaNode) => mountNode(node) as Node);

/**
 * Mounts a HellaNode to a DOM element, replacing all existing content.
 * Supports async component functions — the container mounts the resolved node when the Promise settles.
 * @param node The HellaNode or component function to mount (sync or async)
 * @param target CSS selector string, Element, or ShadowRoot to mount into (defaults to "#app")
 * @returns A MountHandle for controlling the mounted tree
 * @throws {Error} When target is a selector string that matches no element in the document.
 */
export function mount(
  node: HellaNode | (() => HellaNode) | (() => Promise<HellaNode | (() => HellaNode)>),
  target: string | Element | ShadowRoot = "#app"
): MountHandle {
  const container = isString(target) ? document.querySelector(target) : target;
  if (!container) throw new Error(`[dom] mount: target "${target}" not found in document`);

  return createMountHandle(container, node, (resolvedNode) => {
    const n = resolveValue(resolvedNode) as HellaNode;
    const el = mountNode(n) as HellaElement;
    container.replaceChildren(el);
    registerContainer(container);
    // replaceChildren has already spread a fragment root's children — the container's live child set is the root set
    return Array.from(container.childNodes);
  });
}
