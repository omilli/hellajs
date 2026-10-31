// Walker core — the engine's acorn/estree transform pass. One
// pre-order pass replaces every JSXElement/JSXFragment in expression slots and
// then recurses into the replacement (buildHellaNode/buildComponentCall embed
// raw JSX children verbatim; the dom target's site builder embeds them in
// `child(...)` call args) — an outermost-first revisit of
// replacements. Component detection, passthrough
// handling, per-file feature collection, and fragment dispatch are shared by
// both targets — only element/fragment expression emission differs.
//
// Scope machinery: hoisted consts and aliased runtime-helper locals collect
// into the per-transform context, and uid names come from `_hella`-prefixed
// per-base counters seeded by a program-scope name scan — collision-free
// against user bindings, deterministic output.

import { FRAGMENT_TAG } from "./constants.mjs";
import { processAttributes } from "./processors/attributes.mjs";
import { filterEmptyChildren } from "./processors/children.mjs";
import { buildChildrenValue } from "./builders/children.mjs";
import {
  buildHellaNode,
  identifier,
  memberExpression,
  variableDeclaration,
  variableDeclarator,
} from "./builders/vnode.mjs";
import { buildComponentCall } from "./builders/component.mjs";
import { buildImperativeSite } from "./builders/imperative.mjs";
import {
  ensureCreateComponentImport,
  ensureHooksFeatureImport,
  ensureErrorsFeatureImport,
  ensureDirectEventsFeatureImport,
  ensureNamespacesFeatureImport,
  ensureCustomElementsFeatureImport,
  ensureRuntimeImport,
} from "./utils/imports.mjs";
import { PASSTHROUGH_INJECTORS } from "./utils/passthrough.mjs";
import { hoistStaticJSX } from "./utils/static.mjs";

/**
 * @typedef {object} TransformContext
 * @property {"ast" | "dom"} target Emission target.
 * @property {import("estree").Program} program The program under transform.
 * @property {Set<string>} features Collected feature keys (hooks / errors / directEvents / namespaces / customElements).
 * @property {Map<string, import("estree").Identifier>} runtimeImports Runtime export name → aliased uid local.
 * @property {Set<string>} usedNames Every identifier name the output may carry (seeded from the parsed program, grown by uid allocation).
 * @property {Map<string, number>} uidCounters Per-uid-base counter state.
 * @property {{ id: import("estree").Identifier, init: import("estree").Expression }[]} hoisted Module-level consts awaiting the merged top-of-file declaration.
 * @property {number} replaced JSX slots replaced (zero → the program carried no JSX).
 * @property {(base: string) => import("estree").Identifier} generateUid Collision-free `_hella`-prefixed uid allocator.
 */

/**
 * Collect every identifier name in the parsed program into one conservative
 * collision set: generated `_hella*` uids never shadow or collide with any user
 * binding, property, or reference (over-approximation is the safe direction).
 * @param {import("estree").Program} program
 * @returns {Set<string>}
 */
function seedUsedNames(program) {
  const names = new Set();
  let i = 0;
  const len = program.body.length;
  while (i < len) scanNames(program.body[i++], names);
  return names;
}

/**
 * Recursive identifier-name scan over one node.
 * @param {unknown} node
 * @param {Set<string>} names
 */
function scanNames(node, names) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    let i = 0;
    while (i < node.length) scanNames(node[i++], names);
    return;
  }
  if (typeof node.type !== "string") return;
  if (node.type === "Identifier") names.add(node.name);
  const keys = Object.keys(node);
  let i = 0;
  while (i < keys.length) {
    const key = keys[i++];
    if (key === "type" || key === "loc" || key === "range" || key === "start" || key === "end")
      continue;
    scanNames(node[key], names);
  }
}

/**
 * Collision-free `_hella`-prefixed uid allocator: per-base counters over the
 * seeded used-name set (`_hellaTpl`, then `_hellaTpl2`, …) — deterministic for
 * the parity suite.
 * @param {TransformContext} ctx
 * @param {string} base camelCase base name (e.g. `hellaStatic`)
 * @returns {import("estree").Identifier}
 */
