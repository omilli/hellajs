import { styles } from './state';
import { flattenVars } from './utils';

let varsStyle: HTMLStyleElement | null = null;

/**
 * Gets or creates the stylesheet element for CSS variables.
 * @returns The stylesheet element.
 */
function getVarsStyle() {
  if (!varsStyle) {
    varsStyle = document.createElement('style');
    varsStyle.setAttribute('hella-vars', '');
    document.head.appendChild(varsStyle);
  }
  return varsStyle;
}

/**
 * Creates and injects CSS custom properties (variables) from an object.
 * @param vars The object of variables to create.
 * @returns An object with the same shape, but with `var()` functions as values.
 */
export function cssVars(vars: Record<string, any>) {
  const flat = flattenVars(vars);
  const styleSheet = getVarsStyle();
  const varLines = Object.entries(flat)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');
  const content = styleSheet.textContent || '';
  const withoutRoot = content.replace(/:root\s*\{[^}]*\}\s*/g, '');
  styleSheet.textContent = `:root {\n${varLines}\n}\n` + withoutRoot;
  const out: Record<string, string> = {};
  for (const k in flat) out[k] = `var(--${k})`;
  return out;
}

/**
 * Resets the CSS variables system, removing the stylesheet.
 */
export function cssVarsReset() {
  if (varsStyle) {
    varsStyle.remove();
    varsStyle = null;
  }
}