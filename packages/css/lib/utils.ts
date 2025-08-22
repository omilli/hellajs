import { cssRules, styles, reactiveStyles, reactiveElements } from "./state";
import type { CSSObject } from "./types";
import { effect } from "@hellajs/core";

/**
 * Converts a camelCase string to kebab-case.
 * @param str The string to convert.
 * @returns The kebab-cased string.
 */
export function kebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Creates a stable, sorted JSON string from an object.
 * @param obj The object to stringify.
 * @returns A stable JSON string.
 */
export function stringify(obj: unknown): string {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    let out = '{';
    for (let i = 0; i < keys.length; i++) {
      if (i) out += ',';
      out += JSON.stringify(keys[i]) + ':' + stringify((obj as Record<string, unknown>)[keys[i]]);
    }
    return out + '}';
  } else {
    return JSON.stringify(obj);
  }
}

/**
 * Updates the content of the stylesheet element with the current CSS rules.
 */
export function update(): void {
  if (!styles()) return;
  styles()!.textContent = Array.from(cssRules.values()).join('');
}

/**
 * Processes a CSS object into a CSS string.
 * @param obj The CSS object to process.
 * @param selector The current selector context.
 * @param [global=false] Whether to process in global mode.
 * @returns The processed CSS string.
 */
export function process(obj: CSSObject, selector: string, global: boolean = false): string {
  let css = '', props = '';
  for (const key in obj) {
    const value = obj[key as keyof CSSObject];
    switch (true) {
      case key.startsWith('@keyframes'):
        css += `@keyframes${key.slice(10)}{`;
        for (const frame in value as CSSObject) {
          css += `${frame}{`;
          const frameObj = (value as Record<string, CSSObject>)[frame];
          for (const prop in frameObj) {
            css += `${kebab(prop)}:${frameObj[prop as keyof CSSObject]};`;
          }
          css += '}';
        }
        css += '}';
        break;
      case key.startsWith('@'):
        css += `${key}{${process(value as CSSObject, selector, global)}}`;
        break;
      case key.includes('&'):
        key.split(',').forEach(s => {
          css += process(value as CSSObject, s.trim().replace(/&/g, selector), global);
        });
        break;
      case key.includes(','):
        key.split(',').forEach(s => {
          const t = s.trim();
          if (t.startsWith(':') || t.startsWith('&')) {
            const nsel = t.startsWith(':') ? `${selector}${t}` : `${selector}${t.replace(/^&/, '')}`;
            css += process(value as CSSObject, nsel, global);
          } else {
            css += process(value as CSSObject, global ? t : `${selector} ${t}`, global);
          }
        });
        break;
      case key.startsWith(':'):
        css += process(value as CSSObject, `${selector}${key}`, global);
        break;
      case typeof value === 'object' && value !== null:
        css += process(value as CSSObject, global ? `${key}` : `${selector} ${key}`, global);
        break;
      default:
        props += key.startsWith('--') ? `${key}:${value};` : `${kebab(key)}:${value};`;
    }
  }
  if (props) css = `${selector}{${props}}` + css;
  return css;
}

/**
 * Flattens a nested object of CSS variables into a single-level object.
 * @param vars The nested variables object.
 * @param [prefix=''] The prefix for the variable names.
 * @returns A flattened object of CSS variables.
 */
export function flattenVars(vars: Record<string, any>, prefix = ''): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const k in vars) {
    const v = vars[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = flattenVars(v, prefix ? `${prefix}-${k}` : k);
      Object.assign(out, nested);
    } else {
      out[prefix ? `${prefix}-${k}` : k] = v;
    }
  }
  return out;
}

/**
 * Checks if a value is a reactive function.
 * @param value The value to check.
 * @returns True if the value is a function (reactive).
 */
export function isReactive(value: any): value is () => any {
  return typeof value === 'function';
}

/**
 * Resolves a potentially reactive value to its actual value.
 * @param value The value to resolve.
 * @returns The resolved value.
 */
export function resolveValue(value: any): any {
  return isReactive(value) ? value() : value;
}

/**
 * Checks if a CSS object contains any reactive values.
 * @param obj The CSS object to check.
 * @returns True if the object contains reactive values.
 */
export function hasReactiveValues(obj: CSSObject): boolean {
  for (const key in obj) {
    const value = obj[key as keyof CSSObject];
    if (isReactive(value)) {
      return true;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (hasReactiveValues(value as CSSObject)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Resolves all reactive values in a CSS object.
 * @param obj The CSS object to resolve.
 * @returns A CSS object with all reactive values resolved.
 */
export function resolveReactiveObject(obj: CSSObject): CSSObject {
  const resolved: CSSObject = {};
  for (const key in obj) {
    const value = obj[key as keyof CSSObject];
    if (isReactive(value)) {
      resolved[key as keyof CSSObject] = resolveValue(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      resolved[key as keyof CSSObject] = resolveReactiveObject(value as CSSObject);
    } else {
      resolved[key as keyof CSSObject] = value;
    }
  }
  return resolved;
}

/**
 * Creates a reactive CSS effect that updates styles when dependencies change.
 * @param obj The CSS object (may contain reactive values).
 * @param selector The CSS selector.
 * @param className The generated class name.
 * @param global Whether this is a global style.
 * @returns A cleanup function for the reactive effect.
 */
export function createReactiveEffect(
  obj: CSSObject, 
  selector: string, 
  className: string, 
  global: boolean
): () => void {
  // Create a dedicated style element for this reactive class
  const styleElement = document.createElement('style');
  styleElement.setAttribute('hella-css-reactive', className);
  document.head.appendChild(styleElement);
  
  reactiveElements.set(className, styleElement);
  
  // Create reactive effect
  const cleanup = effect(() => {
    const resolvedObj = resolveReactiveObject(obj);
    const cssText = global ? process(resolvedObj, '', true) : process(resolvedObj, selector, false);
    styleElement.textContent = cssText;
  });
  
  return () => {
    cleanup();
    styleElement.remove();
    reactiveElements.delete(className);
  };
}
