// Tagged component literal transformer
import { parseHTMLComponent } from '../parsers/html.mjs';
import { componentNodeToBabel } from '../builders/ast.mjs';
import { containsForEach, containsComponent } from '../utils/traversal.mjs';
import { ensureForEachImport, ensureCreateComponentImport } from '../utils/imports.mjs';

export function componentTransformer(t) {
  return {
    TaggedTemplateExpression(path) {
      // Only transform html`` components
      if (path.node.tag.name !== 'html') return;

      const { quasis, expressions } = path.node.quasi;

      // Parse component to intermediate AST
      const ast = parseHTMLComponent(quasis, expressions);

      const program = path.findParent(p => t.isProgram(p));

      // Check if we need to import forEach
      if (containsForEach(ast)) {
        if (program) {
          ensureForEachImport(t, program);
        }
      }

      // Check if we need to import component
      if (containsComponent(ast)) {
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
