import { PASSTHROUGH_NAMES } from "../constants.mjs";

/**
 * Find all passthrough component names (ForEach, Portal, Lazy) in the intermediate AST.
 * Accepts any input; non-object values (null/undefined/primitives) are ignored.
 * @param {unknown} node
 * @param {Set<string>} [found]
 * @returns {Set<string>}
 */
export function findPassthroughComponents(node, found = new Set()) {
  if (!node || typeof node !== "object") return found;

  if (node.tag && PASSTHROUGH_NAMES.has(node.tag)) {
    found.add(node.tag);
  }

  if (Array.isArray(node.children)) {
    const children = node.children;
    let i = 0;
    const len = children.length;
    while (i < len) {
      findPassthroughComponents(children[i], found);
      i++;
    }
  }

  return found;
}

/**
 * Check if the intermediate AST contains any component tags.
 * Accepts any input; non-object values (null/undefined/primitives) are ignored.
 * @param {unknown} node
 * @param {Set<string>} [excludeNames]
 * @returns {boolean}
 */
export function containsComponent(node, excludeNames = new Set()) {
  if (!node || typeof node !== "object") return false;

  // Check if this node is a component (uppercase first letter or slot tag for dynamic)
  if (node.tag) {
    // Skip excluded names (passthrough components)
    if (excludeNames.has(node.tag)) {
      // Still need to check children for other components
      if (Array.isArray(node.children)) {
        const children = node.children;
        let i = 0;
        const len = children.length;
        while (i < len) {
          if (containsComponent(children[i], excludeNames)) return true;
          i++;
        }
      }
      return false;
    }

    const isSlotTag = /^__SLOT_\d+__$/.test(node.tag);
    const isUppercase = /^[A-Z]/.test(node.tag);
    if (isSlotTag || isUppercase) return true;
  }

  // Check children array
  if (Array.isArray(node.children)) {
    const children = node.children;
    let i = 0;
    const len = children.length;
    while (i < len) {
      if (containsComponent(children[i], excludeNames)) return true;
      i++;
    }
  }

  return false;
}
