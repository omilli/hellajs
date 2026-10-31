<compiler>

Build-time JSX engine (`hellajs-compiler`): the JS-glue dual-target compiler behind the vite/rollup/astro wrappers. Entry point: `index.mjs` re-exports `src/pipeline.mjs`'s `transform(code, options)`.

**Dual-target contract.** One pipeline, two emission currencies: `target: "dom"` (the default) lowers element/fragment JSX to imperative `@hellajs/dom/runtime` construction (the `src/builders/imperative.mjs` row below); `target: "ast"` emits HellaNode objects, byte-compatible with `@hellajs/ssr`'s input. Component detection, passthrough handling, attribute/child processors, and feature collection are shared; only element/fragment expression emission differs. Both targets must stay in lockstep — the shared processors are the control, and each target's suite pins the corpus shape for its currency.

**Options validate at call time** (single export, no separate validator): a non-object options value, an unknown key, or an invalid `target`/`lang` throws a `[hellajs-compiler]`-prefixed error BEFORE the JSX sniff. Default `target` is `"dom"` (the wrapper-level client default, deliberately not the server's `"ast"` currency — every real call site passes an explicit target). The wrappers' eager-validation path is the empty-input probe `transform("", { filename, target })`.

## Pipeline

`transform` (src/pipeline.mjs) runs: validate options → sniff `code.includes("<")` (false negatives impossible; false positives cost one null-returning parse) → `oxc-transform` `transformSync(filename, code, { lang, jsx: "preserve", sourcemap: true })` TS-strip for `ts`/`tsx` only (js/jsx skip it) → acorn + acorn-jsx parse (estree; acorn-jsx emits standard JSX estree node shapes) → `transformProgram` walker pass → astring generate → sourcemap chain. `transformSync` errors with severity `"Error"` throw `[hellajs-compiler] <message>`; acorn parse failures rethrow with the same prefix.

**Sourcemap chain**: for ts/tsx the strip-stage map composes with the print-stage map via `remapping(printMap, () => stripMap)`; js/jsx ships the print map alone. The print map (§buildPrintMap) pairs the post-transform program with a re-parse of the printed output (both acorn, structurally identical — astring prints a deterministic rendering), emitting one node-start mapping per generated position. Granularity is node-start, not hires: sufficient for expression-level original positions.

**Total-replacement invariant**: every JSXElement/JSXFragment is replaced under both targets, so astring never prints JSX (it cannot — no JSX printer). If a JSX node survives the walk, generate throws loudly.

## Files

| File | Responsibility |
|---|---|
| `index.mjs` | Entry; re-exports `transform` from `src/pipeline.mjs`. |
| `index.d.ts` | Typed surface: `TransformOptions`, `TransformResult`, `transform`. |
| `src/pipeline.mjs` | Option validation + lang resolution (explicit `lang` wins, else filename extension), sniff, oxc strip stage, acorn-jsx parse, walker dispatch, astring print, print-map build (§buildPrintMap) + remapping chain. Returns null on JSX-free input. |
| `src/transform.mjs` | Walker core: pre-order slot replacement recursing into replacements, component detection + passthrough dispatch, per-file feature collection (incl. `collectStaticFeatures` on pre-replacement folded subtrees), `resolveTagCallee` (JSXIdentifier/JSXMemberExpression → estree callee; throws on namespaced tags), the `TransformContext` scope machinery, and the Program-exit import emission (features in fixed order, then `@hellajs/dom/runtime`, each unshifted at the body front — the fixed exit sequence) + the merged hoisted-const declaration prepended above all imports. |
| `src/processors/attributes.mjs` | `processAttributes`: prefix categorization, JSXExpressionContainer unwrap, camelCase→kebab conversion, element-path `maybeReactive` application; reports the `features` flags alongside the buckets. |
| `src/processors/children.mjs` | `filterEmptyChildren`: drops empty/whitespace text + JSXEmptyExpression, normalizes whitespace, marks bare `props.children` as a SpreadElement. |
| `src/builders/children.mjs` | `buildChildrenValue`: children list → array expression (joined when all-static); any SpreadElement flips the whole list to an `[].concat(...)` call. Imports the estree primitives from `vnode.mjs`; callers pre-assemble and hand `buildHellaNode` the built expression, keeping the import graph cycle-free (vite's SSR transform breaks call-time cycles — bindings destructure at evaluation). |
| `src/builders/vnode.mjs` | The estree primitives hub (the `t`-builder replacement: identifier/literals/calls/properties/import nodes + the isX guards) + `buildHellaNode`: object expression with `tag` + non-empty category fields; children arrive pre-assembled from `builders/children.mjs`. |
| `src/builders/component.mjs` | `buildComponentCall`: emits `component(Tag, props)` or passthrough `Tag(props)`; merges children into props. |
| `src/builders/imperative.mjs` | `buildImperativeSite` (target: "dom"): hoisted `template()`/`fragment()` const + `mark()`ed build fn over `@hellajs/dom/runtime` calls; owns template-HTML serialization (literal-prop folding, void/raw-text tags, entity escaping), the leading-static-prefix fold boundary, anchor child-index paths, root `key` extraction, the `errorConfig` named-fn self-reference, and the svg/math ancestry thread (nested foreign-interior sites emit the parse-namespace URI; `foreignObject` resets). |
| `src/utils/imports.mjs` | `ensureNamedImport` + `ensureSideEffectImport` + helpers (`ensureCreateComponentImport`, `ensureForEachImport`, `ensurePortalImport`, `ensureLazyImport`, `ensure{Hooks,Errors,DirectEvents,Namespaces,CustomElements}FeatureImport`) + `ensureRuntimeImport` (canonical `RUNTIME_HELPERS` order). |
| `src/utils/passthrough.mjs` | `PASSTHROUGH_INJECTORS` map: passthrough tag name → its `ensure*Import` helper. |
| `src/utils/reactive.mjs` | `maybeReactive` + `containsCall`: auto-wrap heuristic (double-wrap guard; top-level `raw()` sentinel exemption). containsCall walks child slots generically — estree has no VISITOR_KEYS table. |
| `src/utils/static.mjs` | Static-subtree hoisting (ast target): `tryBuildStaticJSX` (reuses the processors for normalization parity), `hoistStaticJSX`, `isLiteralValue` (shared with the dom target's template folding). |

## Scope machinery

- Hoisted consts: `ctx.hoisted` (array of `{ id, init }`), emitted as ONE merged `const a = …, b = …;` declaration prepended above all imports at walk end.
- Uid generation: `ctx.generateUid(base)` — `_hella`-prefixed per-base counters (`_hellaTpl`, `_hellaTpl2`, …) over `ctx.usedNames`, seeded by a full identifier-name scan of the parsed program — collision-free against user bindings (over-approximation is the safe direction), deterministic output.
- JSX replacement: `visitNode` replaces JSX slots and recurses into each replacement; `ctx.replaced` counts them (zero → `transformProgram` returns null).

## Non-obvious behaviors

Grounded in tests — verify any change against these:

- **Runtime import emission lists exactly the used helpers** in canonical `RUNTIME_HELPERS` order, aliased to `_hella*` uid locals (bare names like `text`/`prop`/`on` would collide with user variables).
- **Dom target: uniform marking + fold boundary** — literal props minus `value`/`checked`/`selected`/`innerHTML` fold into the template html; the first dynamic child flips the rest to runtime calls in document order. Root `key` moves to `mark(fn, { key })` metadata; a key-less root with spreads re-carries them via `mark(fn, { ...spreads })`.
- **`@hellajs/ssr` rejects dom-target builds** — the ast target is the only server currency; wrappers resolve per environment (server → `"ast"`, client → `"dom"`).
- **Output assembly order** (parity-load-bearing): merged hoisted consts first, then injected imports with the LAST unshifted FIRST (runtime import, feature imports in reverse emission order hooks→errors→direct-events→namespaces→custom-elements, traversal-time component/passthrough imports reverse-chronological), then the original body. `ensureNamedImport` merges into an existing declaration for the same source wherever it sits (a user's `@hellajs/dom` import gains specifiers in place).
- **`raw` preservation**: parsed string literals keep their authored quotes (astring prints `node.raw`); generated literals carry double-quoted raws. Output formatting is never asserted byte-level — the suite normalizes or AST-compares.
- **oxc strip appends `export {};`** to a ts/tsx module stripped to zero import/export statements — inputs that must stay module-shaped keep one value import.
- **Namespaced element tags throw** the shared `[hellajs-compiler] unsupported JSX tag name` error (ast parity); namespaced ATTRIBUTE keys (`xml:lang`) become quoted string keys.

## Tests

Four files under `tests/`: `helpers.ts` (engine driver: `transformJSX`, `normalize`, `getNamedImports`), `transform.test.ts` (ast corpus + option validation + the dom-default pin), `imperative.test.ts` (dom-target goldens), `sourcemap.test.ts` (map composition + original-position mapping).

- **Run** — `vp run coverage compiler` (scoped plugin gate; coverage measures `src/*.mjs` minus `index.mjs`) + `vp run lint`. Tests import from source `index.mjs`, not `dist/`.
