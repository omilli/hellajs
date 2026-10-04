import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { css, cssText, cva, cx, keyframes, resetCss, style } from "@hellajs/css";

const CSS_PACKAGE = "@hellajs/css";
const CREATORS = new Set(["css", "style", "keyframes", "vars"]);
const FOLDABLE_IMPORTS = new Set(["css", "style", "keyframes", "cx", "cva"]);
const REAL_FNS = new Map([["css", css], ["style", style], ["keyframes", keyframes], ["cx", cx], ["cva", cva]]);
const FN_NAMES = new Map([[css, "css"], [style, "style"], [keyframes, "keyframes"], [cx, "cx"], [cva, "cva"]]);
const MODULE_EXTENSIONS = [".mjs", ".js", ".ts", ".tsx", ".jsx"];

/**
 * Thrown to unwind a non-foldable expression: a value the evaluator cannot
 * derive statically. Policy errors (creator calls with non-foldable
 * arguments, `vars()` in a page) throw real `Error`s instead.
 */
const NONFOLD = { nonFoldable: true };

/**
 * Resolves a relative specifier against its importer, probing module
 * extensions and directory indexes. Bare specifiers return null: only the
 * HellaJS CSS package is known natively, and foreign module values are not
 * statically derivable.
 * @param {string} specifier Import specifier to resolve
 * @param {string} importer Resolved id of the importing module
 * @returns {string | null} Resolved module id, or null when unresolvable
 */
function defaultResolve(specifier, importer) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(importer), specifier);
  const candidates = [];
  let i = 0;
  while (i < MODULE_EXTENSIONS.length) {
    candidates.push(base + MODULE_EXTENSIONS[i]);
    candidates.push(path.join(base, `index${MODULE_EXTENSIONS[i]}`));
    i++;
  }
  let c = 0;
  while (c < candidates.length) {
    if (existsSync(candidates[c])) return candidates[c];
    c++;
  }
  return null;
}

/**
 * Loads a module's source from disk.
 * @param {string} id Resolved module id
 * @returns {string} Source text
 */
function defaultLoad(id) {
  return readFileSync(id, "utf8");
}

/**
 * Parses a module with the TypeScript and JSX plugins enabled (imported
 * modules may be plain JS, TS, or a JSX/TSX island component).
 * @param {string} code Module source
 * @returns Babel AST root (File node)
 */
function parseModule(code) {
  return parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] });
}

/**
 * True for babel AST nodes.
 * @param {unknown} value Candidate value
 * @returns {boolean} Whether the value is an AST node
 */
function isNode(value) {
  return Boolean(value) && typeof value === "object" && typeof value.type === "string";
}

/**
 * Depth-first walk over every node in an AST subtree, in document order.
 * @param {unknown} node AST node or node array to walk
 * @param {(node: object) => void} visit Visitor invoked once per node
 */
function walkNode(node, visit) {
  if (Array.isArray(node)) {
    let i = 0;
    while (i < node.length) walkNode(node[i++], visit);
    return;
  }
  if (!isNode(node)) return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments") continue;
    walkNode(node[key], visit);
  }
}

/**
 * Collects the names a binding pattern declares (identifiers inside object
 * and array destructuring included).
 * @param {object} node Binding pattern or identifier node
 * @param {Set<string>} names Accumulator
 */
function collectPatternNames(node, names) {
  if (!isNode(node)) return;
  if (node.type === "Identifier") names.add(node.name);
  if (node.type === "ObjectPattern") {
    let i = 0;
    const len = node.properties.length;
    while (i < len) {
      const property = node.properties[i++];
      collectPatternNames(property.type === "RestElement" ? property.argument : property.value, names);
    }
  }
  if (node.type === "ArrayPattern") {
    let i = 0;
    const len = node.elements.length;
    while (i < len) collectPatternNames(node.elements[i++], names);
  }
  if (node.type === "AssignmentPattern") collectPatternNames(node.left, names);
  if (node.type === "RestElement") collectPatternNames(node.argument, names);
}

/**
 * Parses one module and maps its import/export structure: import bindings,
 * locally declared names (for shadow-conservative creator detection), the
 * `cssText` opt-out locals, and export tables.
 * @param {object} ast Babel program AST
 * @param {string} id Resolved module id
 * @returns {object} Module record: `id`, `importMap`, `declared`, `cssTextLocals`, `bindings`, `exports`, `reexports`, `ast`
 */
