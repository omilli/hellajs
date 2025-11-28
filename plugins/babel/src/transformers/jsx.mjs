// JSX element and fragment transformers
import { FRAGMENT_TAG } from '../constants.mjs';
import { getTagCallee } from '../utils/babel.mjs';
import { processAttributes } from '../processors/attributes.mjs';
import { filterEmptyChildren } from '../processors/children.mjs';
import { buildHellaNode } from '../builders/vnode.mjs';
import { buildComponentCall } from '../builders/component.mjs';
import { handleStyleTag } from './style.mjs';
import { ensureCreateComponentImport, ensureForEachImport, ensurePortalImport } from '../utils/imports.mjs';

// Passthrough components that need their own imports
const PASSTHROUGH_COMPONENTS = { ForEach: ensureForEachImport, Portal: ensurePortalImport };

export function createJSXTransformers(t) {
  return {
    JSXElement(path) {
      const opening = path.node.openingElement;

      // Auto-transform <style>...</style> to css(...)
      if (t.isJSXIdentifier(opening.name, { name: 'style' })) {
        handleStyleTag(t, path, opening);
        return;
      }

      const tagCallee = getTagCallee(t, opening.name);
      const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name : null;
      const isComponent = (
        t.isJSXIdentifier(opening.name) && opening.name.name[0] === opening.name.name[0].toUpperCase()
      ) || t.isJSXMemberExpression(opening.name);

      const { props, on, bind, hooks } = processAttributes(t, opening.attributes, isComponent);
      const children = filterEmptyChildren(t, path.node.children, isComponent);

      if (isComponent) {
        const program = path.findParent(p => t.isProgram(p));
        if (program) {
          // Check for passthrough components (ForEach, Portal)
          if (tagName && PASSTHROUGH_COMPONENTS[tagName]) {
            PASSTHROUGH_COMPONENTS[tagName](t, program);
          } else {
            ensureCreateComponentImport(t, program);
          }
        }

        // For components, merge on/bind/hooks back into props
        const allProps = [...props];
        if (on.length > 0) allProps.push(...on);
        if (bind.length > 0) allProps.push(...bind);
        if (hooks.length > 0) allProps.push(...hooks);
        path.replaceWith(buildComponentCall(t, tagCallee, allProps, children));
      } else {
        path.replaceWith(buildHellaNode(t, tagCallee.name, props, on, bind, hooks, children));
      }
    },

    JSXFragment(path) {
      const children = filterEmptyChildren(t, path.node.children, false);
      path.replaceWith(buildHellaNode(t, FRAGMENT_TAG, [], [], [], [], children));
    }
  };
}
