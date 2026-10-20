import { FRAGMENT_TAG } from "../constants.mjs";
import { getTagCallee } from "../utils/babel.mjs";
import { processAttributes } from "../processors/attributes.mjs";
import { filterEmptyChildren } from "../processors/children.mjs";
import { buildHellaNode } from "../builders/vnode.mjs";
import { buildComponentCall } from "../builders/component.mjs";
import {
  ensureCreateComponentImport,
  ensureHooksFeatureImport,
  ensureErrorsFeatureImport,
  ensureDirectEventsFeatureImport,
  ensureNamespacesFeatureImport,
  ensureRoutedPropsFeatureImport,
} from "../utils/imports.mjs";
import { PASSTHROUGH_INJECTORS } from "../utils/passthrough.mjs";
import { hoistStaticJSX } from "../utils/static.mjs";

/**
 * Create JSX element and fragment transformers.
 *
 * Per-file feature detection: each JSX element reports the dom feature modules its
 * syntax needs (svg/math tags → namespaces; hook:/error:/e: attributes → their
 * subsystem's feature; prefixed attributes in component position → routed-props),
 * and the Program exit emits one bare side-effect import per needed feature so
 * dom's gated runtime wiring loads exactly when a file uses it.
 * @param {object} t
 * @returns {{ Program: { exit(path): void }, JSXElement(path): void, JSXFragment(path): void }}
 */
export function createJSXTransformers(t) {
  // Program node → feature keys seen so far; the plugin instance is created per
  // transform, so the map never spans files.
  const featureImports = new Map();

  /**
   * Record one feature key for the program the node belongs to.
   * @param {import("@babel/core").NodePath} program
   * @param {string} key Feature key (hooks / errors / directEvents / namespaces / routedProps)
   */
  function collectFeature(program, key) {
    let features = featureImports.get(program.node);
    if (!features) {
      features = new Set();
      featureImports.set(program.node, features);
    }
    features.add(key);
  }

  /**
   * Scans a hoisted static subtree's raw JSX for svg/math tags. The hoist replaces
   * the subtree wholesale, so its inner JSXElements are never visited and the
   * namespaces feature import must be collected from the pre-replacement node.
   * @param {import("@babel/core").JSXElement | import("@babel/core").JSXFragment} node
   * @param {import("@babel/core").NodePath} program
   */
  function collectStaticNamespaces(node, program) {
    if (t.isJSXElement(node)) {
      const name = node.openingElement.name;
      if (t.isJSXIdentifier(name) && (name.name === "svg" || name.name === "math")) {
        collectFeature(program, "namespaces");
      }
    }
    let i = 0;
    const len = node.children.length;
    while (i < len) {
      const child = node.children[i++];
      if (t.isJSXElement(child) || t.isJSXFragment(child)) collectStaticNamespaces(child, program);
    }
  }

  return {
    Program: {
      exit(programPath) {
        const features = featureImports.get(programPath.node);
        if (!features) return;
        if (features.has("hooks")) ensureHooksFeatureImport(t, programPath);
        if (features.has("errors")) ensureErrorsFeatureImport(t, programPath);
        if (features.has("directEvents")) ensureDirectEventsFeatureImport(t, programPath);
        if (features.has("namespaces")) ensureNamespacesFeatureImport(t, programPath);
        if (features.has("routedProps")) ensureRoutedPropsFeatureImport(t, programPath);
      },
    },

    JSXElement(path) {
      const opening = path.node.openingElement;

      const tagCallee = getTagCallee(t, opening.name);
      const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name : null;
      const isComponent =
        (t.isJSXIdentifier(opening.name) &&
          opening.name.name[0] === opening.name.name[0].toUpperCase()) ||
        t.isJSXMemberExpression(opening.name);

      const program = path.findParent((p) => t.isProgram(p));

      // svg/math roots create in their foreign namespace — before the static-hoist
      // early return, since a literal-prop svg subtree still hoists.
      if (tagName === "svg" || tagName === "math") {
        collectFeature(program, "namespaces");
      }

      // Fully-static subtree — hoist to a module const (staticDom clone path);
      // skips the normal pipeline entirely, so children are never traversed
      // (static subtrees contain no components, so no import injection is lost)
      if (!isComponent) {
        const hoisted = hoistStaticJSX(t, program, path.node);
        if (hoisted) {
          collectStaticNamespaces(path.node, program);
          path.replaceWith(hoisted);
          return;
        }
      }

      const { props, on, hooks, e, error, features } = processAttributes(
        t,
        opening.attributes,
        isComponent,
      );
      if (features.hooks) collectFeature(program, "hooks");
      if (features.errors) collectFeature(program, "errors");
      if (features.direct) collectFeature(program, "directEvents");
      if (features.routed) collectFeature(program, "routedProps");

      const children = filterEmptyChildren(t, path.node.children, isComponent);

      if (isComponent) {
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
      const program = path.findParent((p) => t.isProgram(p));
      const hoisted = hoistStaticJSX(t, program, path.node);
      if (hoisted) {
        collectStaticNamespaces(path.node, program);
        path.replaceWith(hoisted);
        return;
      }
      const children = filterEmptyChildren(t, path.node.children, false);
      // Fragment: pass empty error array
      path.replaceWith(buildHellaNode(t, FRAGMENT_TAG, [], [], [], [], children, []));
    },
  };
}
