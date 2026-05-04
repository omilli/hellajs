import type {
  HellaNode,
  HellaChild,
  ElementHooks,
  HellaPrimitive,
  HtmlPlaceholder,
  HtmlDynamicComponent,
  HtmlInternalNode,
  HtmlParsedNode,
  ComponentFn,
  HtmlParsedAttrs,
  RenderFn
} from "./types/nodes.d.ts";
import { component } from "./component";

// Global cache for all html`` templates (keyed by template strings array)
const templateCache = new WeakMap<TemplateStringsArray, HtmlInternalNode>();

// Cached regex patterns for performance
const TOKEN_REGEX = /<(\/)?([\w-]+)([^>]*?)(\s*\/)?>|([^<]+)/g;
const PLACEHOLDER_REGEX = /__SLOT_(\d+)__/g;
const ATTR_REGEX = /(error:[\w-]+|e:[\w-]+|on:[\w-]+|bind:[\w-]+|hook:[\w-]+|[\w-]+)(?:=(?:"([^"]*?)"|(__SLOT_\d+__)))?/g;

/**
 * Tagged template literal for creating HellaNode AST from HTML-like syntax.
 * Supports dynamic interpolations in attributes, text content, and children.
 * Automatically caches parsed AST using template strings array as key.
 * @param strings The static string parts of the template
 * @param values The interpolated values (signals, functions, or static values)
 * @returns A HellaNode or function that creates a HellaNode
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): HellaNode | (() => HellaNode) {
  // Check global cache first
  const cached = templateCache.get(strings);
  if (cached)
    return cloneWithValues(cached, values) as HellaNode | (() => HellaNode);

  // Build HTML string with placeholder markers using array join (faster than +=)
  const parts: string[] = [];
  let i = 0, len = strings.length, vlen = values.length;

  while (i < len) {
    parts.push(strings[i]);
    if (i < vlen) parts.push(`__SLOT_${i}__`);
    i++;
  }

  // Parse with placeholder markers
  const placeholderMarkers: HtmlPlaceholder[] = [];
  i = 0;
  while (i < vlen) {
    placeholderMarkers.push({ __placeholder: i });
    i++;
  }

  const nodes = parseHTML(parts.join(""), placeholderMarkers);
  const ast = nodes.length === 1 ? nodes[0] : { tag: '$', children: nodes };

  // Cache parsed AST
  templateCache.set(strings, ast);

  // Clone AST and substitute actual values
  return cloneWithValues(ast, values) as HellaNode | (() => HellaNode);
}

/**
 * Deep clones HellaNode AST and substitutes placeholder markers with actual values.
 * Handles special markers: __placeholder, __dynamicComponent.
 * @param node The AST node to clone
 * @param values Array of interpolated values from the template
 * @returns Cloned node with values substituted
 */
function cloneWithValues(node: unknown, values: unknown[]): unknown {
  // Handle primitives (fast path)
  if (typeof node !== 'object' || node === null) return node;

  // Handle placeholder marker
  if (Object.hasOwn(node, "__placeholder"))
    return values[(node as HtmlPlaceholder).__placeholder];

  // Handle arrays
  if (Array.isArray(node)) {
    const result: unknown[] = [];
    let i = 0, len = node.length;
    while (i < len) {
      result.push(cloneWithValues(node[i], values));
      i++;
    }
    return result;
  }

  // Handle dynamic component marker - resolve and call component function
  if (Object.hasOwn(node, "__dynamicComponent")) {
    const marker = node as HtmlDynamicComponent;
    const componentFn = values[marker.__dynamicComponent];
    if (typeof componentFn !== 'function') return node;

    // Clone props recursively
    const resolvedProps: Record<string, unknown> = {};
    for (const key in marker.props)
      resolvedProps[key] = cloneWithValues(marker.props[key], values);

    // Add children to props (unwrap single child arrays)
    if (marker.children && marker.children.length > 0) {
      const children = cloneWithValues(marker.children, values);
      resolvedProps.children = Array.isArray(children) && children.length === 1 ? children[0] : children;
    }

    // Passthrough components: call directly without component wrapper
    return (componentFn as RenderFn).isDynamic
      ? (componentFn as ComponentFn)(resolvedProps)
      : component(componentFn as ComponentFn, resolvedProps);
  }

  // Handle HellaNode
  if (!Object.hasOwn(node, "tag")) return node;

  const hellaNode = node as HellaNode;
  const cloned: Partial<HellaNode> = { tag: hellaNode.tag };

  // Clone props recursively
  if (hellaNode.props) {
    const props = {} as typeof hellaNode.props;
    for (const key in hellaNode.props)
      props[key] = cloneWithValues(hellaNode.props[key], values) as any;
    cloned.props = props;
  }

  // Clone event handlers
  if (hellaNode.on) {
    const on: Record<string, unknown> = {};
    for (const key in hellaNode.on)
      on[key] = cloneWithValues(hellaNode.on[key], values);
    cloned.on = on as Record<string, EventListener>;
  }

  // Clone direct (non-delegated) event handlers
  if (hellaNode.e) {
    const e: Record<string, unknown> = {};
    for (const key in hellaNode.e)
      e[key] = cloneWithValues(hellaNode.e[key], values);
    cloned.e = e as Record<string, EventListener>;
  }

  // Clone bindings
  if (hellaNode.bind) {
    const bind: Record<string, unknown> = {};
    for (const key in hellaNode.bind)
      bind[key] = cloneWithValues(hellaNode.bind[key], values);
    cloned.bind = bind as Record<string, HellaPrimitive>;
  }

  // Clone hooks
  if (hellaNode.hooks) {
    const hooks = {} as ElementHooks;
    for (const key in hellaNode.hooks)
      hooks[key as keyof ElementHooks] = cloneWithValues(hellaNode.hooks[key as keyof ElementHooks], values) as any;
    cloned.hooks = hooks;
  }

  // Clone error config
  if (hellaNode.error) {
    const error: Record<string, unknown> = {};
    for (const key in hellaNode.error)
      error[key] = cloneWithValues(hellaNode.error[key as 'fallback' | 'category'], values);
    cloned.error = error as { fallback?: (error: Error) => HellaNode; category?: string };
  }

  // Clone children
  if (hellaNode.children) {
    const children = cloneWithValues(hellaNode.children, values);
    cloned.children = Array.isArray(children) ? children.flat() : [children];
  }

  return cloned as HellaNode;
}

