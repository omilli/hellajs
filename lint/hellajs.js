import { definePlugin, defineRule } from "vite-plus/lint/plugins";

/**
 * HellaJS custom lint rules, ported verbatim from the former
 * eslint.config.mjs no-restricted-syntax blocks when the repo moved to
 * `vp lint`. Messages quote the guides they enforce — keep them in sync with
 * guides/code.md (§Loops, §Type guards) and guides/tests.md (§Anti-Patterns).
 *
 * Scoping is self-contained: oxlint JS-plugin rules cannot read per-file
 * config, so each rule gates its visitors on `context.filename` against the
 * same globs the eslint blocks used. Paths are matched segment-safely
 * (`(^|/)`) so absolute and relative filenames behave identically.
 */

// packages/*/lib/**/*.{ts,tsx} — the package source trees.
const LIB_SCOPE = /(^|\/)packages\/[^/]+\/lib\/.+\.tsx?$/;
// Type discrimination lives in core's guards (env probes, shared utils);
// ssr/lib is the pure stringifier. Same exemptions the eslint block carried.
const LIB_EXEMPT = [
  /(^|\/)packages\/core\/lib\/internal\/utils\.ts$/,
  /(^|\/)packages\/core\/lib\/internal\/env\.ts$/,
  /(^|\/)packages\/ssr\/lib\//,
];

// packages/*/tests/**/*.test.{ts,tsx} + plugins/*/tests/**/*.test.ts — the
// vp test include globs (vite.config.ts test.include).
const TESTS_SCOPE =
  /(^|\/)(packages\/[^/]+\/tests\/.+\.test\.tsx?|plugins\/[^/]+\/tests\/.+\.test\.ts)$/;

function inLibScope(filename) {
  return LIB_SCOPE.test(filename) && !LIB_EXEMPT.some((exempt) => exempt.test(filename));
}

/**
 * Iterator-allocating loops are banned in package libs (guides/code.md
 * §Loops) — cached while loops are the canonical form. `for await…of` passes
 * the await=false check (permitted for async iterables).
 */
const noIteratorLoops = defineRule({
  meta: {
    messages: {
      noIteratorLoops:
        "Cached while loops are the canonical form in lib/ — for…of/for…in allocate an iterator per iteration (guides/code.md §Loops). for await…of is permitted for async iterables; use .forEach on cold paths.",
    },
  },
  create(context) {
    if (!inLibScope(context.filename)) return {};
    return {
      ForOfStatement(node) {
        if (node.await === false) {
          context.report({ node, messageId: "noIteratorLoops" });
        }
      },
      ForInStatement(node) {
        context.report({ node, messageId: "noIteratorLoops" });
      },
    };
  },
});

/**
 * Type discrimination in package libs goes through core's guards
 * (guides/code.md § Type guards) — raw typeof comparisons are banned.
 */
const noRawTypeofCompare = defineRule({
  meta: {
    messages: {
      noRawTypeofCompare:
        "Use the type-guard utils from @hellajs/core (isString/isNumber/isBoolean/isFunction/isObject/isPlainObject/isFalsy) via the package's lib/internal/core.ts shim — raw typeof comparisons are banned in package lib/ (guides/code.md § Type guards). For undefined use `x === undefined`; for undeclared-global probes use hasWindow/hasDocument/hasNavigator.",
    },
  },
  create(context) {
    if (!inLibScope(context.filename)) return {};
    return {
      BinaryExpression(node) {
        if (!/^[=!]==?$/.test(node.operator)) return;
        const typeofSide = [node.left, node.right].find(
          (side) => side.type === "UnaryExpression" && side.operator === "typeof",
        );
        if (typeofSide) context.report({ node: typeofSide, messageId: "noRawTypeofCompare" });
      },
    };
  },
});

/**
 * Banned test APIs (guides/tests.md §Anti-Patterns) — vite-plus/test only:
 * test() for cases, vi for mocks. Post-01 world: `vi` is sanctioned and
 * `mock.*` is no longer banned; `jest.*` stays banned.
 */
const testsApi = defineRule({
  meta: {
    messages: {
      testsApi:
        "vite-plus/test only — test() (never it()/test.skip()) and vi (never jest.*) (guides/tests.md §Anti-Patterns)",
    },
  },
  create(context) {
    if (!TESTS_SCOPE.test(context.filename)) return {};
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === "Identifier" && callee.name === "it") {
          context.report({ node, messageId: "testsApi" });
          return;
        }
        if (callee.type !== "MemberExpression") return;
        const object = callee.object;
        const property = callee.property;
        if (object.type !== "Identifier" || property.type !== "Identifier") return;
        if ((object.name === "test" && property.name === "skip") || object.name === "jest") {
          context.report({ node, messageId: "testsApi" });
        }
      },
    };
  },
});

export default definePlugin({
  meta: { name: "hella" },
  rules: {
    "no-iterator-loops": noIteratorLoops,
    "no-raw-typeof-compare": noRawTypeofCompare,
    "tests-api": testsApi,
  },
});
