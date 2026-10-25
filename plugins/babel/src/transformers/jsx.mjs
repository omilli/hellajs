import { FRAGMENT_TAG } from "../constants.mjs";
import { getTagCallee } from "../utils/babel.mjs";
import { processAttributes } from "../processors/attributes.mjs";
import { filterEmptyChildren } from "../processors/children.mjs";
import { buildHellaNode } from "../builders/vnode.mjs";
import { buildComponentCall } from "../builders/component.mjs";
import { buildImperativeSite } from "../builders/imperative.mjs";
import {
  ensureCreateComponentImport,
  ensureHooksFeatureImport,
  ensureErrorsFeatureImport,
  ensureDirectEventsFeatureImport,
  ensureNamespacesFeatureImport,
  ensureCustomElementsFeatureImport,
  ensureRuntimeImport,
} from "../utils/imports.mjs";
import { PASSTHROUGH_INJECTORS } from "../utils/passthrough.mjs";
import { hoistStaticJSX } from "../utils/static.mjs";

/**
 * Create JSX element and fragment transformers.
 *
 * Per-file feature detection: each JSX element reports the dom feature modules its
 * syntax needs (svg/math tags → namespaces; hyphenated tags → customElements;
 * hook:/error:/e: attributes → their subsystem's feature), and the Program exit emits
 * one bare side-effect import per needed feature so dom's gated runtime wiring loads
 * exactly when a file uses it.
 *
 * `target` selects the element-emission builder (wrapper-owned config, never
 * user-configurable per file): `"ast"` (default) lowers elements to HellaNode
 * objects for the walker; `"dom"` lowers them to imperative
 * `@hellajs/dom/runtime` construction. Component detection, passthrough handling,
 * feature collection, and fragment dispatch are shared — only element/fragment
 * expression emission differs.
 * @param {object} t
 * @param {object} options `{ target }` — validated by the plugin entry
 * @returns {{ Program: { exit(path): void }, JSXElement(path): void, JSXFragment(path): void }}
 */
export function createJSXTransformers(t, { target = "ast" } = {}) {
  // Program node → feature keys seen so far; the plugin instance is created per
  // transform, so the map never spans files.
  const featureImports = new Map();
  // Program node → @hellajs/dom/runtime import locals: export name → aliased uid
  // identifier (bare helper names would shadow against user variables like a
  // component prop named `text`).
  const runtimeImports = new Map();

  /**
   * Record one runtime helper for the program the node belongs to and return its
   * aliased uid identifier for immediate use in emitted code.
   * @param {import("@babel/core").NodePath} program
   * @param {string} name Runtime helper name (template / mark / prop / ...)
   * @returns {import("@babel/core").Identifier}
   */
  function collectRuntime(program, name) {
    let locals = runtimeImports.get(program.node);
    if (!locals) {
      locals = new Map();
      runtimeImports.set(program.node, locals);
    }
    let local = locals.get(name);
    if (!local) {
      local = program.scope.generateUidIdentifier(`hella${name[0].toUpperCase()}${name.slice(1)}`);
      locals.set(name, local);
    }
    return local;
  }

  /**
   * Record one feature key for the program the node belongs to.
   * @param {import("@babel/core").NodePath} program
   * @param {string} key Feature key (hooks / errors / directEvents / namespaces)
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
   * Scans a hoisted/folded static subtree's raw JSX for feature-triggering tags:
   * svg/math roots collect the namespaces key, hyphenated tag names collect the
   * customElements key. The hoist/site build replaces the subtree wholesale, so its
   * inner JSXElements are never visited and feature collection must run on the
   * pre-replacement node.
   * @param {import("@babel/core").JSXElement | import("@babel/core").JSXFragment} node
   * @param {import("@babel/core").NodePath} program
   */
  function collectStaticFeatures(node, program) {
    if (t.isJSXElement(node)) {
      const name = node.openingElement.name;
      if (t.isJSXIdentifier(name)) {
        if (name.name === "svg" || name.name === "math") {
          collectFeature(program, "namespaces");
        } else if (name.name.includes("-")) {
          collectFeature(program, "customElements");
        }
      }
    }
    let i = 0;
    const len = node.children.length;
    while (i < len) {
      const child = node.children[i++];
      if (t.isJSXElement(child) || t.isJSXFragment(child)) collectStaticFeatures(child, program);
    }
  }

  return {
    Program: {
      exit(programPath) {
        const features = featureImports.get(programPath.node);
        if (features) {
          if (features.has("hooks")) ensureHooksFeatureImport(t, programPath);
          if (features.has("errors")) ensureErrorsFeatureImport(t, programPath);
          if (features.has("directEvents")) ensureDirectEventsFeatureImport(t, programPath);
          if (features.has("namespaces")) ensureNamespacesFeatureImport(t, programPath);
          if (features.has("customElements")) ensureCustomElementsFeatureImport(t, programPath);
        }
        const used = runtimeImports.get(programPath.node);
        if (used) ensureRuntimeImport(t, programPath, used);
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

      // Hyphenated intrinsic tags are custom-element candidates whose template clones
      // need the upgrade pass loaded — same pre-fold placement as the namespaces key
      // (the static scan below covers the folded subtree's inner elements; dynamic
      // elements under the ast target reach this check through their own visits).
      if (!isComponent && tagName && tagName.includes("-")) {
        collectFeature(program, "customElements");
      }

      // Fully-static subtree — hoist to a module const (AST target only; the
      // imperative site below folds statics into its template html). Hoisting skips
      // the normal pipeline entirely, so children are never traversed
      // (static subtrees contain no components, so no import injection is lost)
      if (!isComponent) {
        if (target === "dom") {
          // Imperative site. The namespace scan runs on the pre-replacement node:
          // folded svg/math descendants never get their own visitor call. Template
          // structure carries its own namespace through the html parse for inline
          // svg/math switches; svg-interior nested sites thread the ancestry through
          // the site builder and emit the parse ns argument. The feature import only
          // covers dom-side createElement dispatch. The site builder reports the
          // prefixed-attr features its elements carried.
          const site = buildImperativeSite(t, program, path.node, (name) =>
            collectRuntime(program, name),
          );
          collectStaticFeatures(path.node, program);
          if (site.features.hooks) collectFeature(program, "hooks");
          if (site.features.errors) collectFeature(program, "errors");
          if (site.features.direct) collectFeature(program, "directEvents");
          path.replaceWith(site.call);
          return;
        }
        const hoisted = hoistStaticJSX(t, program, path.node);
        if (hoisted) {
          collectStaticFeatures(path.node, program);
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
      if (target === "dom") {
        const site = buildImperativeSite(t, program, path.node, (name) =>
          collectRuntime(program, name),
        );
        collectStaticFeatures(path.node, program);
        if (site.features.hooks) collectFeature(program, "hooks");
        if (site.features.errors) collectFeature(program, "errors");
        if (site.features.direct) collectFeature(program, "directEvents");
        path.replaceWith(site.call);
        return;
      }
      const hoisted = hoistStaticJSX(t, program, path.node);
      if (hoisted) {
        collectStaticFeatures(path.node, program);
        path.replaceWith(hoisted);
        return;
      }
      const children = filterEmptyChildren(t, path.node.children, false);
      // Fragment: pass empty error array
      path.replaceWith(buildHellaNode(t, FRAGMENT_TAG, [], [], [], [], children, []));
    },
  };
}
