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

// Fragment tag constant
const FRAGMENT_TAG = '$';

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
  if (cached) {
    return cloneWithValues(cached, values) as HellaNode | (() => HellaNode);
  }

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
 * Deep clones HellaNode AST and substitutes placeholder markers with actual values.
 * Handles special markers: __placeholder, __forEach, __dynamicComponent.
 * @param node The AST node to clone
 * @param values Array of interpolated values from the template
 * @returns Cloned node with values substituted
 */
function cloneWithValues(node: unknown, values: unknown[]): unknown {
  const nodeType = typeof node;

  // Handle primitives (fast path)
  if (nodeType !== 'object' || node === null) return node;

  // Handle placeholder marker (direct property check faster than 'in')
  if (isPlaceholderMarker(node)) return values[node.__placeholder];

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
  if (isDynamicComponentMarker(node)) {
    const componentFn = values[node.__dynamicComponent];
    if (typeof componentFn !== 'function') return node;

    // Check if this is a registered component
    const registeredComponent = componentRegistry.get(componentFn);
    const actualComponentFn = registeredComponent || componentFn;

    // Clone props and children to resolve placeholders
    const nodeProps = node.props;
    const resolvedProps: Record<string, unknown> = {};

    if (nodeProps) {
      for (const key in nodeProps) {
        resolvedProps[key] = cloneWithValues(nodeProps[key], values);
      }
    }

    // Add children to props (unwrap single child arrays)
    const nodeChildren = node.children;
    if (nodeChildren && nodeChildren.length > 0) {
      const children = cloneWithValues(nodeChildren, values);
      resolvedProps.children = Array.isArray(children) && children.length === 1 ? children[0] : children;
    }

    // Wrap in a component scope for effect management
    return componentScope(actualComponentFn, resolvedProps);
  }

  // Handle HellaNode
  if (!isHellaNode(node)) return node;

  const cloned: Partial<HellaNode> = { tag: node.tag };
  const nodeProps = node.props;

  if (nodeProps) {
    const clonedProps: Record<string, unknown> = {};
    for (const key in nodeProps) {
      clonedProps[key] = cloneWithValues(nodeProps[key], values);
    }
    cloned.props = clonedProps as typeof nodeProps;
  }

  // Clone on object (event handlers)
  const nodeOn = node.on;
  if (nodeOn) {
    const clonedOn: Record<string, EventListener> = {};
    for (const key in nodeOn) {
      clonedOn[key] = cloneWithValues(nodeOn[key], values) as EventListener;
    }
    cloned.on = clonedOn;
  }

  // Clone bind object (dynamic bindings)
  const nodeBind = node.bind;
  if (nodeBind) {
    const clonedBind: Record<string, HellaPrimitive> = {};
    for (const key in nodeBind) {
      clonedBind[key] = cloneWithValues(nodeBind[key], values) as HellaPrimitive;
    }
    cloned.bind = clonedBind;
  }

  // Clone hooks object
  const nodeHooks = node.hooks;
  if (nodeHooks) {
    const clonedHooks: Partial<ElementHooks> = {};
    for (const key in nodeHooks) {
      clonedHooks[key as keyof ElementHooks] = cloneWithValues(nodeHooks[key as keyof ElementHooks], values) as () => void;
    }
    cloned.hooks = clonedHooks as ElementHooks;
  }

  const nodeChildren = node.children;
  if (nodeChildren) {
    const children = cloneWithValues(nodeChildren, values);
    // Flatten arrays in children to avoid nested arrays
    cloned.children = Array.isArray(children) ? children.flat() : [children];
  }

  return cloned as HellaNode;
}

/**
 * Checks if a node is a placeholder marker for value substitution.
 * @param node The node to check
 * @returns True if the node is a placeholder marker
 */
function isPlaceholderMarker(node: unknown): node is PlaceholderMarker {
  return typeof node === 'object' && node !== null && '__placeholder' in node;
}

/**
 * Checks if a node is a dynamic component marker (e.g., <${Component}>).
 * @param node The node to check
 * @returns True if the node is a dynamic component marker
 */
function isDynamicComponentMarker(node: unknown): node is DynamicComponentMarker {
  return typeof node === 'object' && node !== null && '__dynamicComponent' in node;
}

