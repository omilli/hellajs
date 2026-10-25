import type { MountHandle } from "./types/nodes";
import type { TemplateBuildFn } from "./runtime";
import { isString } from "./internal/core";
import { isTemplateBuild } from "./internal/utils";
import { resolveNode } from "./internal/render";
import { peekHydrateContext } from "./internal/hydrate";
import { hasDeferredRegions, startDeferredRegionWatch } from "./internal/deferred";
import { registerContainer } from "./internal/queue";
import { popBuildParent, pushBuildParent } from "./internal/state";
import { createMountHandle } from "./internal/handle";
import { adoptTemplateRoot } from "./internal/claims";
import { setForEachHydrateContextSource } from "./ForEach";
// The claim machinery registers into the adoption state's seam at its module init: importing
// `hydrate` is what loads it (the runtime's `adopting()`-guarded claim sites resolve the
// registered object — bundles that never import `hydrate` ship zero claim/adopt machinery).
// The namespaces feature loads with this module: fresh-build fallbacks (empty container,
// mismatch remount) may build svg/math. ForEach's adoption branches read the hydration context.
import "./features/namespaces";

// Registration at module init (the injection pattern): importing `hydrate`
// wires the hydration context peek into ForEach's adoption branches and installs the
// namespace-aware element creation.
setForEachHydrateContextSource(peekHydrateContext);

/**
 * Hydrates server-rendered HTML in place — re-executes the component tree and
 * attaches effects, event handlers, and state to the EXISTING DOM, never
 * replacing it (unlike [`mount`](./mount), which calls `replaceChildren`).
 *
 * Pass the SAME component build the server rendered; the target element's existing
 * children must be that `ssr()` output. Reactive state must initialize to the same
 * values the server rendered (drift surfaces as a mismatch). A flagged build fn (a
 * `target: "dom"` client build's `component()` result) adopts through the runtime's
 * construction calls: `template()`/`fragment()` claim the matching server nodes
 * (identity preserved — nothing is cloned), and `text`/`prop`/`on`/`child` wire onto
 * the claimed nodes; every dynamic region is marker-bounded (`<!--[->…<!--]-->`, emitted
 * by `ssr`). A claim with no matching server node, or server DOM no claim consumed,
 * is divergence. Hand-built HellaNode input is rejected: compile via the babel plugin
 * or build imperatively via `@hellajs/dom/runtime`.
 * @param node A flagged build fn — the same tree the server rendered.
 * @param target CSS selector string or Element whose existing children are the server output. Defaults to `"#app"`.
 * @returns A [`MountHandle`](#mounthandle) with `flush()` and `unmount()` methods.
 * @throws {Error} When target is a selector string that matches no element in the document.
 * @throws {Error} When `node` resolves to hand-built HellaNode input — the documented
 * `[dom] hydrate:` rejection — or when a flagged root's claims diverge from the server DOM:
 * `[dom] hydrate: unmatched server DOM for imperative root`.
 */
export function hydrate(
  node:
    | TemplateBuildFn
    | (() => TemplateBuildFn)
    | (() => Promise<TemplateBuildFn | (() => TemplateBuildFn)>),
  target: string | Element = "#app",
): MountHandle {
  const container = isString(target) ? document.querySelector(target) : target;
  if (!container) throw new Error(`[dom] hydrate: target "${target}" not found in document`);

  return createMountHandle(
    container,
    node,
    (resolvedNode) => {
      // The handle unwraps only the outer wrapper — a flagged build fn arrives AS the root,
      // un-invoked (the build must run inside the adoption context, not before it).
      let roots: Node[];
      if (!isTemplateBuild(resolvedNode)) {
        throw new Error(
          "[dom] hydrate: hand-built HellaNode input is not supported — compile via the babel plugin or build imperatively via @hellajs/dom/runtime",
        );
      }
      // Flagged imperative root: the construction calls ADOPT the server DOM (create-vs-adopt
      // selected by the adoption context, one compiled output). An empty container mounts
      // fresh through the same create arms. The scope wiring and build frame are resolveNode's
      // flagged branch — the shared seam, not a parallel path.
      if (!container.hasChildNodes()) {
        pushBuildParent(container);
        const el = resolveNode(resolvedNode, container);
        popBuildParent();
        container.replaceChildren(el);
        roots = Array.from(container.childNodes);
      } else {
        adoptTemplateRoot(container, () => resolveNode(resolvedNode, container));
        roots = Array.from(container.childNodes);
      }
      registerContainer(container);
      return roots;
    },
    () => {
      if (hasDeferredRegions()) startDeferredRegionWatch(container); // selective hydration: watch for late <Suspense> stages + replay events
    },
  );
}
