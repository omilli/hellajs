import type { MountHandle } from "./types/nodes";
import type { TemplateBuildFn } from "./runtime";
import { isString } from "./internal/core";
import { isTemplateBuild } from "./internal/utils";
import { resolveNode } from "./internal/render";
import { registerContainer } from "./internal/queue";
import { popBuildParent, pushBuildParent } from "./internal/state";
import { createMountHandle } from "./internal/handle";

/**
 * Mounts a compiled component tree into a DOM element, replacing all existing content.
 * Accepts flagged build fns (`target: "dom"` compiler output — `component()` results,
 * sync or async). Supports async component functions — the container mounts the resolved
 * build when the Promise settles. Hand-built HellaNode input is rejected: compile via
 * the babel plugin or build imperatively via `@hellajs/dom/runtime`.
 * @param node The flagged build fn to mount (sync or async)
 * @param target CSS selector string, Element, or ShadowRoot to mount into (defaults to "#app")
 * @returns A MountHandle for controlling the mounted tree
 * @throws {Error} When target is a selector string that matches no element in the document.
 * @throws {Error} When `node` resolves to hand-built HellaNode input — `[dom] mount: hand-built
 * HellaNode input is not supported — compile via the babel plugin or build imperatively via
 * @hellajs/dom/runtime`.
 */
export function mount(
  node:
    | TemplateBuildFn
    | (() => TemplateBuildFn)
    | (() => Promise<TemplateBuildFn | (() => TemplateBuildFn)>),
  target: string | Element | ShadowRoot = "#app",
): MountHandle {
  const container = isString(target) ? document.querySelector(target) : target;
  if (!container) throw new Error(`[dom] mount: target "${target}" not found in document`);

  return createMountHandle(container, node, (resolvedNode) => {
    // The handle unwraps only the outer wrapper — the flagged build arrives un-invoked.
    // It invokes through `resolveNode`'s flagged branch — the shared seam for the build
    // frame (creation-time overlay climbs see the container) and the componentScope
    // wiring (element roots on their own state; fragment roots on their first child).
    if (!isTemplateBuild(resolvedNode)) {
      throw new Error(
        "[dom] mount: hand-built HellaNode input is not supported — compile via the babel plugin or build imperatively via @hellajs/dom/runtime",
      );
    }
    pushBuildParent(container);
    const el = resolveNode(resolvedNode, container);
    popBuildParent();
    container.replaceChildren(el);
    registerContainer(container);
    // replaceChildren has already spread a fragment root's children — the container's live child set is the root set
    return Array.from(container.childNodes);
  });
}
