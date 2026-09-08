import type {
  HellaNode,
  HellaChild,
  ElementHooks,
  ErrorConfig,
  ComponentFn,
  RenderFn
} from "../types/nodes";
import { isFunction, isObject, isString } from "./core";
import { component } from "../component";

/**
 * Internal marker for placeholder substitution during template parsing.
 * @internal
 */
export interface HtmlPlaceholder {
  placeholder: number;
}

/**
 * Internal marker for dynamic component resolution during template parsing.
 * @internal
 */
export interface HtmlDynamicComponent {
  dynamicComponent: number;
  props: Record<string, unknown>;
  children: HellaChild[];
}

/**
 * Internal node type used during template parsing (before value substitution).
 * @internal
 */
export type HtmlInternalNode = HellaNode | HtmlPlaceholder | HtmlDynamicComponent;

/**
 * Mutable node type during parsing (before finalization).
 * @internal
 */
export type HtmlParsedNode = HtmlDynamicComponent | (HellaNode & { children: HellaChild[] });

/**
 * Parsed attributes categorized by type (props, hooks, on, e, error).
 * @internal
 */
export interface HtmlParsedAttrs {
  props: Record<string, unknown>;
  hooks?: Partial<ElementHooks>;
  on?: Record<string, EventListener>;
  e?: Record<string, EventListener>;
  error?: ErrorConfig;
}

const TOKEN_REGEX = /<(\/)?([\w-]+)([^>]*?)(\s*\/)?>|([^<]+)/g;
// HTML void elements: parsed as leaf nodes, never pushed to the nesting stack
// (mirrors VOID_TAGS in plugins/babel/src/constants.mjs — the plugin has no
// runtime deps, so the parity corpus guards the drift)
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr"
]);
const PLACEHOLDER_REGEX = /__SLOT_(\d+)__/g;
const SKIP_REGEX = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<!\[CDATA\[[\s\S]*?\]\]>/gi;
const ATTR_REGEX = /(error:[\w-]+|e:[\w-]+|on:[\w-]+|hook:[\w-]+|[\w-]+)(?:=(?:"([^"]*?)"|'([^']*?)'|(__SLOT_\d+__)|([^\s>]+)))?/g;

/**
 * @internal
 * Deep clones HellaNode AST and substitutes placeholder markers with actual values.
 * Handles special markers: placeholder, dynamicComponent. Mixed-attribute parts
 * arrays in `props` concatenate into a single string (mirrors the babel plugin's
 * `+` concatenation of the same template).
 * @param node The AST node to clone
 * @param values Array of interpolated values from the template
 * @returns Cloned node with values substituted
 */
