// Tagged component literal transformer
import { parseHTMLComponent } from '../parsers/html.mjs';
import { componentNodeToBabel } from '../builders/ast.mjs';
import { containsForEach } from '../utils/traversal.mjs';
import { ensureForEachImport } from '../utils/imports.mjs';

export function createComponentTransformer(t) {
  return {
    TaggedTemplateExpression(path) {
      // Only transform html`` components
      if (path.node.tag.name !== 'html') return;

      const { quasis, expressions } = path.node.quasi;

      // Parse component to intermediate AST
      const ast = parseHTMLComponent(quasis, expressions);

      // Check if we need to import forEach
      if (containsForEach(ast)) {
        const program = path.findParent(p => t.isProgram(p));
        if (program) {
          ensureForEachImport(t, program);
        }
      }

      // Convert to clean Babel AST
      const babelAST = componentNodeToBabel(t, ast, expressions);

      path.replaceWith(babelAST);
    }
  };
}