function analyzeModule(ast, id) {
  const importMap = new Map();
  const imports = [];
  const declared = new Set();
  const cssTextLocals = new Set();
  const exportLocals = new Map();
  const reexports = new Map();
  let defaultLocal = null;
  const body = ast.program.body;
  let i = 0;
  while (i < body.length) {
    const stmt = body[i++];
    if (stmt.type === "ImportDeclaration") {
      let s = 0;
      const specs = stmt.specifiers;
      if (specs.length === 0) {
        imports.push({ local: null, imported: null, source: stmt.source.value });
        continue;
      }
      while (s < specs.length) {
        const spec = specs[s++];
        let imported = null;
        if (spec.type === "ImportSpecifier") imported = spec.imported.name ?? spec.imported.value;
        else if (spec.type === "ImportDefaultSpecifier") imported = "default";
        importMap.set(spec.local.name, { source: stmt.source.value, imported });
        imports.push({ local: spec.local.name, imported, source: stmt.source.value });
        if (stmt.source.value === CSS_PACKAGE && imported === "cssText") cssTextLocals.add(spec.local.name);
      }
      continue;
    }
    if (stmt.type === "ExportNamedDeclaration") {
      if (stmt.declaration) {
        const decl = stmt.declaration;
        if (decl.type === "VariableDeclaration") {
          let d = 0;
          while (d < decl.declarations.length) {
            const declarator = decl.declarations[d++];
            if (declarator.id.type === "Identifier") {
              declared.add(declarator.id.name);
              exportLocals.set(declarator.id.name, declarator.id.name);
            } else {
              collectPatternNames(declarator.id, declared);
            }
          }
        } else if (decl.type === "FunctionDeclaration" || decl.type === "ClassDeclaration") {
          if (decl.id) {
            declared.add(decl.id.name);
            exportLocals.set(decl.id.name, decl.id.name);
          }
        }
      }
      let s = 0;
      const specs = stmt.specifiers ?? [];
      while (s < specs.length) {
        const spec = specs[s++];
        const exported = spec.exported.name ?? spec.exported.value;
        if (stmt.source) reexports.set(exported, { source: stmt.source.value, imported: spec.local.name });
        else exportLocals.set(exported, spec.local.name);
      }
      continue;
    }
    if (stmt.type === "ExportDefaultDeclaration") {
      if (stmt.declaration.type === "Identifier") defaultLocal = stmt.declaration.name;
      walkNode(stmt, (node) => {
        if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") {
          if (node.id) declared.add(node.id.name);
        }
      });
      continue;
    }
    walkNode(stmt, (node) => {
      if (node.type === "VariableDeclarator") collectPatternNames(node.id, declared);
      if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") {
        if (node.id) declared.add(node.id.name);
      }
      if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
        let p = 0;
        while (p < node.params.length) collectPatternNames(node.params[p++], declared);
      }
      if (node.type === "CatchClause" && node.param) collectPatternNames(node.param, declared);
    });
  }
  return { id, imports, importMap, declared, cssTextLocals, bindings: new Map(), exportLocals, reexports, defaultLocal, ast };
}

/**
 * Resolves the creator name (`css`/`style`/`keyframes`/`vars`) of a call
 * whose callee is an unshadowed named import from `@hellajs/css`, or null.
 * @param {object} node CallExpression node
 * @param {object} mod Module record
 * @returns {string | null} Creator name, or null when the callee is not a creator import
 */
function creatorNameOf(node, mod) {
  const callee = node.callee;
  if (callee.type !== "Identifier" || mod.declared.has(callee.name)) return null;
  const imported = mod.importMap.get(callee.name);
  if (!imported || imported.source !== CSS_PACKAGE) return null;
  return CREATORS.has(imported.imported) ? imported.imported : null;
}

/**
 * Whether the module references an imported `cssText` binding anywhere
 * outside its import declarations — the manual-management opt-out. Property
 * keys and non-computed member properties are not references.
 * @param {object} mod Module record
 * @returns {boolean} Whether a `cssText` local is referenced
 */
