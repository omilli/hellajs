// Static-subtree hoisting (AST target only — the dom target's imperative sites fold
// statics into their template html instead).
//
// A fully-static JSX subtree (lowercase tag, literal-only props, no
// on:/e:/hook:/error: attributes, static text + static element children) is
// hoisted to a module-level constant tagged `static: true` and allocated once per
// site. The AST is shared by reference; component() clones the root per instance
// (the `static` spread), and the marker is inert server metadata — the server
// pipeline stringifies the shared AST directly.
//
// The safety rules mirror dom's documented static guarantee: shared AST roots
// carry zero per-instance state (no handlers/effects/hooks), so clones are inert
// and sharing the AST object is safe. Anything dynamic — expressions, components,
// prefixed attributes, spreads — disqualifies the subtree; static children of a
// disqualified parent still hoist individually.

import { processAttributes } from "../processors/attributes.mjs";
import { filterEmptyChildren } from "../processors/children.mjs";
import { buildChildrenValue } from "../builders/children.mjs";
import {
  buildHellaNode,
  booleanLiteral,
  identifier,
  isBooleanLiteral,
  isIdentifier,
  isNumericLiteral,
  isObjectProperty,
  isStringLiteral,
  objectProperty,
} from "../builders/vnode.mjs";
import { FRAGMENT_TAG } from "../constants.mjs";

/**
 * True if an emitted (estree) value is a plain literal safe to embed in a shared
 * static vnode: strings, numbers, booleans. Everything else (identifiers,
 * calls, arrows, template literals, …) is dynamic. Shared with the dom target's
 * imperative builder, whose template folding uses the same literal rule.
 * @param {import("estree").Expression} value
 * @returns {boolean}
 */
export function isLiteralValue(value) {
  return isStringLiteral(value) || isNumericLiteral(value) || isBooleanLiteral(value);
}

/**
 * Attempt to build a fully-static HellaNode object expression (with
 * `static: true`) from a raw JSXElement / JSXFragment. Returns null when any
 * safety rule fails. Reuses `processAttributes` / `filterEmptyChildren` so
 * normalization (whitespace collapsing, kebab-casing, child joining) is
 * byte-identical to the normal pipeline.
 * @param {import("estree-jsx").JSXElement | import("estree-jsx").JSXFragment} node
 * @returns {import("estree").ObjectExpression | null}
 */
export function tryBuildStaticJSX(node) {
  const isElement = node.type === "JSXElement";
  if (!isElement && node.type !== "JSXFragment") return null;

  if (isElement) {
    const name = node.openingElement.name;
    // Components (uppercase / member expressions) are never static
    if (name.type !== "JSXIdentifier" || !/^[a-z]/.test(name.name)) return null;
  }

  const attributes = isElement ? node.openingElement.attributes : [];
  const { props, on, hooks, e, error } = processAttributes(attributes, false);

  if (on.length > 0 || hooks.length > 0 || e.length > 0 || error.length > 0) return null;

  // Props must be plain literal values — no spreads, no expressions
  let i = 0;
  const len = props.length;
  while (i < len) {
    const prop = props[i++];
    if (!isObjectProperty(prop)) return null;
    if (!isIdentifier(prop.key) && !isStringLiteral(prop.key)) return null;
    if (!isLiteralValue(prop.value)) return null;
  }

  const filtered = filterEmptyChildren(node.children, false);
  const children = [];
  let ci = 0;
  const cLen = filtered.length;
  while (ci < cLen) {
    const child = filtered[ci++];
    if (isStringLiteral(child)) {
      children.push(child);
      continue;
    }
    if (child.type === "JSXElement" || child.type === "JSXFragment") {
      const staticChild = tryBuildStaticJSX(child);
      if (!staticChild) return null;
      children.push(staticChild);
      continue;
    }
    return null; // expression / spread child — dynamic
  }

  const tag = isElement ? node.openingElement.name.name : FRAGMENT_TAG;
  const vnode = buildHellaNode(
    tag,
    props,
    [],
    [],
    [],
    children.length > 0 ? buildChildrenValue(children) : null,
    [],
  );
  vnode.properties.push(objectProperty(identifier("static"), booleanLiteral(true)));
  return vnode;
}

/**
 * Build + hoist a static JSX subtree to a module-level `const`. Returns the
 * referencing Identifier, or null when the subtree is not fully static.
 * @param {import("estree-jsx").JSXElement | import("estree-jsx").JSXFragment} node
 * @param {import("./transform.mjs").TransformContext} ctx
 * @returns {import("estree").Identifier | null}
 */
export function hoistStaticJSX(node, ctx) {
  const vnode = tryBuildStaticJSX(node);
  if (!vnode) return null;
  const id = ctx.generateUid("hellaStatic");
  ctx.hoisted.push({ id, init: vnode });
  return id;
}
