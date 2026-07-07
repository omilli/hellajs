import { parseHTMLComponent } from "../parsers/html.mjs";
import { componentNodeToBabel } from "../builders/ast.mjs";
import { containsComponent, findPassthroughComponents } from "../utils/traversal.mjs";
import { ensureCreateComponentImport } from "../utils/imports.mjs";
import { PASSTHROUGH_INJECTORS } from "../utils/passthrough.mjs";
/**
 * Create transformer for html`` tagged template literals.
 * @param {typeof import("@babel/core").types} t
 * @returns {{ TaggedTemplateExpression(path): void }}
 */
export function componentTransformer(t) {
  return {
    TaggedTemplateExpression(path) {
      // Only transform html`` components
      if (path.node.tag.name !== "html") return;

      const { quasis, expressions } = path.node.quasi;

      // Parse component to intermediate AST
      const ast = parseHTMLComponent(quasis, expressions);

      const program = path.findParent(p => t.isProgram(p));

      const passthroughNames = findPassthroughComponents(ast);
      for (const name of passthroughNames) {
        PASSTHROUGH_INJECTORS[name](t, program);
      }

      if (containsComponent(ast, passthroughNames)) {
        ensureCreateComponentImport(t, program);
      }

      // Convert to clean Babel AST
      const babelAST = componentNodeToBabel(t, ast, expressions);

      path.replaceWith(babelAST);
    }
  };
}