export function cloneWithValues(node: unknown, values: unknown[]): unknown {
  if (!isObject(node)) return node;

  if (Object.hasOwn(node, "static")) return node;

  if (Object.hasOwn(node, "placeholder"))
    return values[(node as HtmlPlaceholder).placeholder];

  if (Array.isArray(node)) {
    const result: unknown[] = [];
    let i = 0;
    const len = node.length;
    while (i < len) {
      result.push(cloneWithValues(node[i], values));
      i++;
    }
    return result;
  }

  if (Object.hasOwn(node, "dynamicComponent")) {
    const marker = node as HtmlDynamicComponent;
    const componentFn = values[marker.dynamicComponent];
    if (!isFunction(componentFn)) return node;

    const resolvedProps: Record<string, unknown> = {};
    const propsKeys = Object.keys(marker.props);
    let ki = 0;
    const kLen = propsKeys.length;
    while (ki < kLen) {
      const key = propsKeys[ki++]!;
      resolvedProps[key] = cloneWithValues(marker.props[key], values);
    }

    if (marker.children && marker.children.length > 0) {
      const children = cloneWithValues(marker.children, values);
      resolvedProps.children = Array.isArray(children) && children.length === 1 ? children[0] : children;
    }

    return (componentFn as RenderFn).isDynamic
      ? (componentFn as ComponentFn)(resolvedProps)
      : component(componentFn as ComponentFn, resolvedProps);
  }

  if (!Object.hasOwn(node, "tag")) return node;

  const hellaNode = node as HellaNode;
  const cloned: Partial<HellaNode> = { tag: hellaNode.tag };

  if (hellaNode.props) {
    const props = {} as typeof hellaNode.props;
    const keys = Object.keys(hellaNode.props);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i++]!;
      const raw = hellaNode.props[key];
      // A cached array prop is always a mixed-attribute parts array: concatenate
      // the cloned parts so the value matches the compiled template's output.
      props[key] = (Array.isArray(raw)
        ? concatParts(cloneWithValues(raw, values) as unknown[])
        : cloneWithValues(raw, values)) as typeof hellaNode.props[string];
    }
    cloned.props = props;
  }

  if (hellaNode.on) {
    const on: Record<string, unknown> = {};
    const keys = Object.keys(hellaNode.on);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i++]!;
      on[key] = cloneWithValues(hellaNode.on[key], values);
    }
    cloned.on = on as Record<string, EventListener>;
  }

  if (hellaNode.e) {
    const e: Record<string, unknown> = {};
    const keys = Object.keys(hellaNode.e);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i++]!;
      e[key] = cloneWithValues(hellaNode.e[key], values);
    }
    cloned.e = e as Record<string, EventListener>;
  }

  if (hellaNode.hooks) {
    const hooks = {} as ElementHooks;
    const keys = Object.keys(hellaNode.hooks);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i++]!;
      hooks[key as keyof ElementHooks] = cloneWithValues(hellaNode.hooks[key as keyof ElementHooks], values) as ElementHooks[keyof ElementHooks];
    }
    cloned.hooks = hooks;
  }

  if (hellaNode.error) {
    const error: Record<string, unknown> = {};
    const keys = Object.keys(hellaNode.error);
    let i = 0;
    const len = keys.length;
    while (i < len) {
      const key = keys[i++]!;
      error[key] = cloneWithValues(hellaNode.error[key as "fallback" | "category"], values);
    }
    cloned.error = error as { fallback?: (error: Error) => HellaNode; category?: string };
  }

  if (hellaNode.children) {
    const children = cloneWithValues(hellaNode.children, values) as HellaChild[];
    let needsFlat = false;
    let fi = 0;
    const fLen = children.length;
    while (fi < fLen) {
      if (Array.isArray(children[fi])) { needsFlat = true; break; }
      fi++;
    }
    cloned.children = needsFlat ? children.flat() : children;
  }

  return cloned as HellaNode;
}

/**
 * Joins a cloned mixed-attribute parts array into a single string with no
 * separator, mirroring the babel plugin's binary `+` concatenation of the same
 * template. `String()` coercion matches `+` semantics exactly.
 * @param parts Cloned parts (strings and resolved interpolation values)
 * @returns The concatenated attribute value
 */
function concatParts(parts: unknown[]): string {
  let result = "";
  let i = 0;
  const len = parts.length;
  while (i < len) {
    result += String(parts[i++]!);
  }
  return result;
}

/**
 * Appends a child to a parsed node, initializing the children array if needed.
 * @param node The parent node to append to
 * @param child The child value to append
 */
function appendChild(node: HtmlParsedNode, child: unknown): void {
  (node.children ||= []).push(child as HellaChild);
}

/**
 * @internal
 * Parses HTML string into HellaNode AST using regex-based tokenization.
 * Handles tags, attributes, text content, and placeholder substitution.
 * Void elements parse as leaf nodes; a closing tag closes its nearest matching
 * open ancestor (implicitly closing anything above it); stray closers with no
 * matching ancestor are dropped. Unclosed elements auto-close at end of
 * template: children were appended to their open parent at open time, so only
 * the outermost unclosed node becomes a root.
 * @param html The HTML string to parse
 * @param placeholders Array of placeholder markers for value substitution
 * @returns Array of parsed AST nodes
 */
