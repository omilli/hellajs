import type { HellaElement } from "./types";
import { DOC } from "./utils";
import { resolveNode } from "./mount";

// Interface for DOM template with binding information
interface DOMTemplate {
  // The template DOM element to clone
  element: HellaElement;
  // Binding information for dynamic content updates
  bindings: TemplateBinding[];
  // Parameter names for context mapping
  paramNames: string[];
}

// Binding information for updating dynamic content
interface TemplateBinding {
  // Type of binding: 'text', 'attribute', or 'property'
  type: 'text' | 'attribute' | 'property';
  // Path to the target node (array of child indices)
  path: number[];
  // Attribute/property name (for attribute/property bindings)
  name?: string;
  // Context accessor function
  accessor: (ctx: Record<string, unknown>) => unknown;
}

// DOM template cache
const templates = new Map<string, DOMTemplate>();

/**
 * Registers a DOM template with binding information.
 * @param id The template identifier
 * @param createTemplate Function that creates the template element and bindings
 */
export function registerDOMTemplate(
  id: string, 
  createTemplate: () => { element: HellaElement; bindings: TemplateBinding[]; paramNames: string[] }
): void {
  const template = createTemplate();
  templates.set(id, template);
}

/**
 * Creates a bound DOM element from a template.
 * @param id The template identifier
 * @param ctx The binding context
 * @returns Cloned and bound DOM element, or null if template not found
 */
export function bindDOMTemplate(id: string, ctx: Record<string, unknown>): HellaElement | null {
  const template = templates.get(id);
  if (!template) return null;
  
  // Clone the template element
  const cloned = template.element.cloneNode(true) as HellaElement;
  
  // Apply bindings
  template.bindings.forEach(binding => {
    const target = getNodeAtPath(cloned, binding.path);
    if (!target) return;
    
    const value = binding.accessor(ctx);
    
    switch (binding.type) {
      case 'text':
        if (target.nodeType === Node.TEXT_NODE) {
          target.textContent = String(value ?? '');
        } else {
          target.textContent = String(value ?? '');
        }
        break;
        
      case 'attribute':
        if (binding.name && target.nodeType === Node.ELEMENT_NODE) {
          (target as Element).setAttribute(binding.name, String(value ?? ''));
        }
        break;
        
      case 'property':
        if (binding.name && target.nodeType === Node.ELEMENT_NODE) {
          (target as any)[binding.name] = value;
        }
        break;
    }
  });
  
  return cloned;
}

/**
 * Gets a node at a specific path within a parent element.
 * @param parent The parent element
 * @param path Array of child indices
 * @returns The target node or null if path is invalid
 */
function getNodeAtPath(parent: Node, path: number[]): Node | null {
  let current: Node | null = parent;
  
  for (const index of path) {
    if (!current || !current.childNodes[index]) {
      return null;
    }
    current = current.childNodes[index];
  }
  
  return current;
}

// Legacy VNode template support for backward compatibility
type LegacyTemplateFn = (ctx: Record<string, unknown>) => any;
const legacyTemplates = new Map<string, LegacyTemplateFn>();

export function registerTemplate(id: string, template: LegacyTemplateFn): void {
  legacyTemplates.set(id, template);
}

export function bindTemplate(id: string, ctx: Record<string, unknown>): any {
  const template = legacyTemplates.get(id);
  return template ? template(ctx) : ctx;
}

/**
 * Helper function to create template bindings from a VNode-like structure.
 * This is used by the Babel plugin to convert JSX to DOM templates.
 */
export function createTemplateFromVNode(
  vnode: any,
  paramNames: string[]
): { element: HellaElement; bindings: TemplateBinding[] } {
  const bindings: TemplateBinding[] = [];
  const element = createElementFromVNode(vnode, [], bindings, paramNames);
  return { element, bindings };
}

/**
 * Recursively creates DOM elements from VNode-like structures and tracks bindings.
 */
