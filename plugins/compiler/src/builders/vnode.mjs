// Build HellaNode AST objects. Also home of the shared estree node primitives
// (the `t`-builder replacement): every builder and processor constructs estree
// nodes through these — one node shape per construct, no per-file duplication.

/**
 * Identifier node.
 * @param {string} name
 * @returns {import("estree").Identifier}
 */
export function identifier(name) {
  return { type: "Identifier", name };
}

/**
 * String literal carrying a double-quoted raw so astring prints generated
 * strings uniformly (parsed literals keep their own raw).
 * @param {string} value
 * @returns {import("estree").Literal}
 */
export function stringLiteral(value) {
  return { type: "Literal", value, raw: JSON.stringify(value) };
}

/**
 * Numeric literal.
 * @param {number} value
 * @returns {import("estree").Literal}
 */
export function numericLiteral(value) {
  return { type: "Literal", value, raw: String(value) };
}

/**
 * Boolean literal.
 * @param {boolean} value
 * @returns {import("estree").Literal}
 */
export function booleanLiteral(value) {
  return { type: "Literal", value, raw: value ? "true" : "false" };
}

/**
 * Member expression (`obj.prop`, or `obj[expr]` when computed).
 * @param {import("estree").Expression | import("estree").Super} object
 * @param {import("estree").Expression | import("estree").PrivateIdentifier} property
 * @param {boolean} [computed]
 * @returns {import("estree").MemberExpression}
 */
export function memberExpression(object, property, computed = false) {
  return { type: "MemberExpression", object, property, computed, optional: false };
}

/**
 * Call expression.
 * @param {import("estree").Expression | import("estree").Super} callee
 * @param {import("estree").Expression | import("estree").SpreadElement}[] args
 * @returns {import("estree").CallExpression}
 */
export function callExpression(callee, args) {
  return { type: "CallExpression", callee, arguments: args, optional: false };
}

/**
 * Object property (init kind, non-shorthand, non-computed).
 * @param {import("estree").Expression | import("estree").PrivateIdentifier} key
 * @param {import("estree").Expression} value
 * @returns {import("estree").Property}
 */
export function objectProperty(key, value) {
  return {
    type: "Property",
    kind: "init",
    key,
    value,
    method: false,
    shorthand: false,
    computed: false,
  };
}

/**
 * Object expression.
 * @param {import("estree").Property | import("estree").SpreadElement[]} properties
 * @returns {import("estree").ObjectExpression}
 */
export function objectExpression(properties) {
  return { type: "ObjectExpression", properties };
}

/**
 * Array expression.
 * @param {(import("estree").Expression | import("estree").SpreadElement | null)[]} elements
 * @returns {import("estree").ArrayExpression}
 */
export function arrayExpression(elements) {
  return { type: "ArrayExpression", elements };
}

/**
 * Spread element (`...argument`) — the bare `{props.children}` marker in
 * children lists and the spread carrier in props.
 * @param {import("estree").Expression} argument
 * @returns {import("estree").SpreadElement}
 */
export function spreadElement(argument) {
  return { type: "SpreadElement", argument };
}

/**
 * Arrow function with an expression body (`() => expr` reactive thunk shape).
 * @param {import("estree").Pattern[]} params
 * @param {import("estree").Expression} body
 * @returns {import("estree").ArrowFunctionExpression}
 */
export function arrowFunctionExpression(params, body) {
  return { type: "ArrowFunctionExpression", params, body, async: false, expression: true };
}

/**
 * Named function expression (the `errorConfig` build-fn self-reference shape).
 * @param {import("estree").Identifier | null} id
 * @param {import("estree").Pattern[]} params
 * @param {import("estree").BlockStatement} body
 * @returns {import("estree").FunctionExpression}
 */
export function functionExpression(id, params, body) {
  return { type: "FunctionExpression", id, params, body, async: false, generator: false };
}

/**
 * Block statement.
 * @param {import("estree").Statement[]} body
 * @returns {import("estree").BlockStatement}
 */
export function blockStatement(body) {
  return { type: "BlockStatement", body };
}

/**
 * Expression statement.
 * @param {import("estree").Expression} expression
 * @returns {import("estree").ExpressionStatement}
 */
export function expressionStatement(expression) {
  return { type: "ExpressionStatement", expression };
}

/**
 * Return statement.
 * @param {import("estree").Expression} argument
 * @returns {import("estree").ReturnStatement}
 */
export function returnStatement(argument) {
  return { type: "ReturnStatement", argument };
}