export function parseHTML(html: string, placeholders: HtmlPlaceholder[]): HtmlInternalNode[] {
  const cleaned = html
    .replace(SKIP_REGEX, "")
    .replace(/<>/g, "<__fragment__>")
    .replace(/<\/>/g, "</__fragment__>");
  const trimmed = cleaned.trim();

  if (trimmed.startsWith("__SLOT_") && trimmed.endsWith("__")) {
    PLACEHOLDER_REGEX.lastIndex = 0;
    const match = PLACEHOLDER_REGEX.exec(trimmed);
    return [placeholders[match ? parseInt(match[1]!) : 0]!];
  }

  const result: HtmlInternalNode[] = [];
  const stack: HtmlParsedNode[] = [];
  let current: HtmlParsedNode | null = null;

  TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(cleaned)) !== null) {
    const isClosing = match[1];
    const tagName = match[2] === "__fragment__" ? "$" : match[2];
    const attrsStr = match[3];
    const isSelfClosing = match[4];
    const textContent = match[5];

    if (textContent) {
      const children = parseTextContent(textContent.trim(), placeholders);
      let i = 0;
      const childLen = children.length;

      if (current) {
        while (i < childLen) appendChild(current, children[i++]!);
      } else {
        while (i < childLen) {
          const child = children[i++]!;
          const t = typeof child;
          result.push(t === "string" || t === "number" || t === "function"
            ? { tag: "$", children: [child] }
            : child as HtmlInternalNode);
        }
      }
    } else if (isClosing) {
      // Close the nearest open ancestor with a matching tag (implicitly closing
      // everything above it); a closer with no matching open element is stray
      // and dropped. Dynamic-component closers (</__SLOT_N__>) match the
      // nearest open dynamic component: the open and close markers are distinct
      // expressions, so their indices never agree.
      const isSlotCloser = /^__SLOT_\d+__$/.test(tagName ?? "");
      let k = stack.length - 1;
      while (k >= 0) {
        const open = stack[k]!;
        const isDynamic = "dynamicComponent" in open;
        if (isSlotCloser ? isDynamic : !isDynamic && open.tag === tagName) break;
        k--;
      }

      if (k >= 0) {
        const completed = stack[k]!;
        stack.length = k;
        if (k === 0) {
          result.push(completed);
          current = null;
        } else {
          current = stack[k - 1] ?? null;
        }
      }
    } else {
      const isDynamicComponent = tagName!.startsWith("__SLOT_");
      const attrs = parseAttributes(attrsStr!, placeholders);

      const node: HtmlParsedNode = isDynamicComponent
        ? {
          dynamicComponent: parseInt(tagName!.slice(7, -2)),
          props: { ...attrs.props, ...attrs.on, ...attrs.e, ...attrs.hooks },
          children: []
        }
        : {
          tag: tagName!,
          props: attrs.props,
          children: [],
          ...(attrs.on && { on: attrs.on }),
          ...(attrs.e && { e: attrs.e }),
          ...(attrs.hooks && { hooks: attrs.hooks }),
          ...(attrs.error && { error: attrs.error })
        } as HellaNode & { children: HellaChild[] };

      // Void elements never push to the stack: they are leaf nodes whose
      // following content is a sibling, not a child.
      if (isSelfClosing || VOID_TAGS.has(tagName!)) {
        if (current) {
          appendChild(current, node);
        } else {
          result.push(node);
        }
      } else {
        if (current) appendChild(current, node);
        stack.push(node);
        current = node;
      }
    }
  }

  if (stack.length > 0) result.push(stack[0]!);

  markStaticSubtrees(result as HtmlInternalNode[]);

  return result;
}

/**
 * @internal
 * Recursively marks AST nodes with zero placeholder dependencies as static.
 * Static subtrees are shared across template invocations instead of deep-cloned.
 */
function markStaticSubtrees(nodes: HtmlInternalNode[]): void {
  let i = 0;
  const len = nodes.length;
  while (i < len) {
    markIfStatic(nodes[i++]!);
  }
}

/**
 * Recursively determines whether a node (and its whole subtree) is free of placeholder
 * dependencies — tagging it `static` when so. Drives `markStaticSubtrees`.
 */
