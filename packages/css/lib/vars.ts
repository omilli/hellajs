import { styles, varsRules } from './state';
import { flattenVars } from './utils';
import { effect } from '@hellajs/core';

let varsStyle: HTMLStyleElement | null = null;
let varsEffectInitialized = false;

/**
 * Gets or creates the stylesheet element for CSS variables.
 * @returns The stylesheet element.
 */
function getVarsStyle() {
  if (!varsStyle) {
    varsStyle = document.createElement('style');
    varsStyle.setAttribute('hella-vars', '');
    document.head.appendChild(varsStyle);
    initializeVarsEffect();
  }
  return varsStyle;
}

/**
 * Initialize reactive effect for CSS variables DOM updates.
 */
function initializeVarsEffect() {
  if (varsEffectInitialized) return;
  varsEffectInitialized = true;

  effect(() => {
    const rules = varsRules();
    const sheet = varsStyle;
    if (!sheet || !rules) return;

    // Generate the CSS content from the variables map
    const varLines: string[] = [];
    rules.forEach((value, key) => {
      varLines.push(`  --${key}: ${value};`);
    });

    const content = sheet.textContent || '';
    const withoutRoot = content.replace(/:root\s*\{[^}]*\}\s*/g, '');
    sheet.textContent = varLines.length > 0 ? `:root {\n${varLines.join('\n')}\n}\n` + withoutRoot : withoutRoot;
  });
}

/**
 * Creates and injects CSS custom properties (variables) from an object.
 * @param vars The object of variables to create.
 * @returns An object with the same shape, but with `var()` functions as values.
 */
export function cssVars(vars: Record<string, any>) {
  const flat = flattenVars(vars);
  
  // Ensure stylesheet exists (this will also initialize reactive effect)
  getVarsStyle();
  
  // Update the reactive varsRules signal
  const currentVars = varsRules();
  const newVars = new Map(currentVars);
  
  // Add new variables to the reactive map
  Object.entries(flat).forEach(([key, value]) => {
    newVars.set(key, value.toString());
  });
  
  varsRules(newVars); // Trigger reactivity
  
  // Return the var() references
  const out: Record<string, string> = {};
  for (const k in flat) out[k] = `var(--${k})`;
  return out;
}

/**
 * Resets the CSS variables system, removing the stylesheet.
 */
export function cssVarsReset() {
  // Reset the reactive signal
  varsRules(new Map<string, string>());
  
  if (varsStyle) {
    varsStyle.remove();
    varsStyle = null;
  }
}