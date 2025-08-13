import type { VNode, HellaElement } from "./nodes";

export interface TemplateFn {
  (ctx: Record<string, unknown>): VNode;
}

/**
 * DOM template interface for efficient element caching.
 */
export interface DOMTemplate {
  /** The template DOM element to clone */
  element: HellaElement;
  /** Binding information for dynamic content updates */
  bindings: TemplateBinding[];
  /** Parameter names for context mapping */
  paramNames: string[];
}

/**
 * Binding information for updating dynamic content in DOM templates.
 */
export interface TemplateBinding {
  /** Type of binding: 'text', 'attribute', or 'property' */
  type: 'text' | 'attribute' | 'property';
  /** Path to the target node (array of child indices) */
  path: number[];
  /** Attribute/property name (for attribute/property bindings) */
  name?: string;
  /** Context accessor function */
  accessor: (ctx: Record<string, unknown>) => unknown;
}

/**
 * Function that creates a DOM template.
 */
export interface DOMTemplateFn {
  (): DOMTemplate;
}