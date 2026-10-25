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
import { getTagCallee } from "../utils/babel.mjs";

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
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").JSXElement} node
 * @returns {boolean}
 */
function isComponentNode(t, node) {
  const name = node.openingElement.name;
  return (t.isJSXIdentifier(name) && /^[A-Z]/.test(name.name)) || t.isJSXMemberExpression(name);
}

/**
 * True when a subtree qualifies for template folding: fully static per
 * `tryBuildStaticJSX` AND carrying no property-assigned keys (their renderProp
 * semantics cannot fold into html).
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").JSXElement | import("@babel/core").JSXFragment} node
 * @returns {boolean}
 */
function isTemplateEligible(t, node) {
  const vnode = tryBuildStaticJSX(t, node);
  if (!vnode) return false;
  let i = 0;
  while (i < vnode.properties.length) {
    const property = vnode.properties[i++];
    if (
      t.isObjectProperty(property) &&
      t.isIdentifier(property.key, { name: "props" }) &&
      t.isObjectExpression(property.value)
    ) {
      let j = 0;
      while (j < property.value.properties.length) {
        const prop = property.value.properties[j++];
        if (
          t.isObjectProperty(prop) &&
          t.isIdentifier(prop.key) &&
          PROPERTY_KEYS.has(prop.key.name)
        ) {
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
 * @param {typeof import("@babel/core").types} t
 * @param {number[]} steps Element-child indices from the site root
 * @returns {import("@babel/core").MemberExpression | import("@babel/core").Identifier}
 */
function anchorExpression(t, steps) {
  let expr = t.identifier("_hellaRoot");
  let i = 0;
  while (i < steps.length) {
    const index = steps[i++];
    if (index === 0) {
      expr = t.memberExpression(expr, t.identifier("firstElementChild"));
    } else {
      expr = t.memberExpression(expr, t.identifier("children"));
      expr = t.memberExpression(expr, t.numericLiteral(index), true);
    }
  }
  return expr;
}

/**
 * Serializes one foldable literal prop: `true` renders a bare attribute, `false` /
 * `null` render nothing (the parser's absence is equivalent to renderProp's
 * removeAttribute), strings and numbers render as quoted values.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").ObjectProperty} prop
 * @returns {string} Html attribute source (possibly empty)
 */
function serializeProp(t, prop) {
  const name = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
  if (t.isBooleanLiteral(prop.value)) return prop.value.value ? ` ${name}` : "";
  if (t.isNullLiteral(prop.value)) return "";
  return ` ${name}="${escapeAttr(String(prop.value.value))}"`;
}

/**
 * True when a prop folds into the template html: a plain literal value whose key
 * renders through setAttribute (never the property-assigned keys).
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").ObjectProperty} prop
 * @returns {boolean}
 */
function isFoldableProp(t, prop) {
  const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
  return isLiteralValue(t, prop.value) && !PROPERTY_KEYS.has(key);
}

/**
 * Extracts the root element's `key` attribute as mark() reconciliation metadata:
 * renderProp never renders `key`, and ForEach reads it off the flagged fn — folding
 * it into html would mint a real attribute no walker ever created.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").JSXElement} node Mutated: the key attribute is spliced out
 * @returns {import("@babel/core").Expression | null} The key value expression
 */
function extractKeyAttr(t, node) {
  const attributes = node.openingElement.attributes;
  let i = 0;
  while (i < attributes.length) {
    const attr = attributes[i++];
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: "key" })) {
      attributes.splice(i - 1, 1);
      if (!attr.value) return t.booleanLiteral(true);
      return attr.value.expression !== undefined ? attr.value.expression : attr.value;
    }
  }
  return null;
}

/**
 * Emits one wiring statement appending to `statements`.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").Statement[]} statements Accumulator
 * @param {import("@babel/core").Expression} callee Helper identifier
 * @param {import("@babel/core").Expression[]} args Call arguments
 */
function pushCall(t, statements, callee, args) {
  statements.push(t.expressionStatement(t.callExpression(callee, args)));
}

/**
 * Serializes one element/fragment subtree into template html, collecting the
 * dynamic wiring statements in document order and the prefixed-attr features its
 * elements carried. Literal props minus property keys fold; the children fold only
 * up to the first dynamic child — after it, every child emits as a runtime call
 * (static text → `text`, static subtrees → nested sites, expressions →
 * `text`/`child` by whether they contain element JSX).
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 * @param {(name: string) => import("@babel/core").Identifier} helper Records the runtime helper and returns its identifier
 * @param {import("@babel/core").Statement[]} statements Wiring statements accumulator
 * @param {number[]} steps Element-child indices from the site root
 * @param {import("@babel/core").Identifier} buildRef The site build fn's own name — errorConfig's reset slot
 * @param {import("@babel/core").JSXElement | import("@babel/core").JSXFragment} node
 * @param {object} features Feature flags accumulated across the subtree
 * @param {string | undefined} ns Current parse context (`"svg"` / `"math"` once inside
 * foreign ancestry; `foreignObject` resets to undefined) — threaded to nested template
 * sites so each hoisted string parses with its authored namespace
 * @returns {string} The subtree's template html
 */
function walkNode(t, program, helper, statements, steps, buildRef, node, features, ns) {
  const isFragment = t.isJSXFragment(node);
  let tag = null;
  let attrs = { props: [], on: [], hooks: [], e: [], error: [] };
  if (!isFragment) {
    // Element-position tags must be plain identifiers — getTagCallee throws the
    // shared "unsupported JSX tag name" error for namespaced names (ast parity).
    getTagCallee(t, node.openingElement.name);
    tag = node.openingElement.name.name;
    attrs = processAttributes(t, node.openingElement.attributes, false);
    if (attrs.features.hooks) features.hooks = true;
    if (attrs.features.errors) features.errors = true;
    if (attrs.features.direct) features.direct = true;
  }
  // Ancestry update for descendants: svg/math establish their namespace, foreignObject is
  // the HTML integration point (its interior resets), everything else inherits.
  if (tag === "svg" || tag === "math") ns = tag;
  else if (ns !== undefined && tag !== null && tag.toLowerCase() === "foreignobject")
    ns = undefined;
  const anchor = anchorExpression(t, steps);

  let html = isFragment ? "" : `<${tag}`;
  if (!isFragment) {
    let i = 0;
    while (i < attrs.props.length) {
      const prop = attrs.props[i++];
      if (t.isSpreadElement(prop)) {
        // Runtime spread: each key routes through prop() so renderProp's per-key
        // dispatch (property keys, falsy removal, reactive values) applies verbatim.
        const source = prop.argument;
        statements.push(
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("keys")), [
                  source,
                ]),
                t.identifier("forEach"),
              ),
              [
                t.arrowFunctionExpression(
                  [t.identifier("k")],
                  t.callExpression(helper("prop"), [
                    anchor,
                    t.identifier("k"),
                    t.memberExpression(source, t.identifier("k"), true),
                  ]),
                ),
              ],
            ),
          ),
        );
      } else if (isFoldableProp(t, prop)) {
        html += serializeProp(t, prop);
      } else {
        pushCall(t, statements, helper("prop"), [
          anchor,
          t.stringLiteral(t.isIdentifier(prop.key) ? prop.key.name : prop.key.value),
          prop.value,
        ]);
      }
    }
    i = 0;
    while (i < attrs.on.length) {
      const prop = attrs.on[i++];
      pushCall(t, statements, helper("on"), [anchor, t.stringLiteral(prop.key.name), prop.value]);
    }
    i = 0;
    while (i < attrs.e.length) {
      const prop = attrs.e[i++];
      pushCall(t, statements, helper("direct"), [
        anchor,
        t.stringLiteral(prop.key.name),
        prop.value,
      ]);
    }
    i = 0;
    while (i < attrs.hooks.length) {
      const prop = attrs.hooks[i++];
      pushCall(t, statements, helper("hook"), [anchor, t.stringLiteral(prop.key.name), prop.value]);
    }
    if (attrs.error.length > 0) {
      pushCall(t, statements, helper("errorConfig"), [
        anchor,
        t.objectExpression(attrs.error),
        buildRef,
      ]);
    }
    html += ">";
  }

  const children = filterEmptyChildren(t, node.children, false);
  const rawText = tag !== null && RAW_TEXT_TAGS.has(tag);
  let leadingStatic = true;
  let elementIndex = 0;
  let i = 0;
  while (i < children.length) {
    const childNode = children[i++];
    if (t.isStringLiteral(childNode)) {
      if (leadingStatic) {
        html += rawText ? childNode.value : escapeText(childNode.value);
      } else {
        pushCall(t, statements, helper("text"), [anchor, childNode]);
      }
    } else if (t.isJSXElement(childNode) || t.isJSXFragment(childNode)) {
      if (t.isJSXElement(childNode) && isComponentNode(t, childNode)) {
        leadingStatic = false;
        pushCall(t, statements, helper("child"), [anchor, childNode]);
      } else if (leadingStatic && isTemplateEligible(t, childNode)) {
        html += walkNode(t, program, helper, statements, [], buildRef, childNode, features, ns);
        elementIndex++;
      } else if (leadingStatic) {
        html += walkNode(
          t,
          program,
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
        const nested = buildImperativeSite(t, program, childNode, helper, ns);
        if (nested.features.hooks) features.hooks = true;
        if (nested.features.errors) features.errors = true;
        if (nested.features.direct) features.direct = true;
        pushCall(t, statements, helper("child"), [anchor, nested.call]);
      }
    } else if (t.isSpreadElement(childNode)) {
      leadingStatic = false;
      pushCall(t, statements, helper("child"), [anchor, childNode.argument]);
    } else {
      // Expression children emit the polymorphic `child` arm: the runtime classifies
      // flagged builds, reactive getters, arrays, and primitives at wiring time (the AST
      // target's `children: [expr]` equivalent). Routing them to `text` would stringify
      // build fns — text() keeps only genuinely-literal string children.
      leadingStatic = false;
      pushCall(t, statements, helper("child"), [anchor, childNode]);
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
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 * @param {import("@babel/core").JSXElement | import("@babel/core").JSXFragment} node
 * @param {(name: string) => import("@babel/core").Identifier} collect Runtime-import collector — records the helper name, returns its identifier
 * @param {string | undefined} ambientNs The parse context at this site's position (undefined at
 * HTML positions): non-undefined emits the namespace URI as the template/fragment call's second
 * argument so the hoisted string parses with its authored namespace
 * @returns {{ call: import("@babel/core").CallExpression, features: { hooks: boolean, errors: boolean, direct: boolean } }} The `mark(...)` expression replacing the JSX, plus the prefixed-attr features the site's elements carried
 */
export function buildImperativeSite(t, program, node, collect, ambientNs) {
  const isFragment = t.isJSXFragment(node);
  const statements = [];
  const features = { hooks: false, errors: false, direct: false };
  let usesError = false;
  const helper = (name) => {
    if (name === "errorConfig") usesError = true;
    return collect(name);
  };

  const key = isFragment ? null : extractKeyAttr(t, node);
  // errorConfig's reset slot references the build fn by name — a named function
  // expression self-binds, so the reference needs no hoisting or TDZ dance.
  const buildRef = program.scope.generateUidIdentifier("hellaBuild");
  const html = walkNode(t, program, helper, statements, [], buildRef, node, features, ambientNs);

  const tplId = program.scope.generateUidIdentifier(isFragment ? "hellaFrag" : "hellaTpl");
  const tplArgs = [t.stringLiteral(html)];
  if (ambientNs !== undefined) tplArgs.push(t.stringLiteral(NS_URIS[ambientNs]));
  program.scope.push({
    id: tplId,
    init: t.callExpression(helper(isFragment ? "fragment" : "template"), tplArgs),
    kind: "const",
  });

  const body = t.blockStatement([
    t.variableDeclaration("const", [
      t.variableDeclarator(t.identifier("_hellaRoot"), t.callExpression(tplId, [])),
    ]),
    ...statements,
    t.returnStatement(t.identifier("_hellaRoot")),
  ]);
  const buildFn = usesError
    ? t.functionExpression(buildRef, [], body)
    : t.arrowFunctionExpression([], body);

  const markArgs = [buildFn];
  if (key) markArgs.push(t.objectExpression([t.objectProperty(t.identifier("key"), key)]));
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
      if (t.isJSXSpreadAttribute(attr)) spreads.push(t.spreadElement(attr.argument));
    }
    if (spreads.length > 0) markArgs.push(t.objectExpression(spreads));
  }
  return { call: t.callExpression(helper("mark"), markArgs), features };
}
