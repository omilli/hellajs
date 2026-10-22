import { isFunction, isPlainObject, isObject, isFalsy, isString } from "./core";
import { getState, peekState, registerOverlay } from "./state";
import { traverseDescendants } from "./cleanup";
import type { HellaNode, HellaElement, RenderFn, ElementHooks, ErrorConfig } from "../types/nodes";

/**
 * @internal
 * Checks if a value is a HellaNode (virtual DOM element).
 * Hot-path discriminator: avoids the `isPlainObject` toString/proto cost.
 * HellaNodes are plain object literals produced by the babel plugin / template
 * parser; DOM Nodes (which expose `tagName`, not `tag`) and primitives are
 * rejected by the `tag` own-property check.
 * @param value The value to check
 * @returns True if the value is a HellaNode
 */
export function isHellaNode(value: unknown): value is HellaNode {
  return isObject(value) && (value as HellaNode).tag !== undefined;
}

/**
 * @internal
 * Normalizes an already-resolved value for text rendering.
 * Converts false, null, and undefined to empty string. Assumes the caller has
 * already invoked any function/signal getter — use {@link resolveText} when the
 * input may still be a function.
 * @param value The resolved value to normalize
 * @returns The normalized string value
 */
export function toText(value: unknown): string {
  return isFalsy(value) ? "" : `${value}`;
}

/**
 * @internal
 * Resolves a value (calling it if a function) and normalizes for text rendering.
 * Converts false, null, and undefined to empty string.
 * @param value The value to normalize (function or resolved value)
 * @returns The normalized string value
 */
export function resolveText(value: unknown): string {
  return toText(resolveValue(value));
}

/**
 * @internal
 * Renders a property/attribute to a DOM element.
 * Handles array values by joining with spaces (useful for CSS classes).
 * Removes attribute when value is false/null/undefined, sets empty string for true.
 * Plain-object `style` values serialize to kebab-case declarations; props on custom
 * elements (hyphenated tag + key present on the element) assign the raw value to
 * the element property instead of stringifying through setAttribute.
 * The `key` prop is reconciliation metadata (ForEach reads it from vnode props) and
 * never renders as an attribute.
 * @param element The DOM element to set the property on
 * @param key The property/attribute key name
 * @param value The value to set
 */
export function renderProp(element: HellaElement, key: string, value: unknown) {
  if (key === "key") return;
  const isFalsyVal = isFalsy(value);
  if (key === "value" || key === "checked" || key === "selected" || key === "innerHTML") {
    (element as unknown as Record<string, unknown>)[key] = isFalsyVal ? "" : value;
    return;
  }
  if (isFalsyVal) {
    element.removeAttribute(key);
    return;
  }
  if (key === "class" && isString(value) && element instanceof HTMLElement) {
    // Hottest reactive prop: the className setter is spec-equivalent to
    // setAttribute("class", …) for string values on HTML elements. The string guard
    // keeps arrays (space-joined), `true` (empty attribute), and SVG elements —
    // className is a readonly SVGAnimatedString accessor there in some engines — on
    // the generic paths below.
    element.className = value;
    return;
  }
  if (key === "style" && isPlainObject(value)) {
    const entries = Object.entries(value);
    let i = 0;
    const len = entries.length;
    const declarations: string[] = [];
    while (i < len) {
      const [prop, val] = entries[i]!;
      // falsy declarations drop (e.g. background: null clears the rule) — no auto-px on numbers
      if (val) {
        declarations.push(`${prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${val}`);
      }
      i++;
    }
    element.setAttribute("style", declarations.join("; "));
    return;
  }
  if (element.tagName.includes("-") && key in element) {
    // `in` (not hasOwn) is deliberate: custom-element props live on the prototype
    // (getters/setters) as often as on the instance. Standard elements never carry
    // hyphenated tag names, so this gate cannot reach them.
    (element as unknown as Record<string, unknown>)[key] = value;
    return;
  }
  if (Array.isArray(value)) {
    element.setAttribute(key, value.filter(Boolean).join(" "));
    return;
  }
  if (value === true) {
    element.setAttribute(key, "");
    return;
  }
  element.setAttribute(key, value as string);
}

/**
 * @internal
 * Effective buckets for one vnode after prefixed-prop routing — prefixed keys sliced
 * out of props, routed values merged over on/e/hooks/error. Shared with the routed-props
 * feature, whose registered implementation must match this seam's shape.
 */
export interface RoutedBuckets {
  props: Record<string, unknown> | undefined;
  on: Record<string, unknown> | undefined;
  e: Record<string, unknown> | undefined;
  hooks: Partial<ElementHooks> | undefined;
  error: ErrorConfig | undefined;
}