/**
 * Variable declaration.
 * @param {"const" | "let" | "var"} kind
 * @param {import("estree").VariableDeclarator[]} declarations
 * @returns {import("estree").VariableDeclaration}
 */
export function variableDeclaration(kind, declarations) {
  return { type: "VariableDeclaration", kind, declarations };
}

/**
 * Variable declarator.
 * @param {import("estree").Identifier} id
 * @param {import("estree").Expression | null} init
 * @returns {import("estree").VariableDeclarator}
 */
export function variableDeclarator(id, init) {
  return { type: "VariableDeclarator", id, init };
}

/**
 * Import declaration (`source` wrapped as a literal here — call sites pass the
 * module specifier string).
 * @param {(import("estree").ImportSpecifier | import("estree").ImportDefaultSpecifier | import("estree").ImportNamespaceSpecifier)[]} specifiers
 * @param {string} source
 * @returns {import("estree").ImportDeclaration}
 */
export function importDeclaration(specifiers, source) {
  return { type: "ImportDeclaration", specifiers, source: stringLiteral(source) };
}

/**
 * Named import specifier.
 * @param {import("estree").Identifier} local
 * @param {import("estree").Identifier} imported
 * @returns {import("estree").ImportSpecifier}
 */
export function importSpecifier(local, imported) {
  return { type: "ImportSpecifier", local, imported };
}

/**
 * True when the node is a string literal (estree `Literal` with a string value).
 * @param {unknown} node
 * @returns {boolean}
 */
export function isStringLiteral(node) {
  return (
    node !== null &&
    typeof node === "object" &&
    node.type === "Literal" &&
    typeof node.value === "string"
  );
}

/**
 * True when the node is a numeric literal.
 * @param {unknown} node
 * @returns {boolean}
 */
export function isNumericLiteral(node) {
  return (
    node !== null &&
    typeof node === "object" &&
    node.type === "Literal" &&
    typeof node.value === "number"
  );
}

/**
 * True when the node is a boolean literal.
 * @param {unknown} node
 * @returns {boolean}
 */
export function isBooleanLiteral(node) {
  return (
    node !== null &&
    typeof node === "object" &&
    node.type === "Literal" &&
    typeof node.value === "boolean"
  );
}

/**
 * True when the node is an Identifier (optionally a specific name).
 * @param {unknown} node
 * @param {string} [name]
 * @returns {boolean}
 */
export function isIdentifier(node, name) {
  if (node === null || typeof node !== "object" || node.type !== "Identifier") return false;
  return name === undefined || node.name === name;
}

/**
 * True when the node is a SpreadElement.
 * @param {unknown} node
 * @returns {boolean}
 */
export function isSpreadElement(node) {
  return node !== null && typeof node === "object" && node.type === "SpreadElement";
}

/**
 * True when the node is an init-kind Property (an object property).
 * @param {unknown} node
 * @returns {boolean}
 */
export function isObjectProperty(node) {
  return (
    node !== null && typeof node === "object" && node.type === "Property" && node.kind === "init"
  );
}

/**
 * Build HellaNode object expression from categorized attributes. The children
 * value arrives pre-assembled (`buildChildrenValue` from builders/children.mjs,
 * or null when the list is empty) — children.mjs owns value assembly, this
 * module node construction, keeping the import graph cycle-free.
 * @param {string} tag
 * @param {import("estree").Property[]} props
 * @param {import("estree").Property[]} on
 * @param {import("estree").Property[]} e
 * @param {import("estree").Property[]} hooks
 * @param {import("estree").Expression | null} children Assembled children value; null omits the field
 * @param {import("estree").Property[]} error
 * @returns {import("estree").ObjectExpression}
 */
export function buildHellaNode(tag, props, on, e, hooks, children, error) {
  const vNodeProperties = [objectProperty(identifier("tag"), stringLiteral(tag))];

  if (props && props.length > 0) {
    vNodeProperties.push(objectProperty(identifier("props"), objectExpression(props)));
  }

  if (on && on.length > 0) {
    vNodeProperties.push(objectProperty(identifier("on"), objectExpression(on)));
  }

  if (e && e.length > 0) {
    vNodeProperties.push(objectProperty(identifier("e"), objectExpression(e)));
  }

  if (hooks && hooks.length > 0) {
    vNodeProperties.push(objectProperty(identifier("hooks"), objectExpression(hooks)));
  }

  // Add error property
  if (error && error.length > 0) {
    vNodeProperties.push(objectProperty(identifier("error"), objectExpression(error)));
  }

  if (children) {
    vNodeProperties.push(objectProperty(identifier("children"), children));
  }

  return objectExpression(vNodeProperties);
}
