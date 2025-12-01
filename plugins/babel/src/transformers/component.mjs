// Tagged component literal transformer
import { parseHTMLComponent } from '../parsers/html.mjs';
import { componentNodeToBabel } from '../builders/ast.mjs';
import { containsComponent, findPassthroughComponents } from '../utils/traversal.mjs';
import { ensureCreateComponentImport, ensureForEachImport, ensurePortalImport } from '../utils/imports.mjs';

// Passthrough components that need their own imports
const PASSTHROUGH_IMPORTS = { ForEach: ensureForEachImport, Portal: ensurePortalImport };

export function componentTransformer(t) {
  return {
    TaggedTemplateExpression(path) {
      // Only transform html`` components
      if (path.node.tag.name !== 'html') return;

      const { quasis, expressions } = path.node.quasi;

      // Parse component to intermediate AST
      const ast = parseHTMLComponent(quasis, expressions);

      const program = path.findParent(p => t.isProgram(p));

      // Ensure imports for passthrough components
      const passthroughNames = findPassthroughComponents(ast);
      for (const name of passthroughNames) {
        if (program && PASSTHROUGH_IMPORTS[name]) {
          PASSTHROUGH_IMPORTS[name](t, program);
        }
      }

      // Check if we need to import component (for non-passthrough components)
      if (containsComponent(ast, passthroughNames)) {
        if (program) {
          ensureCreateComponentImport(t, program);
        }
      }

      // Convert to clean Babel AST
      const babelAST = componentNodeToBabel(t, ast, expressions);

      path.replaceWith(babelAST);
    }
  };
}