/**
 * Appends a child to a parsed node, initializing the children array if needed.
 * @param node The parent node to append to
 * @param child The child value to append
 */
function appendChild(node: HtmlParsedNode, child: unknown): void {
  (node.children ||= []).push(child);
}

/**
 * Parses HTML string into HellaNode AST using regex-based tokenization.
 * Handles tags, attributes, text content, and placeholder substitution.
 * @param html The HTML string to parse
 * @param placeholders Array of placeholder markers for value substitution
 * @returns Array of parsed AST nodes
 */
function parseHTML(html: string, placeholders: HtmlPlaceholder[]): HtmlInternalNode[] {
  const trimmed = html.trim();

  // Handle root-level placeholder (function that returns HellaNode or dynamic child)
  if (trimmed.startsWith("__SLOT_") && trimmed.endsWith("__")) {
    PLACEHOLDER_REGEX.lastIndex = 0;
    const match = PLACEHOLDER_REGEX.exec(trimmed);
    return [placeholders[match ? parseInt(match[1]) : 0]];
  }

  const result: HtmlInternalNode[] = [];
  const stack: HtmlParsedNode[] = [];
  let current: HtmlParsedNode | null = null;

  // Reset regex lastIndex for reuse
  TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(html)) !== null) {
    const isClosing = match[1];
    const tagName = match[2];
    const attrsStr = match[3];
    const isSelfClosing = match[4];
    const textContent = match[5];

    if (textContent) {
      const children = parseTextContent(textContent.trim(), placeholders);
      let i = 0, childLen = children.length;

      if (current) {
        while (i < childLen) appendChild(current, children[i++]);
      } else {
        // Text at root level - wrap primitives in fragment
        while (i < childLen) {
          const child = children[i++];
          const t = typeof child;
          result.push(t === "string" || t === "number" || t === "function"
            ? { tag: '$', children: [child] }
            : child as HtmlInternalNode);
        }
      }
    } else if (isClosing) {
      // Closing tag
      if (stack.length > 0) {
        const completed = stack.pop()!;
        if (stack.length === 0) {
          result.push(completed);
          current = null;
        } else {
          current = stack[stack.length - 1];
        }
      }
    } else {
      // Opening or self-closing tag
      // Check if tagName is a placeholder (dynamic component: <${Component} />)
      const isDynamicComponent = tagName.startsWith("__SLOT_");
      const attrs = parseAttributes(attrsStr, placeholders);

      const node: HtmlParsedNode = isDynamicComponent
        ? {
          __dynamicComponent: parseInt(tagName.slice(7, -2)),
          props: { ...attrs.props, ...attrs.on, ...attrs.e, ...attrs.bind, ...attrs.hooks },
          children: []
        }
        : {
          tag: tagName,
          props: attrs.props,
          children: [],
          ...(attrs.on && { on: attrs.on }),
          ...(attrs.e && { e: attrs.e }),
          ...(attrs.bind && { bind: attrs.bind }),
          ...(attrs.hooks && { hooks: attrs.hooks }),
          ...(attrs.error && { error: attrs.error })
        } as HellaNode & { children: HellaChild[] };

      if (isSelfClosing) {
        current ? appendChild(current, node) : result.push(node);
      } else {
        if (current) appendChild(current, node);
        stack.push(node);
        current = node;
      }
    }
  }

  // Handle unclosed tags
  while (stack.length > 0)
    result.push(stack.pop()!);

  return result;
}

/**
 * Parses text content and extracts placeholders for value substitution.
 * @param text The text content to parse
 * @param placeholders Array of placeholder markers
 * @returns Array of text fragments and placeholder markers
 */
function parseTextContent(text: string, placeholders: HtmlPlaceholder[]): unknown[] {
  if (!text) return [];
  if (!text.includes('__SLOT_')) return [text];

  const parts: unknown[] = [];
  PLACEHOLDER_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(placeholders[parseInt(match[1])]);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts;
}

/**
 * Parses attribute string and categorizes into props, hooks, bind, on, e, and error objects.
 * Recognizes prefixes: error:, on:, bind:, hook:, e:.
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
    const name = match[1];
    const placeholder = match[3];

    // Resolve value: placeholder > static > boolean
    const value: unknown = placeholder
      ? placeholders[parseInt(placeholder.slice(7, -2))]
      : match[2] ?? true;

    // Categorize by prefix
    if (name.startsWith('error:')) {
      const errorKey = name.slice(6) as 'fallback' | 'category' | 'boundary';
      (result.error ||= {})[errorKey] = value as any;
    } else if (name.startsWith('hook:')) {
      (result.hooks ||= {})[name.slice(5) as keyof ElementHooks] = value as () => void;
    } else if (name.startsWith('bind:')) {
      (result.bind ||= {})[name.slice(5)] = value as HellaPrimitive;
    } else if (name.startsWith('e:')) {
      (result.e ||= {})[name.slice(2)] = value as EventListener;
    } else if (name.startsWith('on:')) {
      (result.on ||= {})[name.slice(3)] = value as EventListener;
    } else {
      result.props![name] = value;
    }
  }

  return result;
}