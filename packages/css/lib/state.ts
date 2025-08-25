import { signal, effect } from '@hellajs/core';

// Performance optimization: Batching and differential updates
let pendingStyleUpdate = false;
let scheduledRulesUpdate: Map<string, string> | null = null;

/**
 * Manages the stylesheet element in the document head.
 * @param [el] The stylesheet element to set.
 * @returns The current stylesheet element.
 */
export function styles(el?: HTMLStyleElement | null) {
  if (typeof el !== 'undefined') {
    styleSheet = el;
  }

  return styleSheet;
}

/**
 * Manages a counter for generating unique class names.
 * @param [val] The value to set the counter to.
 * @returns The current counter value.
 */
export function counter(val?: number): number {
  if (val) {
    styleCounter = val;
  }
  return styleCounter;
}

// Non-reactive Maps (cache, refCounts, inlineMemo don't need reactivity)
export const cache = new Map<string, string>();
export const inlineMemo = new Map<string, string>();
export const refCounts = new Map<string, number>();

// Reactive signals for CSS rules
export const cssRules = signal(new Map<string, string>());

// CSS variables state (will be made reactive in vars.ts)
export const varsRules = signal(new Map<string, string>());

let styleSheet: HTMLStyleElement | null = null;
let styleCounter = 0;

// Auto-update stylesheet when CSS rules change with performance optimizations
let stylesEffectInitialized = false;
let lastKnownRules = new Map<string, string>();

export function initializeStylesEffect() {
  if (stylesEffectInitialized) return;
  stylesEffectInitialized = true;

  effect(() => {
    const rules = cssRules();
    const sheet = styles();
    if (!sheet || !rules) return;
    
    // Performance optimization: Use batching for DOM updates
    if (pendingStyleUpdate) {
      scheduledRulesUpdate = rules;
      return;
    }
    
    batchStyleUpdate(rules, sheet);
  });
}

function batchStyleUpdate(rules: Map<string, string>, sheet: HTMLStyleElement) {
  pendingStyleUpdate = true;
  scheduledRulesUpdate = rules;
  
  // Use queueMicrotask for better performance than RAF in most cases
  queueMicrotask(() => {
    if (scheduledRulesUpdate) {
      applyDifferentialUpdate(scheduledRulesUpdate, sheet);
      scheduledRulesUpdate = null;
    }
    pendingStyleUpdate = false;
  });
}

function applyDifferentialUpdate(newRules: Map<string, string>, sheet: HTMLStyleElement) {
  // Check if content actually changed
  const newContent = Array.from(newRules.values()).join('');
  const currentContent = sheet.textContent || '';
  
  if (newContent === currentContent) {
    return; // No changes needed
  }
  
  // Use CSSStyleSheet API when available for better performance
  const cssSheet = sheet.sheet;
  
  if (cssSheet && 'insertRule' in cssSheet && lastKnownRules.size > 0) {
    // Modern approach: Use CSSStyleSheet.insertRule for differential updates
    const oldRules = lastKnownRules;
    const added = new Map<string, string>();
    const removed = new Set<string>();
    
    // Find removed rules
    for (const [key] of oldRules) {
      if (!newRules.has(key)) {
        removed.add(key);
      }
    }
    
    // Find added/changed rules
    for (const [key, value] of newRules) {
      if (!oldRules.has(key) || oldRules.get(key) !== value) {
        added.set(key, value);
      }
    }
    
    // Apply differential changes if they represent less than 30% of total rules
    const totalChanges = added.size + removed.size;
    const shouldUseDifferential = totalChanges > 0 && totalChanges < Math.max(newRules.size * 0.3, 3);
    
    if (shouldUseDifferential) {
      try {
        // Clear existing rules safely
        while (cssSheet.cssRules.length > 0) {
          cssSheet.deleteRule(0);
        }
        
        // Add all new rules
        for (const [, cssText] of newRules) {
          try {
            if (cssText.trim()) {
              cssSheet.insertRule(cssText, cssSheet.cssRules.length);
            }
          } catch (e) {
            // If any rule fails, fall back to textContent
            sheet.textContent = newContent;
            lastKnownRules = new Map(newRules);
            return;
          }
        }
        
        lastKnownRules = new Map(newRules);
        return;
      } catch (e) {
        // Fallback to full replacement on error
      }
    }
  }
  
  // Fallback: Full textContent replacement (most reliable)
  sheet.textContent = newContent;
  lastKnownRules = new Map(newRules);
}