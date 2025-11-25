import type { HellaNode, HellaChild, ElementLifecycle, HellaPrimitive } from "./types";
import { component } from "./internal";
import { forEach } from "./forEach";

// Internal marker types for template parsing
interface PlaceholderMarker {
  __placeholder: number;
}

interface ForEachMarker {
  __forEach: true;
  props: Record<string, unknown>;
  children?: HellaChild[];
}

interface DynamicComponentMarker {
  __dynamicComponent: number;
  props: Record<string, unknown>;
  children: HellaChild[];
}

type InternalNode = HellaNode | PlaceholderMarker | ForEachMarker | DynamicComponentMarker;

// Mutable node type during parsing (before finalization)
type ParsedNode = ForEachMarker | DynamicComponentMarker | (HellaNode & { children: HellaChild[] });

type ComponentFunction = (props: Record<string, unknown>) => HellaNode | (() => HellaNode);

// Registry for cached components (keyed by function reference)
const componentRegistry = new Map<Function, ComponentFunction>();

// Global cache for all html`` templates (keyed by template strings array)
const templateCache = new WeakMap<TemplateStringsArray, InternalNode>();

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
    if (i < vlen) parts.push(`__HELLA_${i}__`);
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
  const ast = nodes.length === 1 ? nodes[0] : { tag: "$", children: nodes };

  // Cache parsed AST
  templateCache.set(strings, ast);

  // Clone AST and substitute actual values
  return cloneWithValues(ast, values) as HellaNode | (() => HellaNode);
}

/**
 * Deep clone HellaNode AST and substitute placeholder markers with actual values
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

  // Handle forEach marker - resolve to forEach call
  if (isForEachMarker(node)) {
    const nodeProps = node.props;
    const resolvedProps: Record<string, unknown> = {};

    if (nodeProps) {
      for (const key in nodeProps) {
        resolvedProps[key] = cloneWithValues(nodeProps[key], values);
      }
    }

    // Map ForEach props to forEach signature: forEach(source, mapFn)
    const source = resolvedProps.for as unknown[] | (() => unknown[]);
    const mapFn = resolvedProps.each as (item: unknown, index: number) => HellaChild;

    return (!source || !mapFn)
      ? (console.warn('<ForEach> requires both "for" and "each" props'), null)
      : forEach(source as unknown[], mapFn);
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

    // Use the same component() helper that Babel plugin generates
    return component(actualComponentFn, resolvedProps);
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

  // Clone at object (lifecycle hooks)
  const nodeAt = node.at;
  if (nodeAt) {
    const clonedAt: Partial<ElementLifecycle> = {};
    for (const key in nodeAt) {
      clonedAt[key as keyof ElementLifecycle] = cloneWithValues(nodeAt[key as keyof ElementLifecycle], values) as () => void;
    }
    cloned.at = clonedAt as ElementLifecycle;
  }

  const nodeChildren = node.children;
  if (nodeChildren) {
    const children = cloneWithValues(nodeChildren, values);
    // Flatten arrays in children to avoid nested arrays
    cloned.children = Array.isArray(children) ? children.flat() : [children];
  }

  return cloned as HellaNode;
}

// Type guards
function isPlaceholderMarker(node: unknown): node is PlaceholderMarker {
  return typeof node === 'object' && node !== null && '__placeholder' in node;
}

function isForEachMarker(node: unknown): node is ForEachMarker {
  return typeof node === 'object' && node !== null && '__forEach' in node;
}

function isDynamicComponentMarker(node: unknown): node is DynamicComponentMarker {
  return typeof node === 'object' && node !== null && '__dynamicComponent' in node;
}

function isHellaNode(node: unknown): node is HellaNode {
  return typeof node === 'object' && node !== null && 'tag' in node;
}

/**
 * Simple regex-based HTML parser that builds HellaNode AST
 */
