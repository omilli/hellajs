// Tagged template literal transformer
import { parseHTMLTemplate } from '../parsers/html.mjs';
import { templateNodeToBabel } from '../builders/ast.mjs';
import { containsForEach } from '../utils/traversal.mjs';
import { ensureForEachImport } from '../utils/imports.mjs';

export function createTemplateTransformer(t) {
  return {
    TaggedTemplateExpression(path) {
      // Only transform html`` templates
      if (path.node.tag.name !== 'html') return;

      const { quasis, expressions } = path.node.quasi;

      // Parse template to intermediate AST
      const ast = parseHTMLTemplate(quasis, expressions);

      // Check if we need to import forEach
      if (containsForEach(ast)) {
        const program = path.findParent(p => t.isProgram(p));
        if (program) {
          ensureForEachImport(t, program);
        }
      }

      // Convert to clean Babel AST
      const babelAST = templateNodeToBabel(t, ast, expressions);

      path.replaceWith(babelAST);
    }
  };
}
