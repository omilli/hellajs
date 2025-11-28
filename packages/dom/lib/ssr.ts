import type { HellaNode, HellaChild, HellaForEach, ForEachProps } from "./types";
import { isFunction, isHellaNode, normalizeTextValue, resolveValue } from "./internal";

/** Void/self-closing HTML elements */
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr"
]);

/** HTML entity escape mapping */
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/** Escape regex pattern */
const ESCAPE_REGEX = /[&<>"']/g;

/**
 * Escapes HTML special characters to prevent XSS.
 * @param str The string to escape
 * @returns Escaped string safe for HTML output
 */
const escapeHtml = (str: string): string =>
  str.replace(ESCAPE_REGEX, c => ESCAPE_MAP[c]);

/**
 * Renders a ForEach component to HTML string for SSR.
 * Internal helper called by renderChildren.
 * @param props ForEach props with each, use, and fallback
 * @returns HTML string of rendered list items
 */
function renderForEachToString<T>(props: ForEachProps<T>): string {
  const { each, use, fallback } = props;
  const arr: T[] = isFunction(each) ? each() : (each as T[]) || [];

  if (arr.length === 0) {
    if (!fallback) return "";
    const resolved = isFunction(fallback) ? fallback() : fallback;
    return renderNode(resolved as HellaNode);
  }

  const parts: string[] = [];
  let i = 0, len = arr.length;

  while (i < len) {
    parts.push(renderNode(use(arr[i], i) as HellaNode));
    i++;
  }

  return parts.join("");
}

/**
 * Renders a HellaNode tree to an HTML string.
 * Evaluates signals/functions once at render time (no reactivity).
 * Skips event handlers and lifecycle hooks (client-only).
 * @param node The HellaNode or component function to render
 * @returns HTML string representation
 */
export function ssr(node: HellaNode | (() => HellaNode)): string {
  const resolved = isFunction(node) ? node() : node;
  return renderNode(resolved);
}

/**
 * Renders a single HellaNode to HTML string.
 * @param node The HellaNode to render
 * @returns HTML string
 */
function renderNode(node: HellaNode): string {
  const { tag, props, bind, children } = node;

  // Fragment - render children only
  if (tag === "$") return renderChildren(children);

  // Merge props and resolved bind values
  const allProps: Record<string, unknown> = {};

  if (props)
    for (const key in props) allProps[key] = props[key];

  const attrs = renderAttributes(allProps);
  const tagName = tag as string;

  // Void elements (self-closing)
  if (VOID_TAGS.has(tagName)) return `<${tagName}${attrs}>`;

  return `<${tagName}${attrs}>${renderChildren(children)}</${tagName}>`;
}

/**
 * Renders attributes object to HTML attribute string.
 * @param props The props/attributes object
 * @returns Formatted attribute string with leading space
 */
function renderAttributes(props: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const key in props) {
    const value = resolveValue(props[key]);

    // Skip false/null/undefined
    if (value === false || value == null) continue;

    // Boolean true = attribute with no value
    if (value === true) {
      parts.push(` ${key}`);
      continue;
    }

    // Array values joined with space (class names)
    const strValue = Array.isArray(value)
      ? value.filter(Boolean).join(" ")
      : String(value);

    parts.push(` ${key}="${escapeHtml(strValue)}"`);
  }

  return parts.join("");
}

/**
 * Renders children array to HTML string.
 * @param children The children to render
 * @returns Concatenated HTML string
 */
function renderChildren(children: HellaChild[] | undefined): string {
  if (!children || children.length === 0) return "";

  const parts: string[] = [];
  let i = 0, len = children.length;

  while (i < len) {
    const child = children[i++];

    if (isFunction(child)) {
      const fnChild = child as HellaForEach & { __props?: ForEachProps<unknown> };

      // ForEach component with SSR support
      if (fnChild.isForEach && fnChild.__props) {
        parts.push(renderForEachToString(fnChild.__props));
        continue;
      }

      // Portal - skip on server
      if ((child as { isPortal?: boolean }).isPortal) continue;

      // Dynamic text/node function
      const resolved = child();
      parts.push(
        isHellaNode(resolved)
          ? renderNode(resolved)
          : escapeHtml(normalizeTextValue(resolved))
      );
      continue;
    }

    if (isHellaNode(child)) {
      parts.push(renderNode(child));
      continue;
    }

    // Primitive text
    parts.push(escapeHtml(normalizeTextValue(child)));
  }

  return parts.join("");
}