function generateUid(ctx, base) {
  const sanitized = base.replace(/^_/, "").replace(/[0-9]+$/g, "");
  let count = ctx.uidCounters.get(sanitized) ?? 0;
  let name = `_${sanitized}`;
  while (ctx.usedNames.has(name)) {
    count++;
    name = `_${sanitized}${count + 1}`;
  }
  ctx.uidCounters.set(sanitized, count);
  ctx.usedNames.add(name);
  return identifier(name);
}

/**
 * Resolve a JSX tag name to an estree callee: JSXIdentifier → Identifier,
 * JSXMemberExpression → MemberExpression (recursive); throws otherwise
 * (namespaced element tags carry no callee in either target).
 * @param {import("estree-jsx").JSXIdentifier | import("estree-jsx").JSXMemberExpression | import("estree-jsx").JSXNamespacedName} nameNode
 * @returns {import("estree").Identifier | import("estree").MemberExpression}
 * @throws {Error} When the JSX tag name is neither a JSXIdentifier nor a JSXMemberExpression.
 */
function resolveTagCallee(nameNode) {
  if (nameNode.type === "JSXIdentifier") {
    return identifier(nameNode.name);
  }

  if (nameNode.type === "JSXMemberExpression") {
    const object = resolveTagCallee(nameNode.object);
    const property = identifier(nameNode.property.name);
    return memberExpression(object, property);
  }

  throw new Error(`[hellajs-compiler] unsupported JSX tag name, received ${nameNode.type}`);
}

/**
 * True when the node is a JSX expression position.
 * @param {unknown} node
 * @returns {boolean}
 */
function isJSXNode(node) {
  return (
    node !== null &&
    typeof node === "object" &&
    (node.type === "JSXElement" || node.type === "JSXFragment")
  );
}

/**
 * Replace one JSX node with its emitted expression (the shared
 * JSXElement/JSXFragment dispatch).
 * @param {import("estree-jsx").JSXElement | import("estree-jsx").JSXFragment} node
 * @param {TransformContext} ctx
 * @returns {import("estree").Expression}
 */
function replaceJSXNode(node, ctx) {
  ctx.replaced++;
  return node.type === "JSXElement" ? replaceJSXElement(node, ctx) : replaceJSXFragment(node, ctx);
}

/**
 * Report the collected dom feature keys of a built imperative site.
 * @param {{ features: { hooks: boolean, errors: boolean, direct: boolean } }} site
 * @param {TransformContext} ctx
 */
function collectSiteFeatures(site, ctx) {
  if (site.features.hooks) ctx.features.add("hooks");
  if (site.features.errors) ctx.features.add("errors");
  if (site.features.direct) ctx.features.add("directEvents");
}

/**
 * Scan a hoisted/folded static subtree's raw JSX for feature-triggering tags:
 * svg/math roots collect the namespaces key, hyphenated tag names collect the
 * customElements key. The hoist/site build replaces the subtree wholesale, so its
 * inner JSXElements are never visited and feature collection must run on the
 * pre-replacement node.
 * @param {import("estree-jsx").JSXElement | import("estree-jsx").JSXFragment} node
 * @param {TransformContext} ctx
 */
function collectStaticFeatures(node, ctx) {
  if (node.type === "JSXElement") {
    const name = node.openingElement.name;
    if (name.type === "JSXIdentifier") {
      if (name.name === "svg" || name.name === "math") {
        ctx.features.add("namespaces");
      } else if (name.name.includes("-")) {
        ctx.features.add("customElements");
      }
    }
  }
  let i = 0;
  const len = node.children.length;
  while (i < len) {
    const child = node.children[i++];
    if (child.type === "JSXElement" || child.type === "JSXFragment")
      collectStaticFeatures(child, ctx);
  }
}

