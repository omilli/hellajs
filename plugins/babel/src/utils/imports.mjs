// Import management utilities

/**
 * Check if any specifier provides a local binding named `name`.
 * Emitted code (`component(Tag, props)`, `ForEach(props)`) references the
 * local binding, so injection keys on it: `import { component as c }` does
 * not bind `component`, while `import { x as component }` does.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").ImportDeclaration["specifiers"]} specifiers
 * @param {string} name Local binding name the emitted code requires.
 */
function hasNamedImport(t, specifiers, name) {
  return specifiers.some(
    spec => t.isImportSpecifier(spec) && spec.local.name === name
  );
}

/**
 * Add a named import for `name` to the existing `ImportDeclaration` for
 * `source`, or unshift a new declaration onto `program.node.body`.
 * Idempotent on the local binding name: an existing binding short-circuits,
 * an alias of the required name gains a fresh specifier
 * (`import { component as c, component }` is legal).
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 * @param {string} source Module specifier to import from.
 * @param {string} name Local binding name to ensure.
 */
function ensureNamedImport(t, program, source, name) {
  const body = program.node.body;

  let i = 0;
  const len = body.length;
  while (i < len) {
    const node = body[i];
    if (t.isImportDeclaration(node) && node.source.value === source) {
      if (hasNamedImport(t, node.specifiers, name)) return;

      node.specifiers.push(
        t.importSpecifier(t.identifier(name), t.identifier(name))
      );
      return;
    }
    i++;
  }

  program.node.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier(name), t.identifier(name))],
      t.stringLiteral(source)
    )
  );
}

/**
 * Ensure `import { component } from "@hellajs/dom"` in the program.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 */
export function ensureCreateComponentImport(t, program) {
  ensureNamedImport(t, program, "@hellajs/dom", "component");
}

/**
 * Ensure `import { ForEach } from "@hellajs/dom"` in the program.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 */
export function ensureForEachImport(t, program) {
  ensureNamedImport(t, program, "@hellajs/dom", "ForEach");
}

/**
 * Ensure `import { Portal } from "@hellajs/dom"` in the program.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 */
export function ensurePortalImport(t, program) {
  ensureNamedImport(t, program, "@hellajs/dom", "Portal");
}

/**
 * Ensure `import { Lazy } from "@hellajs/dom"` in the program.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 */
export function ensureLazyImport(t, program) {
  ensureNamedImport(t, program, "@hellajs/dom", "Lazy");
}
