// Import management utilities
import { identifier, importDeclaration, importSpecifier } from "../builders/vnode.mjs";

/**
 * Check if any specifier provides a local binding named `name`.
 * Emitted code (`ForEach(props)`) references the local binding, so injection
 * keys on it: `import { ForEach as F }` does not bind `ForEach`, while
 * `import { x as ForEach }` does.
 * @param {import("estree").ImportDeclaration["specifiers"]} specifiers
 * @param {string} name Local binding name the emitted code requires.
 */
function hasNamedImport(specifiers, name) {
  return specifiers.some((spec) => spec.type === "ImportSpecifier" && spec.local.name === name);
}

/**
 * Add a named import for `name` to the existing `ImportDeclaration` for
 * `source`, or unshift a new declaration onto `program.body`.
 * Idempotent on the local binding name: an existing binding short-circuits,
 * an alias of the required name gains a fresh specifier
 * (`import { ForEach as F, ForEach }` is legal).
 * @param {import("estree").Program} program
 * @param {string} source Module specifier to import from.
 * @param {string} name Local binding name to ensure.
 */
function ensureNamedImport(program, source, name) {
  const body = program.body;

  let i = 0;
  const len = body.length;
  while (i < len) {
    const node = body[i];
    if (node.type === "ImportDeclaration" && node.source.value === source) {
      if (hasNamedImport(node.specifiers, name)) return;

      node.specifiers.push(importSpecifier(identifier(name), identifier(name)));
      return;
    }
    i++;
  }

  program.body.unshift(
    importDeclaration([importSpecifier(identifier(name), identifier(name))], source),
  );
}

/**
 * Ensure `import { ForEach } from "@hellajs/dom"` in the program.
 * @param {import("estree").Program} program
 */
export function ensureForEachImport(program) {
  ensureNamedImport(program, "@hellajs/dom", "ForEach");
}

/**
 * Ensure `import { Portal } from "@hellajs/dom"` in the program.
 * @param {import("estree").Program} program
 */
export function ensurePortalImport(program) {
  ensureNamedImport(program, "@hellajs/dom", "Portal");
}

/**
 * Ensure `import { Lazy } from "@hellajs/dom"` in the program.
 * @param {import("estree").Program} program
 */
export function ensureLazyImport(program) {
  ensureNamedImport(program, "@hellajs/dom", "Lazy");
}

/**
 * Add a bare side-effect import for `source` to the program, or keep the existing one.
 * Idempotent per source: an existing declaration from the same module short-circuits.
 * @param {import("estree").Program} program
 * @param {string} source Module specifier imported for side effects.
 */
function ensureSideEffectImport(program, source) {
  const body = program.body;

  let i = 0;
  const len = body.length;
  while (i < len) {
    const node = body[i];
    if (node.type === "ImportDeclaration" && node.source.value === source) return;
    i++;
  }

  program.body.unshift(importDeclaration([], source));
}

// dom gates each feature subsystem's runtime wiring behind a side-effect module
// (@hellajs/dom/lib/features/<name>.ts); bundlers keep them alive via dom's
// sideEffects array while feature-free apps tree-shake the wiring out.

/**
 * Ensure `import "@hellajs/dom/features/hooks"` in the program.
 * @param {import("estree").Program} program
 */
export function ensureHooksFeatureImport(program) {
  ensureSideEffectImport(program, "@hellajs/dom/features/hooks");
}

/**
 * Ensure `import "@hellajs/dom/features/errors"` in the program.
 * @param {import("estree").Program} program
 */
export function ensureErrorsFeatureImport(program) {
  ensureSideEffectImport(program, "@hellajs/dom/features/errors");
}

/**
 * Ensure `import "@hellajs/dom/features/direct-events"` in the program.
 * @param {import("estree").Program} program
 */
export function ensureDirectEventsFeatureImport(program) {
  ensureSideEffectImport(program, "@hellajs/dom/features/direct-events");
}

/**
 * Ensure `import "@hellajs/dom/features/namespaces"` in the program.
 * @param {import("estree").Program} program
 */
export function ensureNamespacesFeatureImport(program) {
  ensureSideEffectImport(program, "@hellajs/dom/features/namespaces");
}

/**
 * Ensure `import "@hellajs/dom/features/custom-elements"` in the program.
 * @param {import("estree").Program} program
 */
export function ensureCustomElementsFeatureImport(program) {
  ensureSideEffectImport(program, "@hellajs/dom/features/custom-elements");
}

// The compiler contract: named runtime imports come from the public subpath
// (@hellajs/dom/runtime), never from dom internals — emitted code lists exactly
// the helpers the file's emission uses, in this canonical order, `component`
// now included (both targets wrap component calls through it). Locals are
// aliased to `_hella*` uids: bare names like `text`/`prop`/`on` collide with
// ordinary user variables (a component prop named `text` would shadow the
// import inside its own build body), and uids never touch user declarations —
// the old `import { component as c }` alias interplay died with the bare
// component injection.
const RUNTIME_SOURCE = "@hellajs/dom/runtime";
const RUNTIME_HELPERS = [
  "component",
  "template",
  "fragment",
  "mark",
  "text",
  "prop",
  "on",
  "direct",
  "hook",
  "errorConfig",
  "child",
];

/**
 * Ensure `import { template as _hellaTemplate, … } from "@hellajs/dom/runtime"`
 * carrying exactly the helpers the file's dom-target emission used, each aliased
 * to the collector's uid local. Merges into an existing runtime declaration
 * (idempotent per local binding) or unshifts one new declaration.
 * @param {import("estree").Program} program
 * @param {Map<string, import("estree").Identifier>} used Runtime export name → uid local identifier
 */
export function ensureRuntimeImport(program, used) {
  const specifiers = [];
  let i = 0;
  while (i < RUNTIME_HELPERS.length) {
    const name = RUNTIME_HELPERS[i++];
    const local = used.get(name);
    if (local) specifiers.push(importSpecifier(local, identifier(name)));
  }
  if (specifiers.length === 0) return;

  const body = program.body;
  i = 0;
  while (i < body.length) {
    const node = body[i++];
    if (node.type === "ImportDeclaration" && node.source.value === RUNTIME_SOURCE) {
      // A namespace/default import cannot carry named clauses (`import * as ns, { x } from`
      // is invalid) — skip it and fall through to a fresh plugin-owned declaration.
      const hasNamespaceOrDefault = node.specifiers.some(
        (spec) =>
          spec.type === "ImportNamespaceSpecifier" || spec.type === "ImportDefaultSpecifier",
      );
      if (hasNamespaceOrDefault) continue;
      let j = 0;
      while (j < specifiers.length) {
        const spec = specifiers[j++];
        const exists = node.specifiers.some(
          (candidate) =>
            candidate.type === "ImportSpecifier" && candidate.local.name === spec.local.name,
        );
        if (!exists) node.specifiers.push(spec);
      }
      return;
    }
  }
  program.body.unshift(importDeclaration(specifiers, RUNTIME_SOURCE));
}
