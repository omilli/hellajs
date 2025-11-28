import type {
  HellaNode,
  HellaChild,
  ElementHooks,
  HellaPrimitive,
  PlaceholderMarker,
  DynamicComponentMarker,
  InternalNode,
  ParsedNode,
  ComponentFunction,
  ParsedAttributes
} from "./types";
import { componentScope } from "./component";
import { ForEach } from "./forEach";

// Fragment tag constant
const FRAGMENT_TAG = '$';

// Set of components that bypass componentScope wrapping
const PASSTHROUGH_COMPONENTS = new Set<any>([ForEach]);

// Registry for cached components (keyed by function reference)
const componentRegistry = new Map<Function, ComponentFunction>();

// Global cache for all html`` templates (keyed by template strings array)
const templateCache = new WeakMap<TemplateStringsArray, InternalNode>();

// Cached regex patterns for performance
const TOKEN_REGEX = /<(\/)?([\w-]+)([^>]*?)(\s*\/)?>|([^<]+)/g;
const PLACEHOLDER_REGEX = /__SLOT_(\d+)__/g;
const SLOT_PATTERN_REGEX = /^__SLOT_(\d+)__$/;
const ATTR_REGEX = /(on:[\w-]+|bind:[\w-]+|hooks:[\w-]+|[\w-]+)(?:=(?:"([^"]*?)"|(__SLOT_\d+__)))?/g;

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
  const placeholderMarkers: PlaceholderMarker[] = [];
  i = 0;
  while (i < vlen) {
    placeholderMarkers.push({ __placeholder: i });
    i++;
  }

  const nodes = parseHTML(parts.join(""), placeholderMarkers);
  const ast = nodes.length === 1 ? nodes[0] : { tag: FRAGMENT_TAG, children: nodes };

  // Cache parsed AST
  templateCache.set(strings, ast);

  // Clone AST and substitute actual values
  return cloneWithValues(ast, values) as HellaNode | (() => HellaNode);
}

/**
 * Clones an object's properties with value substitution.
 * @param obj Source object to clone
 * @param values Array of interpolated values
 * @returns Cloned object with substituted values
 */
function cloneObj<T>(obj: T | undefined, values: unknown[]): T | undefined {
  if (!obj) return undefined;
  const cloned: Record<string, unknown> = {};
  for (const key in obj) cloned[key] = cloneWithValues(obj[key], values);
  return cloned as T;
}

/**
 * Deep clones HellaNode AST and substitutes placeholder markers with actual values.
 * Handles special markers: __placeholder, __forEach, __dynamicComponent.
 * @param node The AST node to clone
 * @param values Array of interpolated values from the template
 * @returns Cloned node with values substituted
 */
function cloneWithValues(node: unknown, values: unknown[]): unknown {
  // Handle primitives (fast path)
  if (typeof node !== 'object' || node === null) return node;

  // Handle placeholder marker (direct property check faster than 'in')
  if (isType<PlaceholderMarker>(node, "__placeholder")) return values[node.__placeholder];

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
  if (isType<DynamicComponentMarker>(node, "__dynamicComponent")) {
    const componentFn = values[node.__dynamicComponent];
    if (typeof componentFn !== 'function') return node;

    const resolvedProps = cloneObj(node.props, values) || {};

    // Add children to props (unwrap single child arrays)
    const nodeChildren = node.children;
    if (nodeChildren && nodeChildren.length > 0) {
      const children = cloneWithValues(nodeChildren, values);
      resolvedProps.children = Array.isArray(children) && children.length === 1 ? children[0] : children;
    }

    // Passthrough components: call directly without componentScope
    if (PASSTHROUGH_COMPONENTS.has(componentFn as Function)) {
      return (componentFn as ComponentFunction)(resolvedProps);
    }

    const actualComponentFn = componentRegistry.get(componentFn as Function) || componentFn;
    return componentScope(actualComponentFn as ComponentFunction, resolvedProps);
  }

  // Handle HellaNode
  if (!isType<HellaNode>(node, "tag")) return node;

  const cloned: Partial<HellaNode> = { tag: node.tag };

  const props = cloneObj(node.props, values);
  if (props) cloned.props = props;

  const on = cloneObj(node.on, values);
  if (on) cloned.on = on as Record<string, EventListener>;

  const bind = cloneObj(node.bind, values);
  if (bind) cloned.bind = bind as Record<string, HellaPrimitive>;

  const hooks = cloneObj(node.hooks, values);
  if (hooks) cloned.hooks = hooks as ElementHooks;

  const nodeChildren = node.children;
  if (nodeChildren) {
    const children = cloneWithValues(nodeChildren, values);
    cloned.children = Array.isArray(children) ? children.flat() : [children];
  }

  return cloned as HellaNode;
}