function referencesCssText(mod) {
  if (mod.cssTextLocals.size === 0) return false;

  /**
   * Scans one node's subtree for a `cssText` identifier reference.
   * @param {object | object[]} node Subtree root, or node array
   * @returns {boolean} Whether the subtree references a `cssText` local
   */
  const scan = (node) => {
    if (Array.isArray(node)) {
      let i = 0;
      while (i < node.length) {
        if (scan(node[i++])) return true;
      }
      return false;
    }
    if (!isNode(node)) return false;
    if (node.type === "ImportDeclaration") return false;
    if (node.type === "Identifier") return mod.cssTextLocals.has(node.name);
    if (node.type === "MemberExpression" && !node.computed) return scan(node.object);
    if ((node.type === "ObjectProperty" || node.type === "ObjectMethod") && !node.computed) return scan(node.value);
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "leadingComments" || key === "trailingComments") continue;
      if (scan(node[key])) return true;
    }
    return false;
  };
  const body = mod.ast.program.body;
  let i = 0;
  while (i < body.length) {
    if (body[i].type !== "ImportDeclaration" && scan(body[i])) return true;
    i++;
  }
  return false;
}

/**
 * Extracts statically foldable `css()`/`style()`/`keyframes()` calls from a
 * compiled `.astro` module. Runs the real `@hellajs/css` functions in a
 * sandbox (`resetCss()` → evaluate → `cssText()`), resolves imported
 * bindings recursively through `resolve`/`load` (registration order: import
 * graph first, then the module body), and rewrites creator calls to their
 * folded literals (`css()` → `void 0`).
 *
 * Positional policies: in the `.astro` module a creator call with
 * non-foldable arguments, or any `vars()` call, throws; in imported modules
 * only top-level creator calls with foldable arguments are collected and
 * everything else is ignored silently.
 * @internal Consumed by `frontmatter.mjs` and the plugin tests; not re-exported by the package entry.
 * @param {object} options Extraction inputs
 * @param {string} options.code Compiled `.astro` module source
 * @param {string} options.id Resolved id of the module
 * @param {(specifier: string, importer: string) => string | null} [options.resolve] Module resolver, probed relative specifiers only
 * @param {(id: string) => string} [options.load] Module source loader
 * @returns {{ replacements: { start: number, end: number, text: string }[], css: string, watchFiles: string[] } | null} Splice edits, the collected CSS text, and folded source modules; null when the module opts out via a `cssText` reference or carries no creator calls
 * @throws {Error} When a frontmatter creator call has non-foldable arguments, or `vars()` appears in the page.
 */