/**
 * @internal
 * Routes a vnode's props through prefixed-key slicing. The default (routed-props
 * feature not loaded) is the identity pass-through — colon-free props, today's fast
 * path; colon-carrying props from hand-built vnodes need the documented
 * `import "@hellajs/dom/features/routed-props"` escape hatch.
 *
 * Exported `let` is deliberate: the feature swaps the implementation at module init
 * through {@link setRoutedPropsResolver} (the `setMountNode` injection pattern) while
 * every importer keeps the live binding. The helper runs once per element render.
 * @param props The vnode's props record
 * @param on The vnode's delegated-events bucket
 * @param e The vnode's direct-events bucket
 * @param hooks The vnode's lifecycle-hooks bucket
 * @param error The vnode's error-config bucket
 * @returns Effective buckets — prefixed keys sliced out of props, routed values merged over on/e/hooks/error
 */
export let routePrefixedProps: (
  props: Record<string, unknown> | undefined,
  on: Record<string, unknown> | undefined,
  e: Record<string, unknown> | undefined,
  hooks: Partial<ElementHooks> | undefined,
  error: ErrorConfig | undefined,
) => RoutedBuckets = (props, on, e, hooks, error) => ({ props, on, e, hooks, error });

/**
 * @internal
 * Whether the routed-props feature has registered its resolver — `mountNode` skips the
 * {@link routePrefixedProps} seam call (and its live-binding indirection) entirely on
 * feature-free bundles.
 * Exported `let` is deliberate: flipped once at module init through
 * {@link setRoutedPropsResolver} (the `setMountNode` injection pattern) while every
 * importer keeps the live binding.
 */
export let routedPropsActive = false;

/**
 * @internal
 * Registers the routed-props feature's resolver (the `setMountNode` injection pattern —
 * the implementation lives in `lib/features/routed-props.ts` so unused prefixed-prop
 * routing tree-shakes out of bundles that never forward prefixed attrs to components).
 * @param resolver The routed-props implementation
 */
export function setRoutedPropsResolver(resolver: typeof routePrefixedProps): void {
  routePrefixedProps = resolver;
  routedPropsActive = true;
}

/**
 * @internal
 * Chains two component-scope dispose functions into one. Two components can
 * legitimately own a single node (a component returning another component's
 * result; a fragment root's scope riding one of its children), and `clean()` calls
 * one `componentScope` per state, so the chain must live inside it.
 * @param prev The scope already on the node, or undefined
 * @param next The scope to append
 * @returns The combined dispose function
 */
export function chainScopes(prev: (() => void) | undefined, next: () => void): () => void {
  return prev
    ? () => {
        prev();
        next();
      }
    : next;
}

/**
 * @internal
 * Wires a fragment's `componentScope` onto the carrier node the caller designates,
 * skipping forward past leading `[`/`]` region-marker comments up to `bound`, and
 * chaining onto any scope the node already carries; no such node → dispose
 * (nothing mounted owns the scope — an empty fragment has no DOM lifetime).
 * The stable carrier is site-specific: mount-side anchors trail their content, so
 * the mount paths pass the fragment's last child; hydrate-side anchors lead their
 * region (inserted at the open marker), so the hydrate paths pass the re-derived
 * first region node after their recursion has consumed the inner markers.
 * @param start The designated carrier node (mount: the fragment's last child; hydrate: the first region node)
 * @param bound The node that ends the region (exclusive), or null for no bound
 * @param scope The fragment's componentScope dispose
 */
export function wireFragmentScope(start: Node | null, bound: Node | null, scope: () => void): void {
  let node = start;
  while (
    node &&
    node !== bound &&
    node.nodeType === Node.COMMENT_NODE &&
    (node.nodeValue === "[" || node.nodeValue === "]")
  ) {
    node = node.nextSibling;
  }
  if (node && node !== bound) {
    // Every call site wires after the carrier's subtree rendered/adopted — when the carrier had
    // no state, its state-carrying descendants registered nowhere at their creation (the
    // ancestor did not exist yet, often while the fragment was detached). Registering them now
    // keeps the cleanup overlay complete; only stateless carriers take the walk.
    const existing = peekState(node);
    const state = existing ?? getState(node);
    if (!existing) {
      traverseDescendants(node, (descendant) => {
        if (descendant === node) return;
        const descendantState = peekState(descendant);
        if (descendantState) registerOverlay(descendant, descendantState);
      });
    }
    state.componentScope = chainScopes(state.componentScope, scope);
  } else {
    scope();
  }
}

/**
 * @internal
 * Resolves a value by executing it if it's a function, otherwise returns as-is.
 * @param value The value to resolve
 * @returns The resolved value
 */
export function resolveValue(value: unknown): unknown {
  return isFunction(value) ? value() : value;
}

/**
 * @internal
 * Resolves a value by repeatedly calling plain (non-`isDynamic`) functions until a non-function
 * or an `isDynamic` render function remains — reactive child chains (`() => () => nodes`, a
 * component slot forwarding `${() => props.children}`) classify by their final value. A
 * self-referential getter loops forever, the same user bug as a self-referencing computed.
 * @param value The value to resolve
 * @returns The chain-final non-function value, or the `isDynamic` function that stopped the chain
 */
export function resolveDeep(value: unknown): unknown {
  let current = value;
  while (isFunction(current) && !(current as RenderFn).isDynamic) {
    current = (current as () => unknown)();
  }
  return current;
}
