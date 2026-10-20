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
  return specifiers.some((spec) => t.isImportSpecifier(spec) && spec.local.name === name);
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

      node.specifiers.push(t.importSpecifier(t.identifier(name), t.identifier(name)));
      return;
    }
    i++;
  }

  program.node.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier(name), t.identifier(name))],
      t.stringLiteral(source),
    ),
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

/**
 * Add a bare side-effect import for `source` to the program, or keep the existing one.
 * Idempotent per source: an existing declaration from the same module short-circuits.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 * @param {string} source Module specifier imported for side effects.
 */
function ensureSideEffectImport(t, program, source) {
  const body = program.node.body;

  let i = 0;
  const len = body.length;
  while (i < len) {
    const node = body[i];
    if (t.isImportDeclaration(node) && node.source.value === source) return;
    i++;
  }

  program.node.body.unshift(t.importDeclaration([], t.stringLiteral(source)));
}

// dom gates each feature subsystem's runtime wiring behind a side-effect module
// (@hellajs/dom/lib/features/<name>.ts); bundlers keep them alive via dom's
// sideEffects array while feature-free apps tree-shake the wiring out.

/**
 * Ensure `import "@hellajs/dom/features/hooks"` in the program.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 */
export function ensureHooksFeatureImport(t, program) {
  ensureSideEffectImport(t, program, "@hellajs/dom/features/hooks");
}

/**
 * Ensure `import "@hellajs/dom/features/errors"` in the program.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 */
export function ensureErrorsFeatureImport(t, program) {
  ensureSideEffectImport(t, program, "@hellajs/dom/features/errors");
}

/**
 * Ensure `import "@hellajs/dom/features/direct-events"` in the program.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 */
export function ensureDirectEventsFeatureImport(t, program) {
  ensureSideEffectImport(t, program, "@hellajs/dom/features/direct-events");
}

/**
 * Ensure `import "@hellajs/dom/features/namespaces"` in the program.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 */
export function ensureNamespacesFeatureImport(t, program) {
  ensureSideEffectImport(t, program, "@hellajs/dom/features/namespaces");
}

/**
 * Ensure `import "@hellajs/dom/features/routed-props"` in the program.
 * @param {typeof import("@babel/core").types} t
 * @param {import("@babel/core").NodePath} program
 */
export function ensureRoutedPropsFeatureImport(t, program) {
  ensureSideEffectImport(t, program, "@hellajs/dom/features/routed-props");
}