/**
 * Type guard using property check (caller already validates object type).
 * @param node The node to check
 * @param key The property key to check for
 */
function isType<T extends object>(node: object, key: string): node is T {
  return Object.hasOwn(node, key);
}

/** Appends a child to a parsed node, initializing children array if needed. */
function appendChild(node: ParsedNode, child: unknown): void {
  (node.children ||= []).push(child);
}

/**
 * Parses HTML string into HellaNode AST using regex-based tokenization.
 * Handles tags, attributes, text content, and placeholder substitution.
 * @param html The HTML string to parse
 * @param placeholders Array of placeholder markers for value substitution
 * @returns Array of parsed AST nodes
 */
function parseHTML(html: string, placeholders: PlaceholderMarker[]): InternalNode[] {
  const trimmed = html.trim();

  // Handle root-level placeholder (function that returns HellaNode or dynamic child)
  if (trimmed.startsWith("__SLOT_") && trimmed.endsWith("__")) {
    const match = trimmed.match(SLOT_PATTERN_REGEX);
    const index = match ? parseInt(match[1]) : 0;
    return [placeholders[index]];
  }

  const result: InternalNode[] = [];
  const stack: ParsedNode[] = [];
  let current: ParsedNode | null = null;

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
            ? { tag: FRAGMENT_TAG, children: [child] }
            : child as InternalNode);
        }
      }
    } else if (isClosing) {
      // Closing tag
      const stackLen = stack.length;
      if (stackLen > 0) {
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
      const placeholderMatch = tagName.match(SLOT_PATTERN_REGEX);
      const isDynamicComponent = !!placeholderMatch;

      const attrs = parseAttributes(attrsStr, placeholders);

      const node: ParsedNode = isDynamicComponent
        ? {
          __dynamicComponent: parseInt(placeholderMatch[1]),
          props: { ...attrs.props, ...attrs.on, ...attrs.bind, ...attrs.hooks },
          children: []
        }
        : {
          tag: tagName,
          props: attrs.props,
          children: [],
          ...(attrs.on && { on: attrs.on }),
          ...(attrs.bind && { bind: attrs.bind }),
          ...(attrs.hooks && { hooks: attrs.hooks })
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
  let stackLen = stack.length;
  while (stackLen > 0) {
    result.push(stack.pop()!);
    stackLen--;
  }

  return result;
}

/**
 * Parses text content and extracts placeholders for value substitution.
 * @param text The text content to parse
 * @param placeholders Array of placeholder markers
 * @returns Array of text fragments and placeholder markers
 */
function parseTextContent(text: string, placeholders: PlaceholderMarker[]): unknown[] {
  if (!text || !text.includes('__SLOT_')) return text ? [text] : [];

  const parts: unknown[] = [];
  PLACEHOLDER_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    // Add text before placeholder (slice returns empty string if indices equal)
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(placeholders[parseInt(match[1])]);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts;
}

/**
 * Parses attribute string and categorizes into props, hooks, bind, and on objects.
 * Recognizes prefixes: on:, bind:, hooks:.
 * @param attrsStr The attributes string from the HTML tag
 * @param placeholders Array of placeholder markers
 * @returns Object with categorized attributes
 */
function parseAttributes(attrsStr: string, placeholders: PlaceholderMarker[]): ParsedAttributes {
  const result: ParsedAttributes = { props: {} };
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

    // Categorize by prefix using first char for speed (h=104, b=98, o=111)
    const firstChar = name.charCodeAt(0);
    if (firstChar === 104 && name.startsWith('hooks:')) {
      (result.hooks ||= {})[name.slice(6) as keyof ElementHooks] = value as () => void;
    } else if (firstChar === 98 && name.startsWith('bind:')) {
      (result.bind ||= {})[name.slice(5)] = value as HellaPrimitive;
    } else if (firstChar === 111 && name.startsWith('on:')) {
      (result.on ||= {})[name.slice(3)] = value as EventListener;
    } else {
      result.props![name] = value;
    }
  }

  return result;
}