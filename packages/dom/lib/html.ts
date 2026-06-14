import type { HellaNode, HtmlPlaceholder, HtmlInternalNode } from "./types/nodes";
import { cloneWithValues, parseHTML } from "./internal/template";

const templateCache = new WeakMap<TemplateStringsArray, HtmlInternalNode>();

/**
 * Tagged template literal for creating HellaNode AST from HTML-like syntax.
 * Supports dynamic interpolations in attributes, text content, and children.
 * Automatically caches parsed AST using template strings array as key.
 * @param strings The static string parts of the template
 * @param values The interpolated values (signals, functions, or static values)
 * @returns A HellaNode or function that creates a HellaNode
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): HellaNode | (() => HellaNode) {
  const cached = templateCache.get(strings);
  if (cached)
    return cloneWithValues(cached, values) as HellaNode | (() => HellaNode);

  const parts: string[] = [];
  let i = 0;
  const len = strings.length;
  const vLen = values.length;

  while (i < len) {
    parts.push(strings[i]!);
    if (i < vLen) parts.push(`__SLOT_${i}__`);
    i++;
  }

  const placeholderMarkers: HtmlPlaceholder[] = [];
  i = 0;
  while (i < vLen) {
    placeholderMarkers.push({ __placeholder: i });
    i++;
  }

  const nodes = parseHTML(parts.join(""), placeholderMarkers);
  const ast = nodes.length === 1 ? nodes[0]! : { tag: '$', children: nodes };

  templateCache.set(strings, ast);

  return cloneWithValues(ast, values) as HellaNode | (() => HellaNode);
}