/**
 * Replace a JSXElement with its target emission (resolve callee,
 * svg/math + hyphenated feature keys, static hoist or dom site,
 * then the shared attribute/child categorization).
 * @param {import("estree-jsx").JSXElement} node
 * @param {TransformContext} ctx
 * @returns {import("estree").Expression}
 */
function replaceJSXElement(node, ctx) {
  const opening = node.openingElement;
  const tagCallee = resolveTagCallee(opening.name);
  const tagName = opening.name.type === "JSXIdentifier" ? opening.name.name : null;
  const isComponent =
    (opening.name.type === "JSXIdentifier" && /^[A-Z]/.test(opening.name.name)) ||
    opening.name.type === "JSXMemberExpression";

  // svg/math roots create in their foreign namespace — before the static-hoist
  // early return, since a literal-prop svg subtree still hoists.
  if (tagName === "svg" || tagName === "math") {
    ctx.features.add("namespaces");
  }

  // Hyphenated intrinsic tags are custom-element candidates whose template clones
  // need the upgrade pass loaded — same pre-fold placement as the namespaces key
  // (the static scan below covers the folded subtree's inner elements; dynamic
  // elements under the ast target reach this check through their own visits).
  if (!isComponent && tagName !== null && tagName.includes("-")) {
    ctx.features.add("customElements");
  }

  // Fully-static subtree — hoist to a module const (AST target only; the
  // imperative site below folds statics into its template html). Hoisting skips
  // the normal pipeline entirely, so children are never traversed
  // (static subtrees contain no components, so no import injection is lost)
  if (!isComponent) {
    if (ctx.target === "dom") {
      // Imperative site. The namespace scan runs on the pre-replacement node:
      // folded svg/math descendants never get their own visitor call. Template
      // structure carries its own namespace through the html parse for inline
      // svg/math switches; svg-interior nested sites thread the ancestry through
      // the site builder and emit the parse ns argument. The feature import only
      // covers dom-side createElement dispatch. The site builder reports the
      // prefixed-attr features its elements carried.
      const site = buildImperativeSite(node, ctx, (name) => collectRuntime(ctx, name));
      collectStaticFeatures(node, ctx);
      collectSiteFeatures(site, ctx);
      return site.call;
    }
    const hoisted = hoistStaticJSX(node, ctx);
    if (hoisted) {
      collectStaticFeatures(node, ctx);
      return hoisted;
    }
  }

  const { props, on, hooks, e, error, features } = processAttributes(
    opening.attributes,
    isComponent,
  );
  if (features.hooks) ctx.features.add("hooks");
  if (features.errors) ctx.features.add("errors");
  if (features.direct) ctx.features.add("directEvents");

  const children = filterEmptyChildren(node.children, isComponent);

  if (isComponent) {
    if (tagName !== null && PASSTHROUGH_INJECTORS[tagName]) {
      PASSTHROUGH_INJECTORS[tagName](ctx.program);
    } else {
      ensureCreateComponentImport(ctx.program);
    }

    const allProps = [...props];
    if (on.length > 0) allProps.push(...on);
    if (e.length > 0) allProps.push(...e);
    if (hooks.length > 0) allProps.push(...hooks);
    if (error.length > 0) allProps.push(...error);
    return buildComponentCall(tagCallee, allProps, children);
  }
  return buildHellaNode(
    opening.name.name,
    props,
    on,
    e,
    hooks,
    children.length > 0 ? buildChildrenValue(children) : null,
    error,
  );
}

/**
 * Replace a JSXFragment with its target emission.
 * @param {import("estree-jsx").JSXFragment} node
 * @param {TransformContext} ctx
 * @returns {import("estree").Expression}
 */
function replaceJSXFragment(node, ctx) {
  if (ctx.target === "dom") {
    const site = buildImperativeSite(node, ctx, (name) => collectRuntime(ctx, name));
    collectStaticFeatures(node, ctx);
    collectSiteFeatures(site, ctx);
    return site.call;
  }
  const hoisted = hoistStaticJSX(node, ctx);
  if (hoisted) {
    collectStaticFeatures(node, ctx);
    return hoisted;
  }
  const children = filterEmptyChildren(node.children, false);
  // Fragment: pass empty error array
  return buildHellaNode(
    FRAGMENT_TAG,
    [],
    [],
    [],
    [],
    children.length > 0 ? buildChildrenValue(children) : null,
    [],
  );
}