export function extractFrontmatter({ code, id, resolve = defaultResolve, load = defaultLoad }) {
  const ast = parseModule(code);
  const mod = analyzeModule(ast, id);
  if (referencesCssText(mod)) return null;
  const candidates = [];
  walkNode(ast, (node) => {
    if (node.type === "CallExpression" && creatorNameOf(node, mod)) candidates.push(node);
  });
  if (candidates.length === 0) return null;

  const modules = new Map();
  const recipes = new WeakSet();
  const replacements = [];
  const watched = new Set();

  /**
   * Resolves an identifier to its folded value: a const binding, a foldable
   * `@hellajs/css` import, or an evaluated import from a local module.
   * @param {string} name Identifier name
   * @param {object} owner Module record being evaluated
   * @returns {unknown} Folded value
     */
  const lookup = (name, owner) => {
    if (owner.bindings.has(name)) return owner.bindings.get(name);
    const imported = owner.importMap.get(name);
    if (!imported) throw NONFOLD;
    if (imported.source === CSS_PACKAGE) {
      if (imported.imported !== null && FOLDABLE_IMPORTS.has(imported.imported)) return REAL_FNS.get(imported.imported);
      throw NONFOLD;
    }
    throw NONFOLD;
  };

  /**
   * Evaluates one expression to its static value, processing creator calls
   * found along the way. Throws NONFOLD for anything not statically
   * derivable.
   * @param {object} node Expression node
   * @param {object} owner Module record being evaluated
   * @param {boolean} isMain True when evaluating the `.astro` module itself
   * @param {boolean} descend True when function bodies are walked (main module only)
   * @returns {unknown} Folded value
   */
  const evaluate = (node, owner, isMain, descend) => {
    switch (node.type) {
      case "StringLiteral":
        return node.value;
      case "NumericLiteral":
      case "BooleanLiteral":
        return node.value;
      case "NullLiteral":
        return null;
      case "Identifier":
        return lookup(node.name, owner);
      case "TemplateLiteral": {
        let out = "";
        let i = 0;
        while (i < node.quasis.length) {
          out += node.quasis[i].value.cooked ?? "";
          if (i < node.expressions.length) {
            const value = evaluate(node.expressions[i], owner, isMain, descend);
            if (typeof value !== "string" && typeof value !== "number") throw NONFOLD;
            out += String(value);
          }
          i++;
        }
        return out;
      }
      case "TaggedTemplateExpression": {
        // The tag applies at runtime — never foldable — but template
        // expressions are walked for creator calls (`${style({ … })}`).
        let i = 0;
        while (i < node.quasi.expressions.length) {
          try {
            evaluate(node.quasi.expressions[i], owner, isMain, descend);
          } catch (error) {
            if (error !== NONFOLD) throw error;
          }
          i++;
        }
        throw NONFOLD;
      }
      case "ObjectExpression": {
        const out = {};
        let i = 0;
        while (i < node.properties.length) {
          const property = node.properties[i++];
          if (property.type === "SpreadElement") {
            Object.assign(out, evaluate(property.argument, owner, isMain, descend));
            continue;
          }
          if (property.type !== "ObjectProperty" || property.method) throw NONFOLD;
          const key = property.computed
            ? evaluate(property.key, owner, isMain, descend)
            : property.key.name ?? property.key.value;
          out[key] = evaluate(property.value, owner, isMain, descend);
        }
        return out;
      }
      case "ArrayExpression": {
        const out = [];
        let i = 0;
        while (i < node.elements.length) {
          const element = node.elements[i++];
          if (element === null) {
            out.push(undefined);
          } else if (element.type === "SpreadElement") {
            const spread = evaluate(element.argument, owner, isMain, descend);
            out.push(...spread);
          } else {
            out.push(evaluate(element, owner, isMain, descend));
          }
        }
        return out;
      }
      case "UnaryExpression": {
        const value = evaluate(node.argument, owner, isMain, descend);
        if (node.operator === "-") return -value;
        if (node.operator === "+") return +value;
        if (node.operator === "!") return !value;
        if (node.operator === "~") return ~value;
        if (node.operator === "typeof") return typeof value;
        if (node.operator === "void") return undefined;
        throw NONFOLD;
      }
      case "BinaryExpression": {
        const left = evaluate(node.left, owner, isMain, descend);
        const right = evaluate(node.right, owner, isMain, descend);
        switch (node.operator) {
          case "+": return left + right;
          case "-": return left - right;
          case "*": return left * right;
          case "/": return left / right;
          case "%": return left % right;
          case "**": return left ** right;
          case "==": return left == right;
          case "!=": return left != right;
          case "===": return left === right;
          case "!==": return left !== right;
          case "<": return left < right;
          case "<=": return left <= right;
          case ">": return left > right;
          case ">=": return left >= right;
          case "&": return left & right;
          case "|": return left | right;
          case "^": return left ^ right;
          case "<<": return left << right;
          case ">>": return left >> right;
          case ">>>": return left >>> right;
          default: throw NONFOLD;
        }
      }
      case "LogicalExpression": {
        const left = evaluate(node.left, owner, isMain, descend);
        if (node.operator === "&&") return left ? evaluate(node.right, owner, isMain, descend) : left;
        if (node.operator === "||") return left ? left : evaluate(node.right, owner, isMain, descend);
        if (node.operator === "??") return left ?? evaluate(node.right, owner, isMain, descend);
        throw NONFOLD;
      }
      case "ConditionalExpression":
        return evaluate(node.test, owner, isMain, descend)
          ? evaluate(node.consequent, owner, isMain, descend)
          : evaluate(node.alternate, owner, isMain, descend);
      case "SpreadElement":
        evaluate(node.argument, owner, isMain, descend);
        throw NONFOLD;
      case "ArrowFunctionExpression":
      case "FunctionExpression":
        // Structurally descended for creator calls; never foldable as a value.
        if (descend) walkStatements(node.body, owner, isMain, descend);
        throw NONFOLD;
      case "CallExpression":
        return evaluateCall(node, owner, isMain, descend);
      default:
        throw NONFOLD;
    }
  };

  /**
   * Evaluates a call: creator imports and re-exported creators invoke the
   * real `@hellajs/css` functions (and record main-module rewrites),
   * `cx()`/`cva()` calls fold to their results, and calls of `cva`-produced
   * recipes fold through. Any other call is non-foldable — its arguments
   * are still walked for creator calls.
   * @param {object} node CallExpression node
   * @param {object} owner Module record being evaluated
   * @param {boolean} isMain True when evaluating the `.astro` module itself
   * @param {boolean} descend True when function bodies are walked
   * @returns {unknown} Folded result
   */
  const evaluateCall = (node, owner, isMain, descend) => {
    const creator = creatorNameOf(node, owner);
    const callee = node.callee;
    let fnName = creator;
    let callable = null;
    if (!fnName && callee.type === "Identifier") {
      // A locally declared name never falls back to its import binding —
      // that would resolve a shadowed import. Module consts resolve through
      // bindings alone; only import positions take the full lookup.
      let value;
      try {
        value = owner.declared.has(callee.name) ? owner.bindings.get(callee.name) : lookup(callee.name, owner);
      } catch (error) {
        if (error !== NONFOLD) throw error;
        value = undefined;
      }
      if (typeof value === "function") {
        fnName = FN_NAMES.get(value) ?? (recipes.has(value) ? "recipe" : null);
        callable = value;
      }
    }

    if (!fnName) {
      try {
        evaluate(callee, owner, isMain, descend);
      } catch (error) {
        if (error !== NONFOLD) throw error;
      }
      let i = 0;
      while (i < node.arguments.length) {
        try {
          evaluate(node.arguments[i++], owner, isMain, descend);
        } catch (error) {
          if (error !== NONFOLD) throw error;
        }
      }
      throw NONFOLD;
    }

    if (fnName === "vars") {
      if (isMain) {
        throw new Error("[astro-hellajs] frontmatter vars() is dead server-side — move reactive vars to an island module");
      }
      throw NONFOLD;
    }

    const args = [];
    let i = 0;
    while (i < node.arguments.length) {
      const argument = node.arguments[i++];
      try {
        args.push(evaluate(argument, owner, isMain, descend));
      } catch (error) {
        if (error !== NONFOLD) throw error;
        if (!isMain || !CREATORS.has(fnName)) throw NONFOLD;
        throw new Error(`[astro-hellajs] frontmatter ${fnName}() requires statically evaluable arguments — move dynamic styles to a module and collect with cssText()`, { cause: error });
      }
    }

    const result = (fnName === "recipe" ? callable : REAL_FNS.get(fnName))(...args);
    if (fnName === "cva" && typeof result === "function") recipes.add(result);
    if (isMain && CREATORS.has(fnName)) recordReplacement(node, fnName, result);
    return result;
  };

  /**
   * Records the splice edit for one creator call, evicting any edits
   * recorded inside it (nested creator calls in foldable arguments were
   * processed while evaluating those arguments).
   * @param {object} node CallExpression node
   * @param {string} creator Creator name (`css`, `style`, `keyframes`)
   * @param {unknown} result Folded call result
   */
  const recordReplacement = (node, creator, result) => {
    const text = creator === "css" ? "void 0" : JSON.stringify(result);
    for (let i = replacements.length - 1; i >= 0; i--) {
      const existing = replacements[i];
      if (existing.start >= node.start && existing.end <= node.end) replacements.splice(i, 1);
    }
    replacements.push({ start: node.start, end: node.end, text });
  };

  /**
   * Walks a statement position, binding folded declarations and descending
   * into nested statement and function-body positions.
   * @param {object} stmt Statement node
   * @param {object} owner Module record being evaluated
   * @param {boolean} isMain True when evaluating the `.astro` module itself
   * @param {boolean} descend True when function bodies are walked
   */
  const walkStatement = (stmt, owner, isMain, descend) => {
    switch (stmt.type) {
      case "VariableDeclaration": {
        let i = 0;
        while (i < stmt.declarations.length) {
          const declarator = stmt.declarations[i++];
          if (!declarator.init) continue;
          try {
            const value = evaluate(declarator.init, owner, isMain, descend);
            if (declarator.id.type === "Identifier") owner.bindings.set(declarator.id.name, value);
          } catch (error) {
            if (error !== NONFOLD) throw error;
          }
        }
        return;
      }
      case "ExpressionStatement":
      case "ReturnStatement": {
        const expression = stmt.type === "ReturnStatement" ? stmt.argument : stmt.expression;
        if (!expression) return;
        try {
          evaluate(expression, owner, isMain, descend);
        } catch (error) {
          if (error !== NONFOLD) throw error;
        }
        return;
      }
      case "FunctionDeclaration":
        if (descend) walkStatements(stmt.body, owner, isMain, descend);
        return;
      case "BlockStatement":
      case "IfStatement":
      case "ForStatement":
      case "ForOfStatement":
      case "WhileStatement": {
        if (stmt.type === "IfStatement" && stmt.alternate) walkStatement(stmt.alternate, owner, isMain, descend);
        const body = stmt.body ?? stmt.consequent;
        if (Array.isArray(body)) walkStatementsList(body, owner, isMain, descend);
        else if (isNode(body)) walkStatement(body, owner, isMain, descend);
        return;
      }
      case "ExportNamedDeclaration":
        if (stmt.declaration) walkStatement(stmt.declaration, owner, isMain, descend);
        return;
      case "ExportDefaultDeclaration":
        if (isNode(stmt.declaration) && stmt.declaration.type !== "FunctionDeclaration" && stmt.declaration.type !== "ClassDeclaration") {
          try {
            evaluate(stmt.declaration, owner, isMain, descend);
          } catch (error) {
            if (error !== NONFOLD) throw error;
          }
        }
        return;
      default:
        return;
    }
  };

  /**
   * Walks a block-shaped node: statement lists directly, expression bodies
   * (single-expression arrows) through the evaluator.
   * @param {object} block BlockStatement or expression node
   * @param {object} owner Module record being evaluated
   * @param {boolean} isMain True when evaluating the `.astro` module itself
   * @param {boolean} descend True when function bodies are walked
   */
  const walkStatements = (block, owner, isMain, descend) => {
    if (block.type === "BlockStatement") {
      walkStatementsList(block.body, owner, isMain, descend);
      return;
    }
    try {
      evaluate(block, owner, isMain, descend);
    } catch (error) {
      if (error !== NONFOLD) throw error;
    }
  };

  /**
   * Walks an array of statements.
   * @param {object[]} statements Statement nodes
   * @param {object} owner Module record being evaluated
   * @param {boolean} isMain True when evaluating the `.astro` module itself
   * @param {boolean} descend True when function bodies are walked
   */
  const walkStatementsList = (statements, owner, isMain, descend) => {
    let i = 0;
    while (i < statements.length) walkStatement(statements[i++], owner, isMain, descend);
  };

  /**
   * Evaluates one module: loads and analyzes it, evaluates its import graph
   * first (runtime hoisting order), then its top-level statements. Visited
   * modules are cached — the visited set doubles as the cycle guard.
   * @param {string} moduleId Resolved module id
   * @returns {object | null} Module record, or null when the source cannot be loaded
   */
  const evaluateModule = (moduleId) => {
    const cached = modules.get(moduleId);
    if (cached !== undefined) return cached;
    watched.add(moduleId);
    let source;
    try {
      source = load(moduleId);
    } catch {
      // Unloadable module: its bindings stay non-foldable. Silence here is
      // the plan's opportunistic policy for imported modules, not a swallow.
      modules.set(moduleId, null);
      return null;
    }
    const ast = parseModule(source);
    const record = analyzeModule(ast, moduleId);
    modules.set(moduleId, record);
    evaluateImports(record);
    walkStatementsList(ast.program.body, record, false, false);
    // Export table: local bindings first, then re-export chains resolved
    // through their source modules.
    const exports = new Map();
    record.exportLocals.forEach((local, exported) => {
      if (record.bindings.has(local)) exports.set(exported, record.bindings.get(local));
    });
    record.reexports.forEach((entry, exported) => {
      const depId = resolve(entry.source, record.id);
      if (!depId) return;
      const dep = modules.get(depId) ?? evaluateModule(depId);
      const value = dep?.exports.get(entry.imported);
      if (value !== undefined) exports.set(exported, value);
    });
    if (record.defaultLocal && record.bindings.has(record.defaultLocal)) {
      exports.set("default", record.bindings.get(record.defaultLocal));
    }
    record.exports = exports;
    return record;
  };

  /**
   * Resolves and evaluates a module's imports in declaration order,
   * binding each named import to its evaluated export. Unresolvable or
   * bare-specifier imports stay unbound — references to them are
   * non-foldable.
   * @param {object} record Module record
   */
  const evaluateImports = (record) => {
    let i = 0;
    while (i < record.imports.length) {
      const entry = record.imports[i++];
      if (entry.source === CSS_PACKAGE || !entry.source.startsWith(".")) continue;
      const depId = resolve(entry.source, record.id);
      if (!depId) continue;
      const dep = evaluateModule(depId);
      if (!dep) continue;
      if (entry.local === null) continue; // side-effect import: evaluation is the point
      const value = dep.exports.get(entry.imported);
      if (value !== undefined) record.bindings.set(entry.local, value);
    }
  };

  evaluateImports(mod);
  walkStatementsList(ast.program.body, mod, true, true);

  let css;
  try {
    css = cssText();
  } finally {
    resetCss();
  }
  return { replacements, css, watchFiles: Array.from(watched) };
}