function createElementFromVNode(
  vnode: any,
  path: number[],
  bindings: TemplateBinding[],
  paramNames: string[]
): HellaElement {
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return DOC.createTextNode(String(vnode)) as unknown as HellaElement;
  }
  
  if (vnode?.tag === '$') {
    // Fragment
    const fragment = DOC.createDocumentFragment() as unknown as HellaElement;
    vnode.children?.forEach((child: any, index: number) => {
      const childElement = createElementFromVNode(child, [...path, index], bindings, paramNames);
      fragment.appendChild(childElement);
    });
    return fragment;
  }
  
  if (!vnode?.tag) {
    return DOC.createComment('empty') as unknown as HellaElement;
  }
  
  const element = DOC.createElement(vnode.tag) as HellaElement;
  
  // Handle props
  if (vnode.props) {
    Object.entries(vnode.props).forEach(([key, value]) => {
      if (typeof value === 'function' || isContextReference(value, paramNames)) {
        // Dynamic binding
        const accessor = createAccessor(value, paramNames);
        bindings.push({
          type: key in element ? 'property' : 'attribute',
          path: [...path],
          name: key,
          accessor
        });
      } else {
        // Static value
        if (key in element) {
          (element as any)[key] = value;
        } else {
          element.setAttribute(key, String(value));
        }
      }
    });
  }
  
  // Handle children
  if (vnode.children) {
    vnode.children.forEach((child: any, index: number) => {
      if (typeof child === 'string' || typeof child === 'number') {
        const textNode = DOC.createTextNode(String(child));
        element.appendChild(textNode);
      } else if (isContextReference(child, paramNames)) {
        // Dynamic text content
        const textNode = DOC.createTextNode('');
        element.appendChild(textNode);
        const accessor = createAccessor(child, paramNames);
        bindings.push({
          type: 'text',
          path: [...path, index],
          accessor
        });
      } else if (child) {
        const childElement = createElementFromVNode(child, [...path, index], bindings, paramNames);
        element.appendChild(childElement);
      }
    });
  }
  
  return element;
}

/**
 * Checks if a value contains member expressions that reference context parameters.
 */
function isContextReference(value: any, paramNames: string[]): boolean {
  if (!value || typeof value !== 'object') return false;
  
  // Check for member expressions like { object: 'context', property: 'paramName' }
  if (value.type === 'MemberExpression' && 
      value.object && value.object.name === 'context' && 
      value.property && paramNames.includes(value.property.name || value.property.value)) {
    return true;
  }
  
  // Check for template literals or other expressions that might reference params
  if (value.type === 'TemplateLiteral' || value.type === 'BinaryExpression') {
    return hasContextReference(value, paramNames);
  }
  
  return false;
}

/**
 * Recursively checks if an AST node references context parameters.
 */
function hasContextReference(node: any, paramNames: string[]): boolean {
  if (!node || typeof node !== 'object') return false;
  
  if (node.type === 'MemberExpression' && 
      node.object && node.object.name === 'context') {
    return true;
  }
  
  // Recursively check child nodes
  for (const key in node) {
    if (node[key] && typeof node[key] === 'object') {
      if (Array.isArray(node[key])) {
        if (node[key].some((child: any) => hasContextReference(child, paramNames))) {
          return true;
        }
      } else if (hasContextReference(node[key], paramNames)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Creates an accessor function from a value that may reference context parameters.
 */
function createAccessor(value: any, paramNames: string[]): (ctx: Record<string, unknown>) => unknown {
  if (typeof value === 'function') {
    return value;
  }
  
  if (isContextReference(value, paramNames)) {
    // For member expressions like context.param
    if (value.type === 'MemberExpression' && value.object && value.object.name === 'context') {
      const propName = value.property.name || value.property.value;
      return (ctx: Record<string, unknown>) => ctx[propName];
    }
    
    // For template literals and other complex expressions,
    // we'll need to evaluate them in context
    return (ctx: Record<string, unknown>) => {
      try {
        // This is a simplified approach - a full implementation would
        // need to properly evaluate the AST with the context
        return evaluateWithContext(value, ctx);
      } catch {
        return value;
      }
    };
  }
  
  return () => value;
}

/**
 * Simple evaluator for AST nodes with context.
 * This is a basic implementation - a production version would be more comprehensive.
 */
function evaluateWithContext(node: any, ctx: Record<string, unknown>): unknown {
  if (!node || typeof node !== 'object') return node;
  
  switch (node.type) {
    case 'MemberExpression':
      if (node.object && node.object.name === 'context') {
        const propName = node.property.name || node.property.value;
        return ctx[propName];
      }
      break;
      
    case 'Literal':
      return node.value;
      
    case 'TemplateLiteral':
      let result = '';
      for (let i = 0; i < node.quasis.length; i++) {
        result += node.quasis[i].value.cooked;
        if (i < node.expressions.length) {
          result += String(evaluateWithContext(node.expressions[i], ctx) ?? '');
        }
      }
      return result;
      
    case 'BinaryExpression':
      const left = evaluateWithContext(node.left, ctx);
      const right = evaluateWithContext(node.right, ctx);
      switch (node.operator) {
        case '+':
          return (left as any) + (right as any);
        case '-':
          return (left as any) - (right as any);
        case '*':
          return (left as any) * (right as any);
        case '/':
          return (left as any) / (right as any);
        default:
          return node;
      }
  }
  
  return node;
}