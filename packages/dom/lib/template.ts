import type { HellaNode } from "./types";
import { FRAGMENT } from "./utils";
import { forEach } from "./forEach";

// Registry for template components (keyed by function reference)
const componentRegistry = new Map<Function, (props: any) => HellaNode | (() => HellaNode)>();

// Cache context for template() components
let activeCache: WeakMap<TemplateStringsArray, HellaNode | (() => HellaNode)> | null = null;

/**
 * Tagged template literal for creating HellaNode AST from HTML-like syntax.
 * Supports dynamic interpolations in attributes, text content, and children.
 * Only caches when called from within a template() component.
 * @param strings The static string parts of the template
 * @param values The interpolated values (signals, functions, or static values)
 * @returns A HellaNode or function that creates a HellaNode
 */
export function html(strings: TemplateStringsArray, ...values: any[]): HellaNode | (() => HellaNode) {
  let ast: HellaNode | (() => HellaNode);

  // Use cache if inside a template() component
  if (activeCache) {
    const cached = activeCache.get(strings);
    if (cached) {
      return cloneWithValues(cached, values);
    }
  }

  // Build HTML string with placeholder markers using array join (faster than +=)
  const parts = [];
  let i = 0, len = strings.length, vlen = values.length;

  while (i < len) {
    parts.push(strings[i]);
    if (i < vlen) parts.push(`__HELLA_${i}__`);
    i++;
  }

  // Parse with placeholder markers
  const placeholderMarkers = [];
  i = 0;
  while (i < vlen) {
    placeholderMarkers.push({ __placeholder: i });
    i++;
  }

  const nodes = parseHTML(parts.join(""), placeholderMarkers);
  ast = nodes.length === 1 ? nodes[0] : { tag: FRAGMENT, children: nodes };

  // Cache if inside a template() component
  if (activeCache) {
    activeCache.set(strings, ast);
  }

  // Clone AST and substitute actual values
  return cloneWithValues(ast, values);
}

/**
 * Deep clone HellaNode AST and substitute placeholder markers with actual values
 */
function cloneWithValues(node: any, values: any[]): any {
  const nodeType = typeof node;

  // Handle primitives (fast path)
  if (nodeType !== 'object' || node === null) return node;

  // Handle placeholder marker (direct property check faster than 'in')
  if (node.__placeholder !== undefined) return values[node.__placeholder];

  // Handle arrays
  if (Array.isArray(node)) {
    const result = [];
    let i = 0, len = node.length;
    while (i < len) {
      result.push(cloneWithValues(node[i], values));
      i++;
    }
    return result;
  }

  // Handle forEach marker - resolve to forEach call
  if (node.__forEach) {
    const nodeProps = node.props;
    const resolvedProps: any = {};

    if (nodeProps) {
      for (const key in nodeProps) {
        resolvedProps[key] = cloneWithValues(nodeProps[key], values);
      }
    }

    // Map ForEach props to forEach signature: forEach(source, mapFn)
    const source = resolvedProps.for;
    const mapFn = resolvedProps.each;

    return (!source || !mapFn)
      ? (console.warn('<ForEach> requires both "for" and "each" props'), null)
      : forEach(source, mapFn);
  }

  // Handle dynamic component marker - resolve and call component function
  const dynamicComponentIndex = node.__dynamicComponent;
  if (dynamicComponentIndex !== undefined) {
    const component = values[dynamicComponentIndex];
    if (typeof component !== 'function') return node;

    // Check if this is a registered template component
    const registeredComponent = componentRegistry.get(component);
    const componentFn = registeredComponent || component;

    // Clone props and children to resolve placeholders
    const nodeProps = node.props;
    const resolvedProps: any = {};

    if (nodeProps) {
      for (const key in nodeProps) {
        resolvedProps[key] = cloneWithValues(nodeProps[key], values);
      }
    }

    // Add children to props (unwrap single child arrays)
    const nodeChildren = node.children;
    if (nodeChildren && nodeChildren.length > 0) {
      const children = cloneWithValues(nodeChildren, values);
      resolvedProps.children = children.length === 1 ? children[0] : children;
    }

    // Call component function with resolved props
    return componentFn(resolvedProps);
  }

  // Handle HellaNode
  const cloned: any = { tag: node.tag };
  const nodeProps = node.props;

  if (nodeProps) {
    const clonedProps: any = {};
    for (const key in nodeProps) {
      clonedProps[key] = cloneWithValues(nodeProps[key], values);
    }
    cloned.props = clonedProps;
  }

  // Clone on object (event handlers)
  const nodeOn = node.on;
  if (nodeOn) {
    const clonedOn: any = {};
    for (const key in nodeOn) {
      clonedOn[key] = cloneWithValues(nodeOn[key], values);
    }
    cloned.on = clonedOn;
  }

  // Clone bind object (dynamic bindings)
  const nodeBind = node.bind;
  if (nodeBind) {
    const clonedBind: any = {};
    for (const key in nodeBind) {
      clonedBind[key] = cloneWithValues(nodeBind[key], values);
    }
    cloned.bind = clonedBind;
  }

  const nodeChildren = node.children;
  if (nodeChildren) {
    const children = cloneWithValues(nodeChildren, values);
    // Flatten arrays in children to avoid nested arrays
    cloned.children = Array.isArray(children) ? children.flat() : children;
  }

  return cloned;
}

