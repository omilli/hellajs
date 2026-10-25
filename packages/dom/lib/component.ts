import { hasDocument, isFunction, scope } from "./internal/core";
import { dispatchError, toError } from "./internal/dispatch";
import { chainScopes } from "./internal/utils";
import { mark } from "./runtime";
import type { ComponentReturn, RenderFn } from "./types/nodes";
import type { TemplateBuildFn } from "./runtime";

/**
 * Wraps a component function with automatic scope management.
 * Creates a disposal scope that cleans up effects when the component unmounts.
 * Catches render errors and dispatches them through the error handling system.
 * @param fn The component function to wrap
 * @param props Props to pass to the component function
 * @returns The component's build result (HellaNode on the server target, flagged build fn
 * on a dom-target client) with the scope dispose attached — or an empty build on error
 * (flagged empty-fragment build when a DOM document exists, the `$` vnode otherwise, so
 * the server pipeline keeps consuming HellaNode).
 */
export function component<P extends Record<string, unknown>>(
  fn: (props: P) => ComponentReturn,
  props: P,
): ComponentReturn {
  let result!: ComponentReturn;
  try {
    const dispose = scope(() => (result = fn(props)));
    // A meta-component result (ForEach/Portal/Lazy/Transition/Suspense) is an isDynamic
    // render fn — return it verbatim with the scope chained on (the region anchor wires
    // it); forcing the template flag would hijack the isDynamic dispatch into the build
    // path, invoking the render fn with no parent. A plain function result is a compiled
    // template build: flag it, chain the scope onto the fn (the mount paths wire
    // `componentScope` onto the constructed root at invoke time), and return the flagged
    // fn as the wrapper result. HellaNode results keep the path below.
    if (isFunction(result)) {
      if ((result as unknown as RenderFn).isDynamic) {
        const render = result as unknown as RenderFn & { componentScope?: () => void };
        render.componentScope = chainScopes(render.componentScope, dispose);
        return render as unknown as ComponentReturn;
      }
      const build = result as unknown as TemplateBuildFn;
      build.isTemplate = true;
      build.componentScope = chainScopes(build.componentScope, dispose);
      return build;
    }
    // A `static` root is shared by reference across invocations of the same template
    // (cloneWithValues returns it as-is) — wrap it so each instance carries its own
    // componentScope instead of mutating the shared node (last call would win).
    if (result.static) result = { ...result };
    // The spread (static root) or a direct return of another component's wrapper can
    // carry an inner component's scope — chain onto it, never overwrite.
    result.componentScope = chainScopes(result.componentScope, dispose);
  } catch (e) {
    dispatchError(toError(e), { phase: "render" });
    // Environment-probed empty result: `component()` is isomorphic runtime. On the client
    // (a document exists) the flagged empty-fragment build is the client-correct currency;
    // the `$` vnode is server-correct — a flagged fn would crash `ssr`'s walker.
    if (hasDocument()) {
      // The empty-fragment root: resolveNode's flagged branch routes fragment roots through
      // wireFragmentScope (nothing mounted owns the scope — disposed immediately), so the
      // Element-typed signature is safe to satisfy with the fragment.
      return mark(() => document.createDocumentFragment() as unknown as Element);
    }
    return { tag: "$", children: [] };
  }
  return result;
}
