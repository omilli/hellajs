// AST traversal utilities

// Check if intermediate AST contains component tags (uppercase or dynamic)
export function containsComponent(node) {
  if (!node || typeof node !== 'object') return false;

  // Check if this node is a component (uppercase first letter or slot tag for dynamic)
  if (node.tag) {
    const isSlotTag = /^__SLOT_\d+__$/.test(node.tag);
    const isUppercase = /^[A-Z]/.test(node.tag);
    if (isSlotTag || isUppercase) return true;
  }

  // Check children array
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (containsComponent(child)) return true;
    }
  }

  return false;
}
