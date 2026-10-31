// Imperative emission (target: "dom").
//
// The ast target lowers an element to a HellaNode object the walker interprets at
// mount; the dom target lowers the SAME categorization (processAttributes /
// filterEmptyChildren / maybeReactive / the tryBuildStaticJSX static predicate) to
// straight-line construction: one template()/fragment() const per site (the parse is
// cached by html string + parse namespace), one marked build fn per expression (invoked
// by mount / ForEach / component() / child()), and one wiring call per dynamic site
// (prop / on / direct / hook / errorConfig / text / child) addressing anchors by
// compiler-computed child-index paths (root.children[1].firstElementChild).
//
// Folding rules: compile-time literal props (minus property-assigned keys) and the
// leading static run of children fold into the template html — the runtime never
// re-walks them. The first dynamic child ends the fold; everything after it emits as
// runtime calls in document order, so runtime appends land after the folded prefix
// and node order is preserved.

import { processAttributes } from "../processors/attributes.mjs";
import { filterEmptyChildren } from "../processors/children.mjs";
import { isLiteralValue, tryBuildStaticJSX } from "../utils/static.mjs";
import {
  arrowFunctionExpression,
  blockStatement,
  booleanLiteral,
  callExpression,
  expressionStatement,
  functionExpression,
  identifier,
  isBooleanLiteral,
  isIdentifier,
  isObjectProperty,
  isStringLiteral,
  memberExpression,
  numericLiteral,
  objectExpression,
  objectProperty,
  returnStatement,
  spreadElement,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
} from "../builders/vnode.mjs";

// renderProp assigns these keys as element properties (form state, raw html) —
// folding them into template html would change semantics (live value vs default
// value; parsed html vs property assignment), so they always emit as prop() sites
// and disqualify an otherwise-static subtree from template folding.
const PROPERTY_KEYS = new Set(["value", "checked", "selected", "innerHTML"]);

// Void html elements serialize without an end tag — a trailing end tag would parse
// as a SECOND element (the html parser synthesizes `<br>` for `</br>`).
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

// Raw-text elements: their text children are literal data — entity-escaping would
// corrupt the content (css selectors like `a > b`, js `&&`).
const RAW_TEXT_TAGS = new Set(["style", "script"]);

// Parse namespaces for foreign-interior templates, keyed by the JSX ancestry tag that
// establishes them. The compiler knows the ancestry statically; the runtime's template
// parse takes the URI as its `ns` argument instead of consulting tag tables.
const NS_URIS = { svg: "http://www.w3.org/2000/svg", math: "http://www.w3.org/1998/Math/MathML" };

/**
 * Escapes text for entity-safe embedding in element content.
 * @param {string} value Raw text
 * @returns {string} Escaped text
 */
function escapeText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/**
 * Escapes a value for embedding in a double-quoted html attribute.
 * @param {string} value Raw attribute value
 * @returns {string} Escaped attribute value
 */
function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * True when the JSX node is a component position (uppercase identifier or member
 * expression) — components keep the shared emission in both targets.
 * @param {import("estree-jsx").JSXElement} node
 * @returns {boolean}
 */
function isComponentNode(node) {
  const name = node.openingElement.name;
  return (
    (name.type === "JSXIdentifier" && /^[A-Z]/.test(name.name)) ||
    name.type === "JSXMemberExpression"
  );
}

/**
 * True when a subtree qualifies for template folding: fully static per
 * `tryBuildStaticJSX` AND carrying no property-assigned keys (their renderProp
 * semantics cannot fold into html).
 * @param {import("estree-jsx").JSXElement | import("estree-jsx").JSXFragment} node
 * @returns {boolean}
 */
