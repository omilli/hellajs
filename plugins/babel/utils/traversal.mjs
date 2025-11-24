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
