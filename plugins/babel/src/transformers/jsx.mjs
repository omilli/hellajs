import { FRAGMENT_TAG } from "../constants.mjs";
import { getTagCallee } from "../utils/babel.mjs";
import { processAttributes } from "../processors/attributes.mjs";
import { filterEmptyChildren } from "../processors/children.mjs";
import { buildHellaNode } from "../builders/vnode.mjs";
import { buildComponentCall } from "../builders/component.mjs";
import { ensureCreateComponentImport } from "../utils/imports.mjs";
import { PASSTHROUGH_INJECTORS } from "../utils/passthrough.mjs";
import { hoistStaticJSX } from "../utils/static.mjs";

/**
 * Create JSX element and fragment transformers.
 * @param {object} t
 * @returns {{ JSXElement(path): void, JSXFragment(path): void }}
 */
export function createJSXTransformers(t) {
  return {
    JSXElement(path) {
      const opening = path.node.openingElement;

      const tagCallee = getTagCallee(t, opening.name);
      const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name : null;
      const isComponent = (
        t.isJSXIdentifier(opening.name) && opening.name.name[0] === opening.name.name[0].toUpperCase()
      ) || t.isJSXMemberExpression(opening.name);

      // Fully-static subtree — hoist to a module const (staticDom clone path);
      // skips the normal pipeline entirely, so children are never traversed
      // (static subtrees contain no components, so no import injection is lost)
      if (!isComponent) {
        const program = path.findParent(p => t.isProgram(p));
        const hoisted = hoistStaticJSX(t, program, path.node);
        if (hoisted) {
          path.replaceWith(hoisted);
          return;
        }
      }

      const { props, on, hooks, e, error } = processAttributes(t, opening.attributes, isComponent);
      const children = filterEmptyChildren(t, path.node.children, isComponent);

      if (isComponent) {
        const program = path.findParent(p => t.isProgram(p));
        if (tagName && PASSTHROUGH_INJECTORS[tagName]) {
          PASSTHROUGH_INJECTORS[tagName](t, program);
        } else {
          ensureCreateComponentImport(t, program);
        }

        const allProps = [...props];
        if (on.length > 0) allProps.push(...on);
        if (e.length > 0) allProps.push(...e);
        if (hooks.length > 0) allProps.push(...hooks);
        if (error.length > 0) allProps.push(...error);
        path.replaceWith(buildComponentCall(t, tagCallee, allProps, children));
      } else {
        path.replaceWith(buildHellaNode(t, tagCallee.name, props, on, e, hooks, children, error));
      }
    },

    JSXFragment(path) {
      const program = path.findParent(p => t.isProgram(p));
      const hoisted = hoistStaticJSX(t, program, path.node);
      if (hoisted) {
        path.replaceWith(hoisted);
        return;
      }
      const children = filterEmptyChildren(t, path.node.children, false);
      // Fragment: pass empty error array
      path.replaceWith(buildHellaNode(t, FRAGMENT_TAG, [], [], [], [], children, []));
    }
  };
}
