// Static-subtree hoisting.
//
// A fully-static JSX / html`` subtree (lowercase tag, literal-only props, no
// on:/e:/hook:/error: attributes, static text + static element children) is
// hoisted to a module-level constant tagged `static: true`. dom's `staticDom`
// WeakMap then mounts every later use of that constant via a single
// `cloneNode(true)` instead of re-walking construction, and the constant is
// allocated once per site instead of per call.
//
// The safety rules mirror dom's documented static guarantee: cached prototypes
// carry zero ElementState (no handlers/effects/hooks), so clones are inert and
// sharing the AST object is safe. Anything dynamic — expressions, components,
// prefixed attributes, spreads — disqualifies the subtree; static children of a
// disqualified parent still hoist individually.

import { processAttributes } from "../processors/attributes.mjs";
import { filterEmptyChildren } from "../processors/children.mjs";
import { buildHellaNode } from "../builders/vnode.mjs";
import { FRAGMENT_TAG } from "../constants.mjs";

/** Attribute buckets a hoisted node must never carry. */
const STATE_BEARING_KEYS = new Set(["on", "e", "hooks", "error"]);

/**
 * True if an emitted (Babel) value is a plain literal safe to embed in a shared
 * static vnode: strings, numbers, booleans. Everything else (identifiers,
 * calls, arrows, template literals, …) is dynamic.
 * @param {typeof import("@babel/core").types} t
 * @param {any} value
 * @returns {boolean}
 */
function isLiteralValue(t, value) {
  return t.isStringLiteral(value) ||
    t.isNumericLiteral(value) ||
    t.isBooleanLiteral(value);
}

/**
 * Attempt to build a fully-static HellaNode object expression (with
 * `static: true`) from a raw JSXElement / JSXFragment. Returns null when any
 * safety rule fails. Reuses `processAttributes` / `filterEmptyChildren` so
 * normalization (whitespace collapsing, kebab-casing, child joining) is
 * byte-identical to the normal pipeline.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").JSXElement | import("@babel/core").JSXFragment} node
 * @returns {import("@babel/core").ObjectExpression | null}
 */
export function tryBuildStaticJSX(t, node) {
  const isElement = t.isJSXElement(node);
  if (!isElement && !t.isJSXFragment(node)) return null;

  if (isElement) {
    const name = node.openingElement.name;
    // Components (uppercase / member expressions) are never static
    if (!t.isJSXIdentifier(name) || !/^[a-z]/.test(name.name)) return null;
  }

  const attributes = isElement ? node.openingElement.attributes : [];
  const { props, on, hooks, e, error } = processAttributes(t, attributes, false);

  if (on.length > 0 || hooks.length > 0 || e.length > 0 || error.length > 0) return null;

  // Props must be plain literal values — no spreads, no expressions
  for (const prop of props) {
    if (!t.isObjectProperty(prop)) return null;
    if (!t.isIdentifier(prop.key) && !t.isStringLiteral(prop.key)) return null;
    if (!isLiteralValue(t, prop.value)) return null;
  }

  const filtered = filterEmptyChildren(t, node.children, false);
  const children = [];
  for (const child of filtered) {
    if (t.isStringLiteral(child)) {
      children.push(child);
      continue;
    }
    if (t.isJSXElement(child) || t.isJSXFragment(child)) {
      const staticChild = tryBuildStaticJSX(t, child);
      if (!staticChild) return null;
      children.push(staticChild);
      continue;
    }
    return null;   // expression / spread child — dynamic
  }

  const tag = isElement ? node.openingElement.name.name : FRAGMENT_TAG;
  const vnode = buildHellaNode(t, tag, props, [], [], [], children, []);
  vnode.properties.push(t.objectProperty(t.identifier("static"), t.booleanLiteral(true)));
  return vnode;
}

/**
 * True if an emitted Babel ObjectExpression is a fully-static HellaNode:
 * `tag` string literal, no state-bearing buckets, literal-only props, and
 * children that are static text or other fully-static vnodes. Slots and
 * components have already been substituted with arbitrary expressions by the
 * time this runs, so they fail the literal checks naturally.
 * @param {typeof import("@babel/core").types} t
 * @param {any} node
 * @returns {boolean}
 */
function isStaticVNodeExpr(t, node) {
  if (!t.isObjectExpression(node)) return false;

  let hasTag = false;
  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop)) return false;

    const key = t.isIdentifier(prop.key) ? prop.key.name : t.isStringLiteral(prop.key) ? prop.key.value : null;
    if (key === null) return false;

    if (key === "tag") {
      if (!t.isStringLiteral(prop.value)) return false;
      hasTag = true;
      continue;
    }
    if (key === "static") continue;

    if (STATE_BEARING_KEYS.has(key)) return false;

    if (key === "children") {
      if (!t.isArrayExpression(prop.value)) return false;
      for (const element of prop.value.elements) {
        if (element === null) return false;
        if (t.isStringLiteral(element)) continue;
        if (isStaticVNodeExpr(t, element)) continue;
        return false;
      }
      continue;
    }

    // props (and any unknown bucket) — literal values only
    if (t.isObjectExpression(prop.value)) {
      for (const inner of prop.value.properties) {
        if (!t.isObjectProperty(inner)) return false;
        if (!isLiteralValue(t, inner.value)) return false;
      }
      continue;
    }
    return false;
  }

  return hasTag;
}

/**
 * Hoist a static vnode object expression to a module-level `const` and return
 * the referencing Identifier.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 * @param {import("@babel/core").ObjectExpression} vnode
 * @returns {import("@babel/core").Identifier}
 */
function hoistVNode(t, program, vnode) {
  const id = program.scope.generateUidIdentifier("hellaStatic");
  program.scope.push({ id, init: vnode, kind: "const" });
  return id;
}

/**
 * Hoist every fully-static subtree inside an emitted `html`` expression:
 * the whole expression when static, otherwise each static child subtree
 * (recursively). Returns the (possibly rewritten) expression.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 * @param {any} node
 * @returns {any}
 */
export function hoistStaticSubtrees(t, program, node) {
  if (!t.isObjectExpression(node)) return node;

  if (isStaticVNodeExpr(t, node)) {
    const withFlag = t.cloneNode(node);
    withFlag.properties.push(t.objectProperty(t.identifier("static"), t.booleanLiteral(true)));
    return hoistVNode(t, program, withFlag);
  }

  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop) || !t.isArrayExpression(prop.value)) continue;
    const key = t.isIdentifier(prop.key) ? prop.key.name : null;
    if (key !== "children") continue;

    const elements = prop.value.elements;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element && t.isObjectExpression(element) && isStaticVNodeExpr(t, element)) {
        const withFlag = t.cloneNode(element);
        withFlag.properties.push(t.objectProperty(t.identifier("static"), t.booleanLiteral(true)));
        elements[i] = hoistVNode(t, program, withFlag);
      } else if (element && t.isObjectExpression(element)) {
        hoistStaticSubtrees(t, program, element);
      }
    }
  }

  return node;
}

/**
 * Build + hoist a static JSX subtree. Returns the referencing Identifier, or
 * null when the subtree is not fully static.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 * @param {import("@babel/core").JSXElement | import("@babel/core").JSXFragment} node
 * @returns {import("@babel/core").Identifier | null}
 */
export function hoistStaticJSX(t, program, node) {
  const vnode = tryBuildStaticJSX(t, node);
  if (!vnode) return null;
  return hoistVNode(t, program, vnode);
}