function parseHTML(html: string, placeholders: PlaceholderMarker[]): InternalNode[] {
  const trimmed = html.trim();

  // Handle root-level placeholder (function that returns HellaNode or dynamic child)
  if (trimmed.startsWith("__HELLA_") && trimmed.endsWith("__")) {
    const match = trimmed.match(/__HELLA_(\d+)__/);
    const index = match ? parseInt(match[1]) : 0;
    return [placeholders[index]];
  }

  const result: InternalNode[] = [];
  const stack: ParsedNode[] = [];
  let current: ParsedNode | null = null;

  // Regex to match: opening tags, closing tags, self-closing tags, text
  const tokenRegex = /<(\/)?([\w-]+)([^>]*?)(\s*\/)?>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(html)) !== null) {
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
          // Text at root level - wrap in fragment
          let i = 0;
          while (i < childLen) {
            const child = children[i];
            const childType = typeof child;
            result.push(childType === "string" || childType === "number" || childType === "function"
              ? { tag: "$", children: [child] }
              : child as InternalNode);
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
      const isForEach = tagName === 'ForEach';

      // Check if tagName is a placeholder (dynamic component: <${Component} />)
      const placeholderMatch = tagName.match(/^__HELLA_(\d+)__$/);
      const isDynamicComponent = !!placeholderMatch;

      const attrs = parseAttributes(attrsStr, placeholders);

      const node: ParsedNode = isForEach
        ? {
          __forEach: true as const,
          props: attrs.props,
          children: []
        }
        : isDynamicComponent
          ? {
            __dynamicComponent: parseInt(placeholderMatch[1]),
            props: { ...attrs.props, ...attrs.on, ...attrs.bind, ...attrs.at },
            children: []
          }
          : {
            tag: tagName,
            props: attrs.props,
            children: [],
            ...(attrs.on && { on: attrs.on }),
            ...(attrs.bind && { bind: attrs.bind }),
            ...(attrs.at && { at: attrs.at })
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
 * Parse text content, handling placeholders
 */
function parseTextContent(text: string, placeholders: PlaceholderMarker[]): unknown[] {
  if (!text) return [];

  const parts: unknown[] = [];
  const placeholderRegex = /__HELLA_(\d+)__/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(text)) !== null) {
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

interface ParsedAttributes {
  props: Record<string, unknown>;
  on?: Record<string, EventListener>;
  bind?: Record<string, HellaPrimitive>;
  at?: Partial<ElementLifecycle>;
}

/**
 * Parse attributes string and separate into props, on, bind, and at objects
 */
function parseAttributes(attrsStr: string, placeholders: PlaceholderMarker[]): ParsedAttributes {
  const props: Record<string, unknown> = {};
  const on: Record<string, EventListener> = {};
  const bind: Record<string, HellaPrimitive> = {};
  const at: Partial<ElementLifecycle> = {};

  if (attrsStr?.trim()) {
    // Match: name="value" or name=__HELLA_N__ or name (boolean)
    // Include on: prefix for event handlers, bind: prefix for dynamic bindings, and at: prefix for lifecycle hooks
    const attrRegex = /(on:[\w-]+|bind:[\w-]+|at:[\w-]+|[\w-]+)(?:=(?:"([^"]*)"|(__HELLA_\d+__)))?/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(attrsStr)) !== null) {
      const name = match[1];
      const staticValue = match[2];
      const placeholder = match[3];

      let value: unknown;
      if (placeholder) {
        // Dynamic value from placeholder
        const innerMatch = placeholder.match(/__HELLA_(\d+)__/);
        const index = innerMatch ? parseInt(innerMatch[1]) : 0;
        value = placeholders[index];
      } else if (staticValue !== undefined) {
        // Static string value
        value = staticValue;
      } else {
        // Boolean attribute (no value)
        value = true;
      }

      // Separate by prefix
      if (name.startsWith('on:')) {
        // Event handler (on:click -> on.click)
        on[name.slice(3)] = value as EventListener;
      } else if (name.startsWith('at:')) {
        // Lifecycle hook (at:mount -> at.mount)
        at[name.slice(3) as keyof ElementLifecycle] = value as () => void;
      } else if (name.startsWith('bind:')) {
        // Dynamic binding (bind:class -> bind.class)
        bind[name.slice(5)] = value as HellaPrimitive;
      } else {
        // Regular prop
        props[name] = value;
      }
    }
  }

  // Always return object with props key, add on/bind/at only if they have entries
  const result: ParsedAttributes = { props };
  if (Object.keys(on).length > 0) result.on = on;
  if (Object.keys(bind).length > 0) result.bind = bind;
  if (Object.keys(at).length > 0) result.at = at;
  return result;
}