function isTemplateEligible(node) {
  const vnode = tryBuildStaticJSX(node);
  if (!vnode) return false;
  let i = 0;
  while (i < vnode.properties.length) {
    const property = vnode.properties[i++];
    if (
      isObjectProperty(property) &&
      isIdentifier(property.key, "props") &&
      property.value.type === "ObjectExpression"
    ) {
      let j = 0;
      while (j < property.value.properties.length) {
        const prop = property.value.properties[j++];
        if (isObjectProperty(prop) && isIdentifier(prop.key) && PROPERTY_KEYS.has(prop.key.name)) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Builds the anchor member-expression for a folded element: `_hellaRoot` for the
 * site root, then `firstElementChild` for the first element child and
 * `children[n]` for later ones — element indices, since static text never creates
 * elements and dynamic children are omitted from the template.
 * @param {number[]} steps Element-child indices from the site root
 * @returns {import("estree").MemberExpression | import("estree").Identifier}
 */
function anchorExpression(steps) {
  let expr = identifier("_hellaRoot");
  let i = 0;
  while (i < steps.length) {
    const index = steps[i++];
    if (index === 0) {
      expr = memberExpression(expr, identifier("firstElementChild"));
    } else {
      expr = memberExpression(expr, identifier("children"));
      expr = memberExpression(expr, numericLiteral(index), true);
    }
  }
  return expr;
}

/**
 * Serializes one foldable literal prop: `true` renders a bare attribute, `false` /
 * `null` render nothing (the parser's absence is equivalent to renderProp's
 * removeAttribute), strings and numbers render as quoted values.
 * @param {import("estree").Property} prop
 * @returns {string} Html attribute source (possibly empty)
 */
function serializeProp(prop) {
  const name = isIdentifier(prop.key) ? prop.key.name : prop.key.value;
  if (isBooleanLiteral(prop.value)) return prop.value.value ? ` ${name}` : "";
  return ` ${name}="${escapeAttr(String(prop.value.value))}"`;
}

/**
 * True when a prop folds into the template html: a plain literal value whose key
 * renders through setAttribute (never the property-assigned keys).
 * @param {import("estree").Property} prop
 * @returns {boolean}
 */
function isFoldableProp(prop) {
  const key = isIdentifier(prop.key) ? prop.key.name : prop.key.value;
  return isLiteralValue(prop.value) && !PROPERTY_KEYS.has(key);
}

/**
 * Extracts the root element's `key` attribute as mark() reconciliation metadata:
 * renderProp never renders `key`, and ForEach reads it off the flagged fn — folding
 * it into html would mint a real attribute no walker ever created.
 * @param {import("estree-jsx").JSXElement} node Mutated: the key attribute is spliced out
 * @returns {import("estree").Expression | null} The key value expression
 */
function extractKeyAttr(node) {
  const attributes = node.openingElement.attributes;
  let i = 0;
  while (i < attributes.length) {
    const attr = attributes[i++];
    if (
      attr.type === "JSXAttribute" &&
      attr.name.type === "JSXIdentifier" &&
      attr.name.name === "key"
    ) {
      attributes.splice(i - 1, 1);
      if (!attr.value) return booleanLiteral(true);
      return attr.value.expression !== undefined ? attr.value.expression : attr.value;
    }
  }
  return null;
}

/**
 * Emits one wiring statement appending to `statements`.
 * @param {import("estree").Statement[]} statements Accumulator
 * @param {import("estree").Expression} callee Helper identifier
 * @param {(import("estree").Expression | import("estree").SpreadElement)[]} args Call arguments
 */
function pushCall(statements, callee, args) {
  statements.push(expressionStatement(callExpression(callee, args)));
}

/**
 * Serializes one element/fragment subtree into template html, collecting the
 * dynamic wiring statements in document order and the prefixed-attr features its
 * elements carried. Literal props minus property keys fold; the children fold only
 * up to the first dynamic child — after it, every child emits as a runtime call
 * (static text → `text`, static subtrees → nested sites, expressions →
 * `text`/`child` by whether they contain element JSX).
 * @param {import("./transform.mjs").TransformContext} ctx
 * @param {(name: string) => import("estree").Identifier} helper Records the runtime helper and returns its identifier
 * @param {import("estree").Statement[]} statements Wiring statements accumulator
 * @param {number[]} steps Element-child indices from the site root
 * @param {import("estree").Identifier} buildRef The site build fn's own name — errorConfig's reset slot
 * @param {import("estree-jsx").JSXElement | import("estree-jsx").JSXFragment} node
 * @param {{ hooks: boolean, errors: boolean, direct: boolean }} features Feature flags accumulated across the subtree
 * @param {string | undefined} ns Current parse context (`"svg"` / `"math"` once inside
 * foreign ancestry; `foreignObject` resets to undefined) — threaded to nested template
 * sites so each hoisted string parses with its authored namespace
 * @returns {string} The subtree's template html
 */
function walkNode(ctx, helper, statements, steps, buildRef, node, features, ns) {
  const isFragment = node.type === "JSXFragment";
  let tag = null;
  let attrs = { props: [], on: [], hooks: [], e: [], error: [] };
  if (!isFragment) {
    // Element-position tags must be plain identifiers — the shared "unsupported
    // JSX tag name" error fires for namespaced names (ast parity; member
    // expressions are components and never reach this walker).
    if (node.openingElement.name.type !== "JSXIdentifier") {
      throw new Error(
        `[hellajs-compiler] unsupported JSX tag name, received ${node.openingElement.name.type}`,
      );
    }
    tag = node.openingElement.name.name;
    attrs = processAttributes(node.openingElement.attributes, false);
    if (attrs.features.hooks) features.hooks = true;
    if (attrs.features.errors) features.errors = true;
    if (attrs.features.direct) features.direct = true;
  }
  // Ancestry update for descendants: svg/math establish their namespace, foreignObject is
  // the HTML integration point (its interior resets), everything else inherits.
  if (tag === "svg" || tag === "math") ns = tag;
  else if (ns !== undefined && tag !== null && tag.toLowerCase() === "foreignobject")
    ns = undefined;
  const anchor = anchorExpression(steps);

  let html = isFragment ? "" : `<${tag}`;
  if (!isFragment) {
    let i = 0;
    while (i < attrs.props.length) {
      const prop = attrs.props[i++];
      if (prop.type === "SpreadElement") {
        // Runtime spread: each key routes through prop() so renderProp's per-key
        // dispatch (property keys, falsy removal, reactive values) applies verbatim.
        const source = prop.argument;
        pushCall(
          statements,
          memberExpression(
            callExpression(memberExpression(identifier("Object"), identifier("keys")), [source]),
            identifier("forEach"),
          ),
          [
            arrowFunctionExpression(
              [identifier("k")],
              callExpression(helper("prop"), [
                anchor,
                identifier("k"),
                memberExpression(source, identifier("k"), true),
              ]),
            ),
          ],
        );
      } else if (isFoldableProp(prop)) {
        html += serializeProp(prop);
      } else {
        pushCall(statements, helper("prop"), [
          anchor,
          stringLiteral(isIdentifier(prop.key) ? prop.key.name : prop.key.value),
          prop.value,
        ]);
      }
    }
    i = 0;
    while (i < attrs.on.length) {
      const prop = attrs.on[i++];
      pushCall(statements, helper("on"), [anchor, stringLiteral(prop.key.name), prop.value]);
    }
    i = 0;
    while (i < attrs.e.length) {
      const prop = attrs.e[i++];
      pushCall(statements, helper("direct"), [anchor, stringLiteral(prop.key.name), prop.value]);
    }
    i = 0;
    while (i < attrs.hooks.length) {
      const prop = attrs.hooks[i++];
      pushCall(statements, helper("hook"), [anchor, stringLiteral(prop.key.name), prop.value]);
    }
    if (attrs.error.length > 0) {
      pushCall(statements, helper("errorConfig"), [
        anchor,
        objectExpression(attrs.error),
        buildRef,
      ]);
    }
    html += ">";
  }

  const children = filterEmptyChildren(node.children, false);
  const rawText = tag !== null && RAW_TEXT_TAGS.has(tag);
  let leadingStatic = true;
  let elementIndex = 0;
  let i = 0;
  while (i < children.length) {
    const childNode = children[i++];
    if (isStringLiteral(childNode)) {
      if (leadingStatic) {
        html += rawText ? childNode.value : escapeText(childNode.value);
      } else {
        pushCall(statements, helper("text"), [anchor, childNode]);
      }
    } else if (childNode.type === "JSXElement" || childNode.type === "JSXFragment") {
      if (childNode.type === "JSXElement" && isComponentNode(childNode)) {
        leadingStatic = false;
        pushCall(statements, helper("child"), [anchor, childNode]);
      } else if (leadingStatic && isTemplateEligible(childNode)) {
        html += walkNode(ctx, helper, statements, [], buildRef, childNode, features, ns);
        elementIndex++;
      } else if (leadingStatic) {
        html += walkNode(
          ctx,
          helper,
          statements,
          [...steps, elementIndex],
          buildRef,
          childNode,
          features,
          ns,
        );
        elementIndex++;
      } else {
        const nested = buildImperativeSite(childNode, ctx, helper, ns);
        if (nested.features.hooks) features.hooks = true;
        if (nested.features.errors) features.errors = true;
        if (nested.features.direct) features.direct = true;
        pushCall(statements, helper("child"), [anchor, nested.call]);
      }
    } else if (childNode.type === "SpreadElement") {
      leadingStatic = false;
      pushCall(statements, helper("child"), [anchor, childNode.argument]);
    } else {
      // Expression children emit the polymorphic `child` arm: the runtime classifies
      // flagged builds, reactive getters, arrays, and primitives at wiring time (the AST
      // target's `children: [expr]` equivalent). Routing them to `text` would stringify
      // build fns — text() keeps only genuinely-literal string children.
      leadingStatic = false;
      pushCall(statements, helper("child"), [anchor, childNode]);
    }
  }

  if (!isFragment && !VOID_TAGS.has(tag)) html += `</${tag}>`;
  return html;
}

/**
 * Lowers one element/fragment JSX site to a `mark(...)` call over a cached
 * template/fragment const: the create fn clones state-initialized structure, the
 * build body wires every dynamic site in document order and returns the root. The
 * root `key` attribute (if any) becomes mark() metadata for ForEach. Every element
 * expression is marked — uniform, no position analysis; `mark` is an Object.assign.
 * @param {import("estree-jsx").JSXElement | import("estree-jsx").JSXFragment} node
 * @param {import("./transform.mjs").TransformContext} ctx
 * @param {(name: string) => import("estree").Identifier} collect Runtime-import collector — records the helper name, returns its identifier
 * @param {string  } [ambientNs] The parse context at this site's position (undefined at
 * HTML positions): non-undefined emits the namespace URI as the template/fragment call's second
 * argument so the hoisted string parses with its authored namespace
 * @returns {{ call: import("estree").CallExpression, features: { hooks: boolean, errors: boolean, direct: boolean } }} The `mark(...)` expression replacing the JSX, plus the prefixed-attr features the site's elements carried
 */
export function buildImperativeSite(node, ctx, collect, ambientNs) {
  const isFragment = node.type === "JSXFragment";
  const statements = [];
  const features = { hooks: false, errors: false, direct: false };
  let usesError = false;
  const helper = (name) => {
    if (name === "errorConfig") usesError = true;
    return collect(name);
  };

  const key = isFragment ? null : extractKeyAttr(node);
  // errorConfig's reset slot references the build fn by name — a named function
  // expression self-binds, so the reference needs no hoisting or TDZ dance.
  const buildRef = ctx.generateUid("hellaBuild");
  const html = walkNode(ctx, helper, statements, [], buildRef, node, features, ambientNs);

  const tplId = ctx.generateUid(isFragment ? "hellaFrag" : "hellaTpl");
  const tplArgs = [stringLiteral(html)];
  if (ambientNs !== undefined) tplArgs.push(stringLiteral(NS_URIS[ambientNs]));
  ctx.hoisted.push({
    id: tplId,
    init: callExpression(helper(isFragment ? "fragment" : "template"), tplArgs),
  });

  const body = blockStatement([
    variableDeclaration("const", [
      variableDeclarator(identifier("_hellaRoot"), callExpression(tplId, [])),
    ]),
    ...statements,
    returnStatement(identifier("_hellaRoot")),
  ]);
  const buildFn = usesError
    ? functionExpression(buildRef, [], body)
    : arrowFunctionExpression([], body);

  const markArgs = [buildFn];
  if (key) markArgs.push(objectExpression([objectProperty(identifier("key"), key)]));
  if (!key && !isFragment) {
    // Spread-carried reconciliation keys: the AST path carried the whole spread object on
    // the vnode props (ForEach reads props.key); the runtime spread routes each key through
    // prop() — which never renders "key" — so mark's props metadata must re-carry it.
    // Spreading the same sources preserves JS merge semantics (last spread wins); an
    // explicit key attr never reaches here — extractKeyAttr spliced it out above.
    const attributes = node.openingElement.attributes;
    const spreads = [];
    let ai = 0;
    while (ai < attributes.length) {
      const attr = attributes[ai++];
      if (attr.type === "JSXSpreadAttribute") spreads.push(spreadElement(attr.argument));
    }
    if (spreads.length > 0) markArgs.push(objectExpression(spreads));
  }
  return { call: callExpression(helper("mark"), markArgs), features };
}
