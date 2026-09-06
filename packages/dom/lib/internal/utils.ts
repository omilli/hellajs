import { isFunction, isPlainObject, isObject, isFalsy } from "./core";
import { getState } from "./state";
import type { HellaNode, HellaElement } from "../types/nodes";

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
 * @param element The DOM element to set the property on
 * @param key The property/attribute key name
 * @param value The value to set
 */
export function renderProp(element: HellaElement, key: string, value: unknown) {
  const isFalsyVal = isFalsy(value);
  if (key === "value" || key === "checked" || key === "selected" || key === "innerHTML") {
    (element as unknown as Record<string, unknown>)[key] = isFalsyVal ? "" : value;
    return;
  }
  if (isFalsyVal) {
    element.removeAttribute(key);
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
 * Chains two component-scope dispose functions into one. Two components can
 * legitimately own a single node (a component returning another component's
 * result; a fragment root's scope riding its first child), and `clean()` calls
 * one `componentScope` per state, so the chain must live inside it.
 * @param prev The scope already on the node, or undefined
 * @param next The scope to append
 * @returns The combined dispose function
 */
export function chainScopes(prev: (() => void) | undefined, next: () => void): () => void {
  return prev ? () => { prev(); next(); } : next;
}

/**
 * @internal
 * Wires a fragment's `componentScope` onto its first child that survives marker
 * consumption, chaining onto any scope the node already carries; no such node
 * → dispose (nothing mounted owns the scope — an empty fragment has no DOM
 * lifetime). Leading `[`/`]` region-marker comments are skipped up to `bound`
 * (hydrate's region close marker; null on the mount side, where fresh fragments
 * carry no markers, and for a hydrate fragment root, whose container has no
 * root-level markers — a fragment whose first child is a nested fragment region
 * starts at that child's open marker, which the walk itself removes later).
 * @param start The fragment's first node
 * @param bound The node that ends the region (exclusive), or null for no bound
 * @param scope The fragment's componentScope dispose
 */
export function wireFragmentScope(start: Node | null, bound: Node | null, scope: () => void): void {
  let node = start;
  while (node && node !== bound && node.nodeType === Node.COMMENT_NODE &&
    (node.nodeValue === "[" || node.nodeValue === "]")) {
    node = node.nextSibling;
  }
  if (node && node !== bound) {
    const state = getState(node);
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