/**
 * Record one runtime helper for the transform and return its aliased uid
 * identifier for immediate use in emitted code.
 * @param {TransformContext} ctx
 * @param {string} name Runtime helper name (template / mark / prop / ...)
 * @returns {import("estree").Identifier}
 */
function collectRuntime(ctx, name) {
  let local = ctx.runtimeImports.get(name);
  if (!local) {
    local = ctx.generateUid(`hella${name[0].toUpperCase()}${name.slice(1)}`);
    ctx.runtimeImports.set(name, local);
  }
  return local;
}

/**
 * Replace every JSX expression slot in the tree, outermost first, recursing
 * into each replacement (raw JSX children embedded by the builders become
 * slots of the replacement tree).
 * @param {import("estree").Node} node
 * @param {TransformContext} ctx
 */
function visitNode(node, ctx) {
  if (!node || typeof node.type !== "string") return;
  const keys = Object.keys(node);
  let i = 0;
  while (i < keys.length) {
    const key = keys[i++];
    if (key === "loc" || key === "range" || key === "start" || key === "end") continue;
    let value = node[key];
    if (!value || typeof value !== "object") continue;
    if (Array.isArray(value)) {
      let j = 0;
      while (j < value.length) {
        const item = value[j];
        if (item && typeof item === "object" && typeof item.type === "string") {
          if (isJSXNode(item)) value[j] = replaceJSXNode(item, ctx);
          visitNode(value[j], ctx);
        }
        j++;
      }
    } else if (typeof value.type === "string") {
      if (isJSXNode(value)) {
        value = replaceJSXNode(value, ctx);
        node[key] = value;
      }
      visitNode(value, ctx);
    }
  }
}

/**
 * Transform one parsed program in place: replace all JSX, emit the feature and
 * `@hellajs/dom/runtime` imports (fixed order, unshift-at-front), prepend the
 * merged hoisted-const declaration, and
 * return the program. Returns null when the program carried no JSX (the
 * wrapper then lets Vite/Rollup handle the file natively).
 * @param {import("estree").Program} program
 * @param {{ target: "ast" | "dom" }} options
 * @returns {import("estree").Program | null}
 * @throws {Error} When a JSX tag name has no callee in either target.
 */
export function transformProgram(program, options) {
  /** @type {TransformContext} */
  const ctx = {
    target: options.target,
    program,
    features: new Set(),
    runtimeImports: new Map(),
    usedNames: seedUsedNames(program),
    uidCounters: new Map(),
    hoisted: [],
    replaced: 0,
    generateUid: (base) => generateUid(ctx, base),
  };

  visitNode(program, ctx);
  if (ctx.replaced === 0) return null;

  // Program exit: one bare side-effect import per needed feature (fixed order
  // for deterministic output), then the runtime import — all unshifted at the
  // body front.
  if (ctx.features.has("hooks")) ensureHooksFeatureImport(program);
  if (ctx.features.has("errors")) ensureErrorsFeatureImport(program);
  if (ctx.features.has("directEvents")) ensureDirectEventsFeatureImport(program);
  if (ctx.features.has("namespaces")) ensureNamespacesFeatureImport(program);
  if (ctx.features.has("customElements")) ensureCustomElementsFeatureImport(program);
  if (ctx.runtimeImports.size > 0) ensureRuntimeImport(program, ctx.runtimeImports);

  // Merged hoisted declaration above every import:
  // `const _hellaStatic = …, _hellaTpl = …;`
  if (ctx.hoisted.length > 0) {
    program.body.unshift(
      variableDeclaration(
        "const",
        ctx.hoisted.map(({ id, init }) => variableDeclarator(id, init)),
      ),
    );
  }
  return program;
}