/**
 * Simple regex-based HTML parser that builds HellaNode AST
 */
function parseHTML(html: string, placeholders: any[]): HellaNode[] {
  const trimmed = html.trim();

  // Handle root-level placeholder (function that returns HellaNode or dynamic child)
  if (trimmed.startsWith("__HELLA_") && trimmed.endsWith("__")) {
    const match = trimmed.match(/__HELLA_(\d+)__/);
    const index = match ? parseInt(match[1]) : 0;
    return [placeholders[index]];
  }

  const result: HellaNode[] = [];
  const stack: HellaNode[] = [];
  let current: HellaNode | null = null;

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
              ? { tag: FRAGMENT, children: [child] }
              : child);
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

      const node: any = isForEach
        ? {
          __forEach: true,
          props: attrs.props
        }
        : isDynamicComponent
          ? {
            __dynamicComponent: parseInt(placeholderMatch[1]),
            props: { ...attrs.props, ...attrs.on, ...attrs.bind },
            children: []
          }
          : {
            tag: tagName,
            props: attrs.props,
            children: []
          };

      // Add on and bind if present (only for non-component nodes)
      if (!isForEach && !isDynamicComponent) {
        if (attrs.on) node.on = attrs.on;
        if (attrs.bind) node.bind = attrs.bind;
      }

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
function parseTextContent(text: string, placeholders: any[]): any[] {
  if (!text) return [];

  const parts: any[] = [];
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

/**
 * Parse attributes string and separate into props, on, and bind objects
 */
function parseAttributes(attrsStr: string, placeholders: any[]): { props: Record<string, any>, on?: Record<string, any>, bind?: Record<string, any> } {
  const props: Record<string, any> = {};
  const on: Record<string, any> = {};
  const bind: Record<string, any> = {};

  if (attrsStr?.trim()) {
    // Match: name="value" or name=__HELLA_N__ or name (boolean)
    // Include @ and : prefixes for Vue-style event handlers and dynamic bindings
    const attrRegex = /([@:\w-]+)(?:=(?:"([^"]*)"|(__HELLA_\d+__)))?/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(attrsStr)) !== null) {
      const name = match[1];
      const staticValue = match[2];
      const placeholder = match[3];

      let value: any;
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
      if (name.startsWith('@')) {
        // Event handler (@click -> on.click)
        on[name.slice(1)] = value;
      } else if (name.startsWith(':') && !name.includes('xmlns')) {
        // Dynamic binding (:class -> bind.class)
        bind[name.slice(1)] = value;
      } else {
        // Regular prop
        props[name] = value;
      }
    }
  }

  // Always return object with props key, add on/bind only if they have entries
  const result: any = { props };
  if (Object.keys(on).length > 0) result.on = on;
  if (Object.keys(bind).length > 0) result.bind = bind;
  return result;
}

/**
 * Create a component wrapper with AST caching for html`` calls.
 * The component function reference is used as the registry key.
 *
 * Usage:
 * - `const Button = template((props) => html`<button>...</button>`)`
 * - `html`<div>${Button({ id: "run" })}</div>``
 * - `html`<${Button} id="run">Click</${Button}>``
 */
export function template<P = {}>(
  fn: (props: P) => HellaNode | (() => HellaNode)
): (props: P) => HellaNode | (() => HellaNode) {
  const cache = new WeakMap<TemplateStringsArray, HellaNode | (() => HellaNode)>();
  const cachedFn = (props: P) => {
    const prevCache = activeCache;
    activeCache = cache;
    const result = fn(props);
    activeCache = prevCache;
    return result;
  };

  // Register component using the original function as key
  componentRegistry.set(fn, cachedFn as any);

  return cachedFn;
}