function markIfStatic(node: unknown): boolean {
  if (!isObject(node)) return true;

  if (Object.hasOwn(node, "placeholder") || Object.hasOwn(node, "dynamicComponent"))
    return false;

  if (!Object.hasOwn(node, "tag")) return true;

  const n = node as HellaNode;

  const fields: Array<keyof HellaNode> = ["props", "on", "e", "hooks", "error"];
  let fi = 0;
  const fLen = fields.length;
  while (fi < fLen) {
    const val = n[fields[fi]!];
    if (isObject(val)) {
      const keys = Object.keys(val);
      let ki = 0;
      const kLen = keys.length;
      while (ki < kLen) {
        const v = (val as Record<string, unknown>)[keys[ki]!];
        if (Array.isArray(v)) {
          // mixed-attribute parts arrays: any marker element is a placeholder dep
          if (v.some((el) => isObject(el) && Object.hasOwn(el, "placeholder"))) return false;
        } else if (isObject(v) && Object.hasOwn(v, "placeholder")) {
          return false;
        }
        ki++;
      }
    }
    fi++;
  }

  if (n.children) {
    let ci = 0;
    const cLen = n.children.length;
    while (ci < cLen) {
      if (!markIfStatic(n.children[ci++]! as HtmlInternalNode)) return false;
    }
  }

  (n as Record<string, true>).static = true;
  return true;
}

/**
 * Parses text content and extracts placeholders for value substitution.
 * @param text The text content to parse
 * @param placeholders Array of placeholder markers
 * @returns Array of text fragments and placeholder markers
 */
function parseTextContent(text: string, placeholders: HtmlPlaceholder[]): unknown[] {
  if (!text) return [];
  if (!text.includes("__SLOT_")) return [text];

  const parts: unknown[] = [];
  PLACEHOLDER_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(placeholders[parseInt(match[1]!)]!);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts;
}

/**
 * Resolves a raw attribute value against placeholders. An exact single slot keeps
 * the bare marker fast path; mixed content splits into a parts array (strings +
 * markers), mirroring the babel parser's shape; anything else is the literal string.
 * @param text The raw attribute value text
 * @param placeholders Array of placeholder markers
 * @returns Marker object, parts array, or the literal string
 */
function parseAttrValue(text: string, placeholders: HtmlPlaceholder[]): unknown {
  const slotMatch = text.match(/^__SLOT_(\d+)__$/);
  if (slotMatch) return placeholders[parseInt(slotMatch[1]!)];
  if (!text.includes("__SLOT_")) return text;
  const parts = parseTextContent(text, placeholders);
  return parts.length === 1 && isString(parts[0]) ? parts[0] : parts;
}

/**
 * Parses attribute string and categorizes into props, hooks, on, e, and error objects.
 * Recognizes prefixes: error:, on:, hook:, e:.
 * @param attrsStr The attributes string from the HTML tag
 * @param placeholders Array of placeholder markers
 * @returns Object with categorized attributes
 */
function parseAttributes(attrsStr: string, placeholders: HtmlPlaceholder[]): HtmlParsedAttrs {
  const result: HtmlParsedAttrs = { props: {} };
  const trimmed = attrsStr?.trim();
  if (!trimmed) return result;

  ATTR_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ATTR_REGEX.exec(trimmed)) !== null) {
    const name = match[1]!;
    const doubleQuoted = match[2];
    const singleQuoted = match[3];
    const placeholder = match[4];
    const unquoted = match[5];

    let value: unknown;
    if (placeholder) {
      value = placeholders[parseInt(placeholder.slice(7, -2))];
    } else if (doubleQuoted !== undefined) {
      value = parseAttrValue(doubleQuoted, placeholders);
    } else if (singleQuoted !== undefined) {
      value = parseAttrValue(singleQuoted, placeholders);
    } else if (unquoted !== undefined) {
      value = parseAttrValue(unquoted, placeholders);
    } else {
      value = true;
    }

    if (name.startsWith("error:")) {
      const errorKey = name.slice(6) as "fallback" | "category" | "boundary";
      const errorConfig = result.error ||= {};
      (errorConfig as Record<string, unknown>)[errorKey] = value;
    } else if (name.startsWith("hook:")) {
      (result.hooks ||= {})[name.slice(5) as keyof ElementHooks] = value as () => void;
    } else if (name.startsWith("e:")) {
      (result.e ||= {})[name.slice(2)] = value as EventListener;
    } else if (name.startsWith("on:")) {
      (result.on ||= {})[name.slice(3)] = value as EventListener;
    } else {
      result.props![name] = value;
    }
  }

  return result;
}