/**
 * Checks if a node is a HellaNode (virtual DOM element).
 * @param node The node to check
 * @returns True if the node is a HellaNode
 */
function isHellaNode(node: unknown): node is HellaNode {
  return typeof node === 'object' && node !== null && 'tag' in node;
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
      // Text content or placeholder
      const children = parseTextContent(textContent.trim(), placeholders);
      const childLen = children.length;

      if (childLen > 0) {
        if (current) {
          let currChildren = current.children;
          if (!currChildren) currChildren = current.children = [];

          let i = 0;
          while (i < childLen) {
            currChildren.push(children[i]);
            i++;
          }
        } else {
          // Text at root level - wrap primitives in fragment
          let i = 0;
          while (i < childLen) {
            const child = children[i];
            const childType = typeof child;
            const isPrimitive = childType === "string" || childType === "number" || childType === "function";
            result.push(isPrimitive ? { tag: FRAGMENT_TAG, children: [child] } : child as InternalNode);
            i++;
          }
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
        // Self-closing tag
        if (current) {
          let currChildren = current.children;
          if (!currChildren) currChildren = current.children = [];
          currChildren.push(node);
        } else {
          result.push(node);
        }
      } else {
        // Opening tag
        if (current) {
          let currChildren = current.children;
          if (!currChildren) currChildren = current.children = [];
          currChildren.push(node);
        }
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
  if (!text) return [];

  // Early exit if no placeholders exist
  if (!text.includes('__SLOT_')) return [text];

  const parts: unknown[] = [];
  PLACEHOLDER_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchLen = match[0].length;

    // Add text before placeholder
    if (matchIndex > lastIndex) {
      const textBefore = text.slice(lastIndex, matchIndex);
      if (textBefore) parts.push(textBefore);
    }

    // Add placeholder value
    parts.push(placeholders[parseInt(match[1])]);

    lastIndex = matchIndex + matchLen;
  }

  // Add remaining text
  const textLen = text.length;
  if (lastIndex < textLen) {
    const remaining = text.slice(lastIndex);
    if (remaining) parts.push(remaining);
  }

  return parts.length === 0 ? [text] : parts;
}

/**
 * Parses attribute string and categorizes into props, hooks, bind, and on objects.
 * Recognizes prefixes: on:, bind:, hooks:.
 * @param attrsStr The attributes string from the HTML tag
 * @param placeholders Array of placeholder markers
 * @returns Object with categorized attributes
 */
function parseAttributes(attrsStr: string, placeholders: PlaceholderMarker[]): ParsedAttributes {
  const props: Record<string, unknown> = {};
  const hooks: Partial<ElementHooks> = {};
  const bind: Record<string, HellaPrimitive> = {};
  const on: Record<string, EventListener> = {};

  const trimmed = attrsStr?.trim();
  if (trimmed) {
    ATTR_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = ATTR_REGEX.exec(trimmed)) !== null) {
      const name = match[1];
      const staticValue = match[2];
      const placeholder = match[3];

      let value: unknown;
      if (placeholder) {
        // Dynamic value from placeholder
        const innerMatch = placeholder.match(SLOT_PATTERN_REGEX);
        const index = innerMatch ? parseInt(innerMatch[1]) : 0;
        value = placeholders[index];
      } else if (staticValue !== undefined) {
        // Static string value
        value = staticValue;
      } else {
        // Boolean attribute (no value)
        value = true;
      }

      // Separate by prefix (alphabetical order: bind, hooks, on, props)
      if (name.startsWith('hooks:')) {
        // Hook (hooks:mount -> hooks.mount)
        hooks[name.slice(6) as keyof ElementHooks] = value as () => void;
      } else if (name.startsWith('bind:')) {
        // Dynamic binding (bind:class -> bind.class)
        bind[name.slice(5)] = value as HellaPrimitive;
      } else if (name.startsWith('on:')) {
        // Event handler (on:click -> on.click)
        on[name.slice(3)] = value as EventListener;
      } else {
        // Regular prop
        props[name] = value;
      }
    }
  }

  // Always return object with props key, add hooks/bind/on only if they have entries
  const result: ParsedAttributes = { props };
  if (Object.keys(hooks).length > 0) result.hooks = hooks;
  if (Object.keys(bind).length > 0) result.bind = bind;
  if (Object.keys(on).length > 0) result.on = on;
  return result;
}