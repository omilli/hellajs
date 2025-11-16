import type { HellaNode } from "./types";
import { FRAGMENT } from "./utils";
import { forEach } from "./forEach";

// Registry for named template components
const componentRegistry = new Map<string, (props: any) => HellaNode | (() => HellaNode)>();

// Cache parsed template ASTs by TemplateStringsArray reference
const templateCache = new WeakMap<TemplateStringsArray, HellaNode | (() => HellaNode)>();

/**
 * Tagged template literal for creating HellaNode AST from HTML-like syntax.
 * Supports dynamic interpolations in attributes, text content, and children.
 * Parses HTML structure once per call site and caches for performance.
 * @param strings The static string parts of the template
 * @param values The interpolated values (signals, functions, or static values)
 * @returns A HellaNode or function that creates a HellaNode
 */
export function html(strings: TemplateStringsArray, ...values: any[]): HellaNode | (() => HellaNode) {
  // Check cache for this template literal call site
  let cachedAST = templateCache.get(strings);

  if (!cachedAST) {
    // Build HTML string with placeholder markers using array join (faster than +=)
    const parts = [];
    let i = 0, len = strings.length, vlen = values.length;

    while (i < len) {
      parts.push(strings[i]);
      if (i < vlen) parts.push(`__HELLA_${i}__`);
      i++;
    }

    // Parse once with placeholder markers and cache
    const placeholderMarkers = [];
    i = 0;
    while (i < vlen) {
      placeholderMarkers.push({ __placeholder: i });
      i++;
    }

    const nodes = parseHTML(parts.join(""), placeholderMarkers);
    cachedAST = nodes.length === 1 ? nodes[0] : { tag: FRAGMENT, children: nodes };
    templateCache.set(strings, cachedAST);
  }

  // Clone cached AST and substitute actual values
  return cloneWithValues(cachedAST, values);
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

  // Handle component marker - resolve and call component function
  const componentName = node.__component;
  if (componentName) {
    const component = componentRegistry.get(componentName);
    if (!component) return node;

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
    return component(resolvedProps);
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
      // Combine has + get into single get (avoids double Map lookup)
      const component = isForEach ? null : componentRegistry.get(tagName);
      const node: any = isForEach
        ? {
          __forEach: true,
          props: parseAttributes(attrsStr, placeholders)
        }
        : component
          ? {
            __component: tagName,
            props: parseAttributes(attrsStr, placeholders),
            children: []
          }
          : {
            tag: tagName,
            props: parseAttributes(attrsStr, placeholders),
            children: []
          };

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
 * Parse attributes string into props object
 */
function parseAttributes(attrsStr: string, placeholders: any[]): Record<string, any> {
  if (!attrsStr?.trim()) return {};

  const props: Record<string, any> = {};

  // Match: name="value" or name=__HELLA_N__ or name (boolean)
  const attrRegex = /([\w-:]+)(?:=(?:"([^"]*)"|(__HELLA_\d+__)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const name = match[1];
    const staticValue = match[2];
    const placeholder = match[3];

    if (placeholder) {
      // Dynamic value from placeholder
      const innerMatch = placeholder.match(/__HELLA_(\d+)__/);
      const index = innerMatch ? parseInt(innerMatch[1]) : 0;
      props[name] = placeholders[index];
    } else if (staticValue !== undefined) {
      // Static string value
      props[name] = staticValue;
    } else {
      // Boolean attribute (no value)
      props[name] = true;
    }
  }

  return props;
}

/**
 * Register a named component template or create a simple component wrapper.
 *
 * With name: Registers component for declarative usage in html`` templates
 * - `template("action-button", (props) => html`<button>...</button>`)`
 * - Usage: `html`<action-button id="run">Click</action-button>``
 *
 * Without name: Simple component wrapper for direct usage
 * - `const Button = template((props) => html`<button>...</button>`)`
 * - Usage: `html`<div>${Button({ id: "run" })}</div>``
 */
export function template<P = {}>(
  name: string,
  fn: (props: P) => HellaNode | (() => HellaNode)
): (props: P) => HellaNode | (() => HellaNode);
export function template<P = {}>(
  fn: (props: P) => HellaNode | (() => HellaNode)
): (props: P) => HellaNode | (() => HellaNode);
export function template<P = {}>(
  nameOrFn: string | ((props: P) => HellaNode | (() => HellaNode)),
  fn?: (props: P) => HellaNode | (() => HellaNode)
): (props: P) => HellaNode | (() => HellaNode) {
  if (typeof nameOrFn === 'string' && fn) {
    // Named component registration
    componentRegistry.set(nameOrFn, fn as any);
    return (props: P) => fn(props);
  }

  // Simple wrapper
  const componentFn = nameOrFn as (props: P) => HellaNode | (() => HellaNode);
  return (props: P) => componentFn(props);
}