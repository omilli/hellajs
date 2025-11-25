// AST traversal utilities

// Check if intermediate AST contains ForEach tags
export function containsForEach(node) {
  if (!node || typeof node !== 'object') return false;

  // Check if this node is a ForEach tag
  if (node.tag === 'ForEach') return true;

  // Check children array
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (containsForEach(child)) return true;
    }
  }

  return false;
}

// Check if intermediate AST contains component tags (uppercase or dynamic)
export function containsComponent(node) {
  if (!node || typeof node !== 'object') return false;

  // Check if this node is a component (uppercase first letter or slot tag for dynamic)
  if (node.tag) {
    const isSlotTag = /^__SLOT_\d+__$/.test(node.tag);
    const isUppercase = /^[A-Z]/.test(node.tag);
    // Exclude ForEach as it's handled separately
    if ((isSlotTag || isUppercase) && node.tag !== 'ForEach') return true;
  }

  // Check children array
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (containsComponent(child)) return true;
    }
  }

  return false;
}
