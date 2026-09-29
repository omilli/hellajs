# Memory Update Log

## 2026-09-29
* **Creation**: Added concept [123](entries/123.md) (type: decision).

## 2026-09-27
* **Creation**: Added concept [210](entries/210.md) (type: correction).
* **Deprecation**: Archived [147](archive/147-adding-new-packages-workspace-requires.md) → superseded by [210](entries/210-adding-new-packages-workspace-requires.md).
* **Refresh**: Entry 148 re-verified 2026-09-27: TS2345 claim re-confirmed against lib.dom.d.ts (Document/Window keyed overloads; Node/ParentNode inherit EventTarget's string-only overload) and fix pattern re-confirmed in packages/dom/lib/{onEscape,rovingTabIndex,trapFocus,onOutside,internal/events}.ts; stale Evidence paths packages/primitives/* corrected to packages/dom/* (package folded into dom).
* **Refresh**: Entry 149: re-verified package-boundary decision vs current tree — no primitives workspace; ten behavior functions flat on dom (index.ts exports confirmed); npm primitives E404 + dom 1.4.2; sideEffects:false present; no module-scope side effects in dom/lib (top-level + recursive rg empty); behavior graphs core-free (imports: internal/focusables, computeAnchorPosition, option types only). Fixed stale evidence: 'four functions' count → ten, dropped dead plans/dom/code/dissolve-primitives/ pointer (cleaned post-merge).
* **Refresh**: Entry 150 (close dynamic html-template component tags with </${Component}>): re-verified all claims — TOKEN_REGEX verbatim at template.ts:54 (\w- names only), slot path html.ts:27 __SLOT_N__ + isSlotCloser stack walk template.ts:292/297, components.mdx §Component Syntax documents </${MyComponent}>, rule codified in guides/code.md:134,369 + guides/docs.md:617-623,767, zero <//> usage repo-wide (guides quote it as prohibition only), short-close guard script absent. Bumped last_confirmed 2026-09-24 → 2026-09-27.
* **Refresh**: Re-verified entry 151: feedback scan.ts sessionDir() still derives the session dir from process.cwd() with no worktree mapping (.agents/skills/feedback/scripts/scan.ts:69-72); reproduced the exact 'no session dir for cwd … pass a session file path' exit-1 failure from a cwd lacking a session dir; positional session-file-path arg and SKILL.md fallback unchanged.
* **Refresh**: Entry 152 (commitlint hook ENOENT on workspace-deleting commits): re-verified against current commitlint.config.ts — readdirSync over packages/+plugins/, unguarded readFileSync of <dir>/package.json inside the flatMap filter (line 11), and the commit-msg hook's misleading 'does not follow conventional commits format!' message all unchanged; packages/primitives no longer exists but the crash mode is structural.
* **Creation**: Added concept [211](entries/211.md) (type: correction).
* **Deprecation**: Archived [153](archive/153-bun-isolated-linker-breaks-worktree-root-imports.md) → superseded by [211](entries/211-fresh-bun-isolated-linker-installs.md).
* **Refresh**: Re-verified entry 154 against scripts/agent/relay.ts (startStdin line-by-line reader, handleLine pending-dialog routing, ask docstring leading-integer note) and scripts/remote/server.ts + panel (dialog fan-out as panel cards) — all claims still hold; bumped last_confirmed to 2026-09-27
* **Refresh**: Re-verified 155 (package tsconfig types-override correction): buildDeclarations tsc --project flow, base types [node,bun], registry tsc --ignoreConfig gate, tsconfig.lint.json registry scope (-html.ts excluded, no tsx include), eslint canonical ignores, and all 8 package tsconfigs in {extends, rootDir, include} shape — all claims hold; note: evidence names 'primitives' which is no longer a package
* **Refresh**: Entry 156 (per-module dist specifier fixup rewrites string literals; lib constants must carry final .js form): re-verified against current source — esbuild-build.ts buildIndividualModules fixup regex + .js-skip + /index.js fallback (lines 174/232-248), bundle path lacks extension-appending, transform.ts CN_IMPORT authored with .js + rationale comment, bin→dist/index.js vs @hellajs/ui/bundle→dist/bundle.js dist split, cli-e2e.test.ts:42 assertion, and live dist/internal/transform.js + dist/bundle.js both carrying the .js form.
* **Refresh**: Re-verified entry 157 against packages/dom/lib/internal/events.ts (setNodeHandler body capture listener + composedPath walk + handler.call binds only this; setDirectHandler attaches to element) and ui registry canonicals (e.target extraction, zero currentTarget reads; menubar comment corroborates). All claims hold.
* **Refresh**: Entry 158 (HappyDOM focus() fires bubbling focusin): re-verified against happy-dom 20.14.5 source (focus() dispatches non-bubbling focus + bubbling focusin, both composed) and the load-bearing tabs arrows test (34 pass over four compiled variants); fixed drifted evidence citation (bun-hoisted node_modules path, current test title) and bumped dates
* **Refresh**: Entry 159 (docs-site aliases resolve via tsconfig paths): re-verified against docs/astro.config.mjs, docs/tsconfig.json, Astro 7.2.0 dist source (create-vite.js sets resolve.tsconfigPaths:true; vite-plugin-config-alias converts compilerOptions.paths as deprecated fallback), and a live 'bun run build' in docs/ (165 pages, no Rolldown errors). Noted: packages/primitives dissolved into dom (fb093851); the @primitives/* tsconfig path is now vestigial (no imports, nonexistent dir) and absent from astro.config — consistent with the entry's mechanism claim.
* **Refresh**: Re-verified 160 against scripts/bundle/esbuild-build.ts (externalFlags = peerDeps+dependencies consumed only by buildBundle->buildWithEsbuild; buildIndividualModules buildArgs lack --bundle/externals), ui package.json (esbuild ^0.27.2 runtime dep), dist artifacts (only bundle.js + internal/strip.js import esbuild, strip.js:1 verbatim), and an empirical esbuild probe (--external without --bundle errors 'Cannot use "external" without "bundle"', exit 1)
* **Creation**: Added concept [212](entries/212.md) (type: correction).
* **Deprecation**: Archived [161](archive/161-docs-site-runtime-imports-root-links.md) → superseded by [212](entries/212-docs-site-hellajs-runtime-imports.md).
* **Creation**: Added concept [213](entries/213.md) (type: correction).
* **Deprecation**: Archived [162](archive/162-worker-split-mode-venues-inherit.md) → superseded by [213](entries/213.md).
* **Refresh**: Entry 163: re-verified TS 6.0.3 same-basename shadow with a fresh tsc --listFiles probe (a.ts in program, a.tsx absent; tsx-only include lists a.tsx), confirmed registry.json files arrays use <name>.tsx + <name>-html.ts, matchesFormat at packages/ui/lib/addComponent.ts, and the gotcha codified in packages/ui/AGENTS.md §Registry; replaced the post-merge-deleted plan-note citation with live sources
* **Refresh**: Entry 164 (TS 6 tsc TS5112 on explicit file args, --ignoreConfig fix): re-verified against bunx tsc 6.0.3 (TS5112 reproduces without the flag, clears with it) and scripts/bundle/registry.ts:223-226 declaration-pass invocation
* **Refresh**: Entry 165 re-verified against scripts/bundle/cache.ts: getAllSourceFiles still = coreFiles + lib glob + registry glob (ts/tsx/js/jsx/json/css/classes); getGitStatus still git status --porcelain <pkg>; isCacheValid still requires git status AND hash-set match; ui registry/ exists and registry.ts compiles it to dist/registry. No drift.
* **Refresh**: Re-verified 166 against bun 1.3.3 + current tree: Bun.Glob probes reproduce (segment-internal ** dead for nested remainders, /**/*.js matches); bunfig negation brace-group confirmed as the coverage-table row whitelist (registry rows present; zero utils//lib/ rows despite dead ignore globs); registry fix in place in bunfig.toml. Corner case noted: trailing **.ext DOES match a bare filename when no / remains (e.g. **/plugins/**/**.mjs) — entry over-warnings only, safe direction for its bunfig use case.
* **Refresh**: Entry 167 (vite import.meta.glob relative resolution): re-verified every mechanical claim against installed Vite 6.4.1 transformGlobImport (resolution base = dirname of importing module, zero-match emits /* #__PURE__ */ Object.assign({}) silently) and Astro 7.2.0 (?astro&type=script&index=N&lang.ts module query); live Sidebar.astro glob uses correct hop count. Demo.astro/docs/src/demos references confirmed historical (architecture replaced by self-contained ui pages).
* **Refresh**: Entry 168 re-verified: tailwindcss 4.1.18 probe reproduces bg-(--primary)/90 -> plain-var fallback + @supports color-mix; registry tailwind variants (button-tailwind.ts) keep modifiers; fixed stale citations (flat registry layout, removed plan file)
* **Refresh**: Re-verified 169 against live tree (2026-09-27): dom devDep @hellajs/ssr workspace:* present in packages/dom/package.json; root node_modules/@hellajs still core/css/dom/resource/router only (no ssr/store/ui); nested link at packages/dom/node_modules/@hellajs/ssr; bun still 1.3.3 and entry 211 reaffirms the declared-edges-only linking mechanism. Updated stale body citation 023 -> 198 (023 archived 2026-09-26) and aligned the quoted convention with 198's named exceptions (css→csstype, ui→esbuild).
* **Refresh**: Re-verified entry 170 against current tree: config-chain.js:58 dirname=context.cwd, root node_modules/@babel holds only core+preset-typescript, tag-callee.test.ts imports jsxSyntax module (no string plugin names), helpers.ts passes babelHellaJS, index.mjs inherits jsxSyntax, module-types.d.ts ambient PluginItem declaration, lint glob plugins/*/tests/**/*.ts at tsconfig.lint.json:94
* **Refresh**: Re-verified 171 (bun coverage phantom-covered-line + pre-throw process.stdout.write probe): resolveEntry no-style throw still in packages/ui dist (line drift 118→120), console.warn mock-patching confirmed in packages/ui/tests (add.test.ts:19, main.test.ts:18), 043 cross-ref valid; 069 cross-ref updated to 201 (069 archived, superseded by 201 which preserves the empty-cell→lcov workflow)
* **Refresh**: Re-verified 172-bare-optional-children-spread: babel children.mjs:36-43 still compiles bare {props.children} to spreadElement (parity test asserts '...props.children'); dist/registry/bubble/css/bubble.js:239 shows live 'children: [...props.children]' crash form; resizable canonical fixed to {() => props.children} in source+dist; ui AGENTS.md:80 still frames bare member as auto-wrapped vs compound as hazardous
* **Creation**: Added concept [214](entries/214.md) (type: correction).
* **Deprecation**: Archived [173](archive/173-happydom-style-object-never.md) → superseded by [214](entries/214.md).
* **Creation**: Added concept [215](entries/215.md) (type: correction).
* **Deprecation**: Archived [174](archive/174-pass-bun-script-mode-flags.md) → superseded by [215](entries/215.md).
* **Refresh**: Entry 174 bun flag-consumption claim (bun file.ts --apply x drops argv flag) re-verified false on bun 1.3.3 (CI pins latest): all recognized flags after a script path pass through intact (--apply, --smol, --conditions=, --define., --preload, bun run form); only bun -e without a file positional still consumes them — superseded by 215
* **Refresh**: Entry 175: re-verified peekState raw elementMap.get (state.ts:62), processMountQueue 'if (!state) return' skip (queue.ts:215), awaitWiring(stateEl) hook-carrying-element contract (now packages/ui/tests/helpers/variants.ts:722 — path citation fixed), scroll-area test passes bar and 37/37 green via bun test. Claim holds.
* **Creation**: Added concept [216](entries/216.md) (type: decision).
* **Deprecation**: Archived [176](archive/176-refs-tree-re-vendored-verbatim.md) → superseded by [216](entries/216.md).
* **Refresh**: Entry 177 (never git-checkout -- a path in a component worktree): re-verified the recovery recipe against source — committed base 4366d850 = the 7 named entries, registry.json shape (shared core+dom deps, css slot adds @hellajs/css, per-style registryDependencies), files-minus-style-modules rule, registry.test.ts manifest-disk integrity, drift.test.ts fresh-add byte-match, bun bundle ui. One evidence sentence updated: the AGENTS table's stale 'core, dom, primitives' deps text has since been fixed to 'core, dom' — noted as historical.
* **Refresh**: Re-verified 178 (html-runtime attribute accessors) against current source: renderProp drops falsy attribute values (dom internal/utils.ts:71-74); html templates route function-valued props through renderProp via render.ts:205-221, so a raw boolean false drops the attribute while the jsx flavor's string 'false' renders; assertStructuralParity compares per-flavor attribute maps (tests/helpers/variants.ts:738); form-html.ts FormLabel uses errorFlag 'true'|'false' + invalid 'true'|undefined (lines 142-151); checkbox ariaChecked 'true'|'false'|'mixed' (line 50); ui AGENTS.md gotchas still omit the falsy drop (lines 80-81 cover stringification/array slots only); bun bundle ui && bun test packages/ui/tests/form.test.ts passes 78/78
* **Refresh**: Entry 179 (matchMedia stub live-getter): re-verified against packages/ui/registry/sidebar/sidebar.tsx (handler reads query.matches, not the event), packages/ui/tests/sidebar.test.ts installMediaStub (get matches() live getter), and sidebarModuleVariants (4 flavors)
* **Refresh**: Entry 180 (dead sibling unit surgical revert): re-verified against current source — main.test.ts exact listComponents array, cli-e2e.test.ts exact list stdout string, registry.test.ts 61-entry count all red on a manifest/list divergence; drift.test.ts hardcoded add lists inert for extra manifest entries (consistent with the recorded 2-failure state); registry/carousel, AGENTS row, variants.ts block, dist/registry/carousel all absent = revert stands; memory 177 no-checkout rule intact
* **Refresh**: Re-verified 181 against bun 1.3.3 + current source: jest exposes useFakeTimers but no advanceTimersByTime/runAllTimers (fake clock cannot advance); setSystemTime freezes clock readings while real timers fire on the real clock; guides/tests.md has no fake-timer section (delay(N) + Date.now closure remain the only sanctioned patterns); hoverintent.test.ts still the 8-test closure shape. Tightened body: setSystemTime freezes new Date() too, not Date.now() only.
* **Refresh**: Entry 182 re-verified against current tree: dist/registry/skeleton+button css builds end with children: [...props.children]; jsx canonical skeleton.tsx uses {props.children} vs html () => props.children; ChildrenVariant in tests/helpers/variants.ts and card.test.ts children: [] idiom unchanged; guides/tests.md:264 Compile-shape rule present; fresh happy-dom probe reproduces bare-render TypeError and html undefined-safety.
* **Refresh**: Entry 183 (css style() tailwind-condition translation): re-verified &-prefix gate + conditional at-rule selector inheritance in packages/css/lib/css.ts process(), all cited translation forms in registry css modules (&:is(.dark *), &:is(.group[data-disabled='true'] *), &:is(.peer:disabled ~ *), &:is([data-slot='tooltip-content'] *), &:is(a):hover, nested @media 48rem), tokens.js --spacing absence, ui AGENTS.md gotcha; fresh runtime probe of compiled empty/kbd/separator css modules passed 4/4
* **Refresh**: Re-verified 184 against current source: scripts/bundle/registry.ts (whole-tree fs.rm of dist/registry before compiling), scripts/bundle/cache.ts isCacheValid (source-hash + git-status only, dist never hashed), orchestrate.ts cached path (dist/bundle.js existence check, 'Successfully built' for cached:true), scripts/clean.ts (removes dist/ + .build-cache/ per package), tests/helpers/variants.ts dist/registry imports, and plain-JS compiled dist output. Fixed stale 'prunes/rebuilds per-entry dirs' mechanism phrase; failure mode and recovery hold.
* **Refresh**: Entry 185 re-verified: shipped packages/ui/registry marker.tsx (default/separator/border, no positions) and item.tsx (default/outline/muted + size default/sm + ItemMedia default/icon/image) match the refs-govern ruling's outcome ref-verbatim; marker.mdx/item.mdx document the shipped maps; refs/set-folder removal already recorded by entry 216 — no contradiction
* **Refresh**: Entry 186 re-verified: babel kebab-case regex /^(data|aria)[A-Z]/ confirmed ungated by isComponent in JSX path (attributes.mjs:59, jsx.mjs:39) and present in html path (:141); registry collapsible uses semantic controls prop with aria-controls={props.controls} host binding in source (.tsx:20,40,122) and compiled dist.
* **Refresh**: Entry 187 (compiled-registry dual reset): re-verified against packages/dom/package.json exports, utils/test-helpers.js (resetTestState → bundle resetDom), hoverIntent.ts/layerDismissal.ts module-level state, the resetDom() + explanatory comment in tooltip/hover-card/sidebar tests, ui AGENTS.md:150 mounting-only split, and a green re-run of all 8 behavior-wired ui suites (658 pass, 0 fail).
* **Refresh**: Re-verified entry 188 against current source: babel children.mjs three child-slot shapes (member→SpreadElement, bare identifier→nested slot, arrow→function); render.ts appendToParent drops array children through all branches; resolveNode resolves arrow children recursively incl. arrays; compiled dist/registry popover:267 nested binding vs dropdown-menu spreads/arrows; popover triggerChildren still latent-broken (tests pass children: [] only). Empirical: nested-array child renders empty, spread of single vnode throws, arrow child renders array+string.
* **Refresh**: Re-verified entry 189 against current source: parseHTML whole-slot short-circuit (template.ts:253-257) + html() nodes[0] return (html.ts:40) leave a bare-expression html template unwrapped; resolveNode array branch stringifies function children (render.ts:94-114, corroborated verbatim by sidebar-html.ts:139-141 comment); appendToParent reactive loop wires element-root function children (render.ts:282-333); jsx fragment children pass through children.mjs:47 into the reactive path; display:contents wrappers confirmed in direction-html/direction-css and navigation-menu contentAnchor; dropdown/popover/tooltip/hover-card conditional portals all inside element roots.
* **Creation**: Added concept [217](entries/217.md) (type: correction).
* **Deprecation**: Archived [191](archive/191-dispatched-event-signal-writes-stale.md) → superseded by [217](entries/217.md).
* **Refresh**: Entry 191 (dispatched-event signal writes never propagate): re-probed false — signal write inside a dispatched Escape handler (onClose: () => dlg.open(false)) flips data-state synchronously across all 4 compiled dialog variants; core flushes unbatched writes synchronously (signal.ts !batchDepth && flush, batch.ts finally). True reason for the mock-assert + test-scope-exit shape is the component contract: components only call onClose and never write the open signal. Re-verified delivered dialog.test.ts and drawer.test.ts shapes. Corrected concept 217 supersedes 191.
* **Refresh**: Entry 192 (never git-restore tracked files in worktrees): re-verified core rule against .agents/skills/worker/scripts/worktree.mjs (worker never commits; baseline via commit-tree, no ref moved), worker SKILL.md (uncommitted accumulation, sanctioned bun.lock restore exception), merge SKILL.md; corrected evidence drift (registry.test.ts now matches keys against source registry/ dirs, dist/registry covered by compile.test.ts + helpers/variants.ts; cited plan set folder since merged away)
* **Refresh**: Entry 193 (nuke-plan-unit-from-live-set): re-verified all mechanisms against current tree — plan files untracked (git ls-files), worker SKILL.md dependency gate + worktree carry rules, live set index/depgraph/depends_on structure in plans/agents/config/tdd-evidence/, registry.json 61 entries with cn+theme and no carousel. Cited set folder merged since; no contradictions.
* **Update**: Renumber merged worker entries 201/202/203 (bare-identifier-extraction, widen-t-extends, eslint-no-useless-assignment) to 218/219/220 — main tree had taken 201-217 first
* **Maintenance**: Retroactive refutation-gate pass over memory/archive: reclassified all 33 retired entries against the tightened supersede gate (refutation/reversal vs concept-preserving drift). Removed 005/115/123/190 as drift-class (supersedes refs stripped, successors edited to stand alone, timestamps bumped); 29 kept — wrong-at-the-time diagnoses, reversed rituals/directives, or corrected overbroad claims.
* **Creation**: Added concept [005](entries/005-no-repo-remote-phone-control.md) (type: decision): remote daemon + web relay removed deliberately — external tooling if phone control is ever wanted
* **Refresh**: Entries 122/154/206 refreshed after the remote nuke: dropped `bun remote` panel parenthetical (154), re-measured the relay consumer surface at five files (206), noted the daemon removal as drift context (122)
* **Creation**: Added concept [011](entries/011.md) (type: decision).
* **Update**: Added concept 221 (type: correction): fn children passed INTO a component stringify instead of rendering (plain-element parents or wrapper getters for dynamic lists); vendored component props are consumed as statically as their templates read them
* **Creation**: Added concept [115](entries/115.md) (type: decision).

## 2026-09-26
* **Refresh**: entry 194 (ui sibling-doc links via /ui/<name>): re-verified docs/src/pages/ui/*.astro registration, /learn/concepts core-only scope, /ui/ crossrefs in command/alert-dialog mdx, /components tripwire + .mdx/.astro resolution in scripts/doc-links.ts, nav.ts ui array, and bun doc-links green
* **Refresh**: Re-verified entry 195 against current source: worktree.mjs seeds root install and never bundles; dist gitignored so fresh cuts ship no dist; docs/package.json file: deps + docs/bun.lock present; main tree docs/node_modules has no @hellajs shadow; docs-local-copy mechanism matches cited 2025-09-24 worktree evidence (bun 1.3.3). Found docs/bun.lock stale (name docs2, zero @hellajs entries) — reinforces, does not contradict, the entry.
* **Refresh**: Re-verified entry 158 (HappyDOM focus() fires bubbling focusin) against resolved happy-dom 20.14.5 HTMLElementUtility.focus() source and packages/ui/tests/tabs.test.ts:134 — 4-variant arrows test present and passing (34 pass/0 fail via bun bundle ui + bun test).
* **Refresh**: Entry 001 (keep re-export shims external): re-verified against current tree — shim packages/dom/lib/internal/core.ts exists (single export{} from @hellajs/core), 11 lib/ consumers, bundle.js + bundle.min.js each carry exactly one @hellajs/core import; refreshed stale bundle.js line citation to file-level anchor
* **Creation**: Added concept [196](entries/196.md) (type: decision).
* **Deprecation**: Archived [002](archive/002-prefetch-writes-staletime-infinity-so.md) → superseded by [196](entries/196-prefetch-writes-staletime-infinity-so.md).
* **Refresh**: Re-verified 002 (prefetch staleTime): rule held (prefetch writes staleTime ?? Infinity, guard test green) but mechanism was wrong — SWR guard at resource.ts:221 also requires the consuming resource to configure staleTime, so the old counterfactual failed for its own no-staleTime example; cache.ts path had moved to resourceCache.ts. Authored 196 with the corrected firing condition and narrowed blast radius, superseded 002.
* **Refresh**: 003 core-shared-utils-env-kernel: re-verified against guides/code.md (quotes at :52/:110), packages/core/lib/index.ts, the five lib/internal/core.ts shims, and the isUndefined barrel drop; fixed sibling count six->five, drifted line refs, entry-001 filename
* **Creation**: Added concept [197](entries/197.md) (type: decision).
* **Deprecation**: Archived [005](archive/005-ssr-readiness-by-package-core.md) → superseded by [197](entries/197.md).
* **Refresh**: Re-verified 005 (per-package SSR readiness) against current lib/: conclusions held (core clean, css unified per 079, resource guarded, dom inert + component() server-executable, ssr built) but store is no longer grep-clean (persistStore + storage adaptors add guarded window refs), resource cache.ts renamed resourceCache.ts, and dom citations drifted (render.ts:88->177, events/queue/selectors now under internal/) — superseded by 197 with 2026-09-26 evidence
* **Refresh**: 007: re-verified JSX namespace entry against source — declare-global block still in dom barrel index.ts (now lines 34-47), Element = HellaNode & RenderFn unchanged, component.ts:14 still ComponentReturn-returning, repo-wide rg finds no other namespace JSX; corrected stale tsconfig claim (jsx is now preserve everywhere app-facing, react-jsx only in plugin tsconfigs) and drifted line citation
* **Refresh**: Entry 010 refresh: re-verified against current source that the 013 marker rework holds — MARK_OPEN/MARK_CLOSE literals (ssr walk.ts:11-12), walkChild wraps every dynamic region (ssr.ts:82), static text raw so no coalescing, hydrate adopts regions via adoptReactiveRegion/isMarkOpen/gatherRegion/consumeRegion (hydrate.ts), appendToParent mount behavior unchanged; historical section correctly banner-framed, no corrections needed
* **Refresh**: Re-verified entry 012 against current source: ssr.ts reactive-getter→isDynamic renderDynamic dispatch (ssr.ts:70-72) and hydrate adoptReactiveRegion isDynamic-resolved Proxy branch (hydrate.ts:181) both confirm the entry's RESOLVED banner; corrected the stale Evidence bullet (gotcha doc-notes were replaced by supported-path docs in both AGENTS.md files; hydration-audit plan set cleaned post-merge); bumped dates.
* **Refresh**: Re-verified entry 013 against current source: ssr.ts MARK_OPEN/MARK_CLOSE wrapping + renderDynamic; hydrate.ts marker reader (hydrateSequence/isMarkOpen/gatherRegion/consumeRegion), adoptReactiveRegion, HydrateCtx stack, mountRunBefore/mountReactiveAt absent; ForEach.ts count-strict adoption; 009 archived.
* **Refresh**: Refreshed 014 (zero-runtime scope): re-verified all claims — lib/ sweep shows zero runtime @hellajs imports (only type-only @hellajs/dom), ssr/AGENTS.md:64 quote verbatim, comparison doc still frames zero-runtime as deps+bundle footprint; fixed stale ~1.15 KB figure no longer in any ssr source; noted ssr.stream now emits first-party inline $hs swap scripts (AGENTS.md:19,53)
* **Refresh**: Entry 016 re-verified: empirically confirmed on bun 1.3.3 that unawaited expect(promise).rejects.toThrow() passes vacuously (true-positive false-pass; mismatch direction still fails); cited evidence intact in packages/ssr/tests/ssr-async.test.ts:71-72 and ssr-stream.test.ts:230 under current ssr.async/ssr.stream names; no unawaited .rejects matchers repo-wide
* **Refresh**: 018 router-ssr-library-territory: re-verified RouterConfig.url JSDoc, router.ts sync url-branch + direct updateRoute(), ssr.test.ts (now 10 scenarios), bun coverage router exit 0 (268 pass, 100% lines), routing.mdx SSR sections + site wrapper, ssr.async/stream/doc naming; dropped dead plans/router/code/router-ssr citation
* **Refresh**: Entry 019 re-verified: HappyDOM@20.14.5 live probe confirms pathname is literal 'blank' after GlobalRegistrator.register(), replaceState({}, '', '/') leaves it untouched (BrowserFrameURL.getRelativeURL falls back to about:blank when new URL('/', 'about:blank') throws), and window.location.href seeding yields '/'; router.ts init still synchronous reading window.location.pathname with config.url bypass; setupRouterEnv seeds href (helpers.ts); mockClear/log.length=0 isolation present in routing/redirects/reset-router/hooks tests
* **Refresh**: Re-verified entry 020 against packages/dom/lib/internal/hydrate.ts (consumeRegion captures next=close.nextSibling at line 93 before removeChild at 96-97, returns captured next; mismatch warning at line 311); cited test 'preserves siblings outside a ForEach region on count-mismatch' exists and hydrate-foreach.test.ts passes 13/0 after fresh bundle; _debug_next.test.ts confirmed removed
* **Refresh**: Re-verified entry 021 (ssr.stream pull-driven producer) against packages/ssr/lib/ssrStream.ts, lib/internal/walk.ts, lib/doc.ts, lib/ssr.ts, lib/index.ts, and tests/ssr-stream.test.ts: pull-only enqueue (one chunk per pull), cancel returns gen + staged swap childGens, suspense sentinel-yield→pending.push adjacency, lazy loader awaited after region-open yield, delay(0) gating in both named tests, backpressure test pinning getter calls ≤2, doc stream overload pull-driven pipe, and the 045 naming supersession — all still true
* **Creation**: Added concept [198](entries/198.md) (type: correction).
* **Deprecation**: Archived [023](archive/023-hellajs-monorepo-convention-all-cross.md) → superseded by [198](entries/198.md).
* **Correction**: Verified entry 023 against packages/*/package.json, css lib/types.d.ts+index.ts+dist, ui lib/internal/strip.ts, guides/code.md, ui/css AGENTS.md: core all-peer convention holds, but 023's 'devDeps null everywhere' and 'css sole runtime dep' are false (ui: esbuild runtime dep, clsx/tailwind-merge devDeps; rule now codified in guides/code.md) — superseded by 198.
* **Refresh**: Re-verified entry 024 (HellaNode marker properties bare words; __SLOT_N__/__fragment__ tokens kept): grep for __-prefixed markers → none; bare raw/static/componentScope/placeholder/dynamicComponent confirmed in nodes.d.ts + template.ts + render.ts + component.ts; __ tokens intact as parser string substitutions (html.ts, template.ts); no destructure of static anywhere; cited files all present. One cosmetic drift noted: mount copy now chainScopes-based (render.ts:182) vs entry's direct-assignment quote — substance unchanged, no body edit.
* **Refresh**: Entry 025 (pin typescript ~6.0.x): re-verified all tilde ~6.0.3 pins across root/plugins/examples (ssr-routing + ssr-streaming now also pinned), packages/* clean, typescript-eslint@8.70.1 peer cap >=4.8.4 <6.1.0, typescript latest=7.0.2, eslint.config.mjs projectService intact, bun lint exit 0; corrected false parenthetical (tsc is Node JS, not Go/native) and completed pin file list
* **Creation**: Added concept [199](entries/199.md) (type: correction).
* **Deprecation**: Archived [026](archive/026-examples-resolve-hellajs-via-root.md) → superseded by [199](entries/199-examples-declare-no-hellajs-deps.md).
* **Refresh**: entry 027 (router url re-resolves every call): re-verified init guard 'config.url !== undefined || !route().handler' + unconditional updateRoute() in packages/router/lib/router.ts, the SSR per-request sequential test in ssr.test.ts (exists, asserts path /users/7 then /, each handler once), and reran the suite: 10 pass / 0 fail
* **Refresh**: Re-verified entry 028: ssr walker Array.isArray branches (ssr.ts:60, internal/walk.ts:107), both JSX-shape Suspense tests present and passing (11 pass), babel buildComponentCall arrayExpression (component.mjs:20), html parser single-child unwrap (template.ts:111) — all claims hold
* **Refresh**: Re-verified 029 against source: plugins/vite/index.mjs (enforce pre, .tsx/.ts/.jsx/.js transform, no ssr-flag gate) and the examples/ssr-streaming vite.config.js ssrLoadModule middleware are unchanged and true; refreshed evidence bullets for the rewritten example (render() no-arg single Dashboard via doc()+ssr.stream, client hydrate without flush, no router); retargeted archived cross-refs 005/015 to active 197/032/033; tsc TS2307 failure diagnosed as partial install (missing @hellajs/ssr root symlink), not source drift.
* **Refresh**: Re-verified entry 030 against source: Suspense.ts fresh-mount branch (length-1 JSX-array unwrap, isFunction-suspend, .then swap, .catch dispatchError/resolveErrorConfig), stageMissing degradation, state.ts suspenseCleanup slot, cleanup.ts clean() chain, resource.ts non-Suspense-awareness, ssr.async/ssr.stream/doc naming; corrected fresh-mount test count 8→10 in evidence
* **Refresh**: Re-verified 031 against current source: dispatchError passes context.config as-is (dispatch.ts:115-116, only adds reset); resolveErrorConfig walks parentElement up (dispatch.ts:97); getBoundaryConfig peeks one element only (render.ts:52); reactive-child precedent sites now render.ts:203/218/324; ErrorContext.config optional (nodes.d.ts:58); helpers.ts fallbackHandler reads context.config?.fallback; Suspense.ts:62 catch uses resolveErrorConfig(parent); hydrate-suspense.test.ts:144 rejection-with-boundary test passes claims. Only line-number drift — corrected citations.
* **Refresh**: Entry 032 re-verified 2026-09-26 against current source: ssrStream.ts concurrent Promise.all drain + per-swap catch + done flag + pull-driven queue, hydrate.ts swapSuspenseStage getElementById(id) lookup, both named tests in ssr-stream.test.ts (48 pass / 0 fail after bun bundle ssr), ssr/AGENTS.md row + suspense bullet, examples/ssr-streaming. Fixed stale docs citation: api/ssr-stream.mdx -> api/ssr.mdx §In-Order Streaming.
* **Refresh**: Entry 033 re-verified against source: ssrStream.ts HS_SWAP_SCRIPT + one-time bootstrap only when pending.length + per-template <script>$hs('hsN') emission (lines 106/116); $hs marker-wrapper preserved; dom hydrate.ts swapSuspenseStage no-script fallback with if(!template) return existing and hydrateDynamic→consumeRegion outer-marker consumption; regression test ' swap + hydrate … no [object Promise]' at ssr-suspense.test.ts:129; header notes' targets (045 naming: ssr.stream/ssr.async members, doc export; 077 deferred-region replay in deferred.ts) all present
* **Refresh**: Re-verified 034 against current source: HS_SWAP_SCRIPT marker wrapper in packages/ssr/lib/ssrStream.ts, the cited regression test in ssr-suspense.test.ts (line 129, not.toContain [object Promise]), and hydrate-integration.test.ts full-container assertions — all accurate
* **Refresh**: Re-verified entry 035 (afterMount/descendant isMounted sync fire) against current source: processMountQueue sole writer+runner with idempotency guard intact; attach flush() now in lib/internal/handle.ts (synchronous, before mount/hydrate return); addHook immediate-fire now isConnected+isMountInFlight-aware (claim holds); deleteState anchor drifted 62→63; regression test registry.test.ts:201 present.
* **Refresh**: Re-verified entry 036 against current source: Array.isArray(resolved) sub-case live in both walkers (walk.ts walkChildGen / ssr.ts walkChild, function-child branch, before the .tag check); dom resolveNode checks Array.isArray first into a DocumentFragment; parityCase + direct assertions present (ssr.test.ts, ssr-async.test.ts); AGENTS.md §The walk records it; bun coverage ssr green (207 pass, 100% lines)
* **Refresh**: Re-verified 037 attribute/child reactivity discriminator: render.ts mountNode isFunction gate, reactive.ts bind gate, utils.ts renderProp array join, reactive.mjs maybeReactive/containsCall + double-wrap guard, all !isComponent application sites (children.mjs, attributes.mjs props/__slot/Array.isArray, ast.mjs __slot children), html.ts raw-value interpolation, docs claims (babel AGENTS.md:143, templates.mdx:109, dom-comparison.md:82 — line anchors drifted from :35/:79, substance intact); bun test plugins/babel 246 pass
* **Refresh**: 038 re-verified against current tree: bun -e live check reproduces the exact parse failure (examples/*/tutorial.mdx in JSDoc -> Expected ";" but found "file"); premise rules exist (guides/scripts.md:74 JSDoc-on-every-function, jsdoc-params guard); scripts/doc-links.ts:117 collectScanFiles present; current guard-script docstrings use prose globs, zero dir/*/file occurrences
* **Creation**: Added concept [200](entries/200.md) (type: correction).
* **Deprecation**: Archived [039](archive/039-test-core-graph-retention-weakref.md) → superseded by [200](entries/200.md).
* **Refresh**: Entry 039 re-verified against source: its removeLink bug evidence was invalidated by same-day fix 67d7851c (GC branch now drains all deps, cascading); technique (canary in return value, ≥2 GC passes, sources alive) preserved in corrected entry 200; current computed.test.ts multi-dep auto-GC tests assert collection
* **Refresh**: Re-verified entry 040: comparison SKILL.md Step 3 still says 'WebFetch' with no tarball fallback documented (line 31); AGENTS.md still notes workers lack web access (line 133); live registry check confirmed /latest metadata + dist.tarball URLs and scoped-package URL-encoding (@vue%2Freactivity → reactivity-3.5.43.tgz)
* **Refresh**: Entry 041 (hand-rolled isDynamic test component as <${Dyn}> must be a props-callable factory): re-verified every claim against current source — cloneWithValues dynamicComponent branch props-call (template.ts:112-115), dynamicComponent marker compile shape (template.ts:25,317), appendToParent child(parent) invoke (render.ts:252+), hydrate-mismatch.test.ts:119 factory shape, reactive-dynamic-children.test.ts:20-27 bare-fn reactive-child sibling
* **Refresh**: 042: re-verified two-microtask-hop claim empirically (bun -e one-liner), guides/tests.md double-delay ban + delay(0) sanction, and the cited hydrate-mismatch test (uses delay(0), not delay(50) as previously cited; 16/0 green); fixed stale evidence citation + aligned sanctioned-alternative phrasing with the guide
* **Refresh**: Entry 043: re-verified against packages/dom/lib/internal/hydrate.ts — hydrateDynamic still uses the hoisted 'let swappedStage' above the switch (line 494) with all cases unbraced; no braced-case-with-const remains. Istanbul-artifact behavior not re-demonstrated (would require re-introducing a braced case); structural decision confirmed accurate.
* **Refresh**: Re-verified entry 044 against current source: packages/ssr/lib/doc.ts streaming overload still acquires options.body.getReader() up front (line 121), drains via manual reader.read() pulls (no for-await over any ReadableStream in ssr lib — remaining for-await sites iterate generators only), and cancel(reason) returns reader.cancel(reason); the cited test lives at tests/doc.test.ts:197 (renamed from doc-stream.test.ts, covered by the entry's existing 045 naming banner) and still asserts the reason reaches the body's cancel mock via stream.getReader().cancel('gone'); tests/helpers.ts collect() and dom/tests/helpers.ts still use the same read-loop idiom.
* **Refresh**: Re-verified 045 (ssr v2 API consolidation) against source: ssrAsync/ssrStream/docStream deletions, no aliases, SsrFn namespace, doc overload pair, parseMount single-caller, DocOptions.body union, barrel, @internal member impls, error messages, nav, doc-links skips all still true. Evidence refreshed: ssr now attaches head: ssrHead (post-consolidation addition, noted in entry); docs pages moved to docs/api/.
* **Refresh**: 046: re-verified against current tree — ssr doc overloads (DocOptions & { body: string } / & { body: ReadableStream<string> }) and the body-required throw unchanged at packages/ssr/lib/doc.ts; doc.test.ts:124 uses the concrete-cast form {} as DocOptions & { body: string }; scoped run green (48 pass).
* **Refresh**: Re-verified entry 047: delegatedHandler still breaks composedPath walk on event.cancelBubble (packages/dom/lib/internal/events.ts:51); stop-immediate delegated test still calls both stop methods with the why-comment (delegated-events.test.ts:154-157); empirical HappyDOM check re-run today — stopImmediatePropagation() leaves cancelBubble false, stopPropagation() sets it true.
* **Refresh**: Re-verified entry 048 against current source: all 8 packages/*/package.json declare main ./dist/index.js; root .gitignore line 6 ignores dist under '# output' (git check-ignore confirms); examples/bench rollup config emits dist/main.js via node-resolve over root node_modules/@hellajs symlinks (bench imports only core+dom, both linked); scripts/bundle.ts no-package-arg mode routes to buildAllPackagesFromOrder in dependency order. Note: body's pointer to memory 026 is now an archived concept superseded by 199, which narrowed root walk-up to core/css/dom/resource/router — 048's stale-dist mechanism unaffected.
* **Refresh**: 049: re-verified all claims against current tree — happy-dom 20.14.5 lockfile + commit 4366d850; live repros under utils/happydom.js (double-brace silent-empty @font-face, @layer/@starting-style SyntaxError, cssText 0→0px / from→0% / quote-drop, label:x drop); getStylesheet squeeze, css-at-rules dual pins, style-compose cssText() label pin, css AGENTS.md §Testing caveats, guides/tests.md exact-form rule all present. Noted: colon-space/rgba collapse originates in the squeeze, not raw cssText — entry's empirical-mappings guidance already covers it; no body edit needed.
* **Refresh**: Refresh 050: re-verified split-graph claim against current tree — store dist/bundle.js keeps @hellajs/core external (→ packages/core/dist via symlink + exports map); empirical repro under current store API ($update + flush, old update/when commands no longer run): split world (core source) 1 run silent false negative, unified (core dist) 2 runs; fixed stale (see 035) miscite (035 is dom mount flush, not scheduler flush) and added current-API evidence.
* **Refresh**: Re-verified entry 051 against current source: core signal() is a bare unmarked closure (packages/core/lib/signal.ts); create.ts holds module-level settableRegistry Symbol attached non-enumerably via Object.defineProperty (lines 20/330); composition threads sourceSettable registry for function keys (line 101); $update writes only via settableKeys.has(key) branch (line 215); $snapshot discriminator is exactly isFunction(originalValue) && !settableKeys.has(key) (line 63); nested.test.ts:92 still covers composed-update propagation
* **Refresh**: Re-verified 052 against source: cleanAbort (resource.ts:154) still unconditionally aborts the predecessor on every assignment; all three read-path sites unchanged (dedup joiner :242, request phase :267, abort() :322-326); mutate still owns per-call controllers in mutationControllers never routing through cleanAbort; wireRequestControls/release in lib/internal/abort.ts unchanged; listener-net-zero tests present at tests/fetching.test.ts:319 and tests/prefetch.test.ts:134
* **Refresh**: 053 refresh: re-verified doc-snippets one-module model (emitModules: splitImports + mergeImports doc-level union, nested block scopes in async __doc), router.mdx widened Basic Usage import { router, route, navigate }, doc-snippets absent from lint:guards; updated stale evidence path route-hooks.mdx -> now folded into concepts/routing.mdx
* **Refresh**: Re-verified 054: nav.ts reference order still mirrors all 7 packages/*/docs/index.mdx API lists (dom prefix-first, low-level tier above behaviors, css resets last); reference/index.mdx imports @pkg/index.mdx in core,dom,css,store,router,resource,ssr order; Concepts/Patterns Styling-before-State holds in nav.ts + learn/index.mdx + patterns cards; doc-structure check 5 membership-only Sets
* **Refresh**: Re-verified 055 (docs-site @source lines): global.css still carries both @source globs verbatim; astro.config.mjs still aliases package docs + @examples outside the Vite root; tailwind ^4.1.18 / daisyui ^5.5.14 unchanged; oxide probe re-run — recursive tail matches alert-soft, directory tail matches 0.
* **Refresh**: Re-verified 056 (empirical package probes via cd packages/<pkg> && bun -e) live on Bun 1.3.3: failing form (cwd /tmp) -> Cannot find module '@hellajs/dom/bundle'; working form (cd packages/dom && bun -e, dynamic await import) -> resolves; root node_modules/@hellajs/dom symlink intact. Fixed stale body pointer: archived memory 026 -> active successor 199
* **Refresh**: Re-verified 058 against source+tests: rebaseIndexes/removeRule/upsertRule shifted-guard all confirmed in packages/css/lib/internal/sheet.ts; fixed stale Evidence citations (cssvars-remove.test.ts → vars-remove.test.ts, test attributions, removed plan-file pointer) and bumped timestamps
* **Refresh**: Re-verified 059 dirty-worktree baseline: coverage internals (scripts/coverage.ts runs bundle.ts --quiet + bun test packages/<pkg>/tests --coverage), no-stale-dist rule (AGENTS.md L159), 7-entry HEAD claim corroborated via git show 4366d850:packages/ui/registry/registry.json, sheet.ts present; cited plan file removed in 9c27286f (artifact cleanup, decision unaffected)
* **Refresh**: Re-verified entry 060 against current source: tagMatches exact-case/HTML-fold behavior (hydrate.ts:268), all three call sites (hydrateNode static fast-path 295, mismatch check 316, adoptReactiveRegion pairing 209 — entry's 'both call sites' citation corrected to three), childNamespaceOf/foreignObject/HTML_NS in render.ts, ns consumed only at creation (render.ts:177) with child re-derivation (render.ts:261), AGENTS.md §mountNode/appendToParent documentation, and svg.test.ts 9/9 pass after fresh dom bundle (0 warnings in hydrate test via suppressWarn; MathML asserts namespaceURI, SVGSVGElement/SVGClipPathElement constructors asserted).
* **Refresh**: 062 torn-git-index: re-verified nested-commit claim (scripts/release.ts:161-164 commit --no-verify, scripts/AGENTS.md:17), hook-removal fact (.git/hooks has only commit-msg, core.hooksPath unset), and mechanism claims; replaced dead plans/root/config/remove-llm-mirror-sync.md citation with direct source verification
* **Refresh**: Re-verified 063 against packages/resource/dist: bundle.js still inlines lib (23 cacheMap hits, exports only resetResource/resource/resourceCache), subpath copies separate (resourceCache.js 22 hits), index.js re-exports ./resource.js etc.; refreshed drifted citations (dead @hellajs/resource/cache subpath, dist/cache.js, plan file) to current resourceCache.js naming
* **Refresh**: Re-verified 064: canonical shape of packages/resource/tests/cache-scope-gc.test.ts (block-scope drop + delay(0) + Bun.gc(true)x3, module-state assertions) matches entry; test passes 3/3 on fresh resource bundle; diagnosis plan absence confirmed as plan-lifecycle, not drift
* **Refresh**: 065: re-verified onlineStatus/resetCacheState behavior against resource lib (cache.ts -> resourceCache.ts rename fixed in citations); offline-pausing.test.ts pattern and utils/test-helpers.js resetTestState confirmed unchanged
* **Refresh**: Entry 066: re-verified route().path carries pathname+search at every producer (router.ts init url/history/hash branches, resolve.ts commitMatch + notFound write), consumers strip it (route.ts activeFn, crumbs pathWithoutQuery), and both cited test assertions still expect the ?suffix; corrected stale Why/Evidence prose (docs now state the shape in routing.mdx global-hooks; router.ts lines now wrap in stripBase which preserves the query)
* **Refresh**: Re-verified entry 067 (bound template-literal token extraction): packages/router/lib/types.d.ts still implements ExtractParams as PatternSegments/SegmentParams per-segment recursion, and a tsc probe on /users/:id/:name? confirmed bounded extraction with optional name preserved and required id enforced
* **Refresh**: Refreshed 068-happydom-history-apis-never-move: reproduced the pushState/replaceState pathname no-op on about:blank empirically (happy-dom 20.14.5), confirmed router.ts:57 init reads location.pathname, scroll.ts:50 from===to early return, scroll.test.ts pattern; updated evidence citation to tests/helpers.ts setupRouterEnv (guards.test.ts line cite rotted)
* **Creation**: Added concept [201](entries/201.md) (type: correction).
* **Deprecation**: Archived [069](archive/069-bun-s-coverage-table-renders.md) → superseded by [201](entries/201.md).
* **Correction**: Re-verified 069: lcov workflow + stale root lcov still true; 'permanent replaceMismatch decl-line zero' falsified (DA:1092,37 fresh). Authored correction 201, superseded 069.
* **Refresh**: Entry 070 re-verified: delay() implementation in utils/test-helpers.js matches all four variant claims (one microtask hop max; delay(0) macrotask); guides/tests.md lines 71/184-185/306 confirm one-hop insufficiency, banned double-delay, delay(0) sanction; cited entries 021/042/064 active; guide no longer uses imprecise 'flush the microtask queue' phrasing
* **Refresh**: 071: re-verified html`` union (dom/html.ts:15), plain-HellaNode SsrFn params (ssr.ts:124/138/161), hydrate widening (hydrate.ts:25-26), both cited test sites cast; fixed drifted ComponentReturn citation nodes.d.ts:134→140
* **Refresh**: Refreshed 072: re-verified every claim against current source — resource.ts creation effect still gates run(false) on refetchOnKeyChange, run() still has no initialData guard, isLoading/status semantics unchanged, all doc quotes present (updated drifted resource.mdx line cites 429→370, 136→132)
* **Refresh**: Re-verified 073 (core guard predicate narrowing): isFunction predicate unchanged at core/lib/internal/utils.ts:6; cast-escape idiom intact but resource files moved (cache.ts→resourceCache.ts:186, retry/polling→internal/, casts at 32/35, 57/75, resource.ts:431); 'handler' in handler escape at dom events.ts:88; guides/code.md §Type guards now carries the rule verbatim; ssr still exempt from eslint typeof ban
* **Refresh**: Refreshed 074 (typeof-site discovery): re-verified eslint no-restricted-syntax selector at eslint.config.mjs:85 matches the entry verbatim; live Linter probe confirms the selector bans member/bracket typeof comparisons while passing switch(typeof) and factored discriminant forms; template.ts:280 factored form intact (cited :249 drifted, substance unchanged); mechanical regex test confirms cast operands invisible to typeof\s+\w+ and anchored \w+ greps miss all member/cast forms.
* **Refresh**: Refreshed 075 (happy-dom MutationObserver WeakRef GC hazard): re-verified core mechanism against happy-dom@20.14.5 (WeakRef-held listenerCallback in MutationObserverListener.js; synchronous deref-splice via Node.js reportMutation from remove()->removeChild) and dom source (queue.ts observer->queueMicrotask(processCleanupQueue); cleanup.ts clean(); render.ts state creation); fixed drifted body claim — ref.test.ts auto-clean now uses the peekState poll, no delay(10) removal-waits remain; noted component.test.ts restructure; added happy-dom version pin to Why risk surface
* **Refresh**: Re-verified entry 076: measured env readyState 'interactive' via utils/happydom.js preload; confirmed hydrate.ts defer gate '=== "loading"' (now :512, entry cites :651 — line drift only); confirmed withReadyState defineProperty/deleteProperty shadow + manual readystatechange dispatch and the unshadowed back-compat test in hydrate-selective.test.ts. Plan file plans/dom/code/behavior-gaps/04-selective-hydration.md no longer exists (uncommitted artifact) — evidence pointer rotted, substance independently confirmed.
* **Refresh**: Entry 077 selective-hydration: re-verified every mechanism claim against source — all semantics hold (defer gate readyState==='loading' at internal/hydrate.ts:512, registries, REPLAY_EVENT_TYPES, watch/buffer/recheck/drain, positional replay, reset path, wiring, tests, docs, 033 notes); refreshed stale evidence citations after the mechanism was extracted from internal/hydrate.ts into internal/deferred.ts
* **Refresh**: Re-verified 078 (doc-snippets strict tier widening): read scripts/doc-snippets.ts (nested per-doc block scoping in emitModules, strict tier exit 0/1, paths map @hellajs/* to lib sources), packages/css/lib/types.d.ts CVAPropValue narrow unions, core signal.ts generic inference, cited css docs (cva.mdx:159 annotated generic, styling.mdx:28 inlined literal, cx.mdx self-contained recipe), 053 cross-ref; live 'bun doc-snippets' exit 0, 0 strict findings.
* **Refresh**: 079 css-v3-unified-platform-independent: re-verified every claim against source/tests/docs on 2026-09-26 — core v3 model (unified registration, identical returns, both-platform removers, canonicalized keyframes, cssText() collector, clean alias break) all true; synced drift from post-entry commits e6609fc5 (statement hoisting in cssText) and 2ce80e33 (layer in VarsBucket/bucket key/varsText/differing-options throw); replaced dead plan-file citations with commit cites; gate re-run green (coverage css 240 pass, lint:structure, doc-links)
* **Refresh**: Re-verified 080 against current tree: hoist filter /^(declare|export) /m (scripts/doc-snippets.ts:330), Complete-Code byte parity (doc-structure.ts:20-24), strict-only exit gating (doc-snippets.ts:527-532), and a live doc-snippets run reproducing the TS2451-redeclare class (blog) and counter TS2552/TS2304 marker-block set
* **Refresh**: 081 refresh: re-verified silent class-array shadowing against source — client branch is renderProp in packages/dom/lib/internal/utils.ts (Array.isArray join), not render.ts:95; ssr serialize.ts:72 comment unchanged; class accepts arrays per attributes.d.ts:87; Tags.tsx fix pattern intact. Corrected stale file citation, bumped timestamps.
* **Refresh**: Re-verified entry 082 against current source: endTracking while-loop (tracking.ts), SIGNAL_DEPS DIRTY-direct fast path (propagateChange scheduler.ts:80, executeEffect short-circuit :199-209, createLink new-link-only clear links.ts:66), flag values 8/64/256, COMPUTED type-bit dispatch + WRITABLE|COMPUTED|DIRTY auto-GC, no startTracking, EFFECT_DEP gated walk, flush beside queue state, signal getter returns sbc local with arguments.length arity check, canceling-batch test (batch.test.ts:28). All claims held; fixed evidence citations for consolidated files (propagation.ts/queue.ts → scheduler.ts, signal.ts → lib root) and bumped timestamp.
* **Refresh**: Re-verified 083 (verification-reads-can-race-edit): race-possibility claim uncontradicted; 3 immediate wc/rg/read probes after edit-tool flushes all returned current state (non-reproduction consistent with a rare race); rule still sound. Original evidence files (brain-author/SKILL.md, local-brain-skills) confirmed gone from tree — historical citations only. Bumped last_confirmed 2026-09-05 -> 2026-09-26, body unchanged.
* **Refresh**: 084 computed-rethrow/effect-first-run-dispose: re-verified executeComputed catch re-marks DIRTY before rethrow (execution.ts:41-45) and effect.ts first-run catch disposes before context restore (effect.ts:63-71); tests verbatim and green on fresh bundle (27 pass). Replaced dead plans/core/code/audit-findings citations with rationale comments in source.
* **Refresh**: 085 re-verified against source: injection.ts registerText sets full-text key after brace-aware split (injectedMap.set line 92), cssText.ts joins injectedMap keys verbatim, css/AGENTS.md §Files cssText.ts row resolves, tests/helpers.ts getCssSheet + css.test.ts brace-safety tests anchor split on sheet.cssRules.length
* **Refresh**: Re-verified memory 086 against scripts/doc-snippets.ts: per-run mkdtemp scratch (run-<pid>-<suffix>), dead-run pruneStaleRuns with live-pid probe, no shared-dir wipe, resolveDiagnosticFile strips run segment for byte-comparable output — all claims still hold at 544-line current source.
* **Refresh**: Re-verified entry 088: unquoted YAML description colon-space failure reproduced (yaml ScannerError, exit 1); guides/docs.md §Typography colon branch and frontmatter-description ban scope confirmed (lines 708/713); current wrapper descriptions contain no unquoted colon-space values; em-dash-eradication plan dir removal is anticipated by the entry's own 'later guides/docs.md' phrasing
* **Refresh**: Re-verified 089 against scripts/doc-structure.ts (COMPLETE_CODE_RE:71, checkTutorialParity:261 fallback via completeCodeSection/stripBreadcrumb/blockMatchesFile, vite-env.d.ts exclusion, SECTION_END_RE:^## ), guides/docs.md:281 single-file one-block rule, lint:structure wiring in package.json, archive/087.md retirement, and a live bun lint:structure run (clean, 271 mdx, 6 checks) — entry accurate
* **Refresh**: Re-verified entry 090 (phrase scan globs as prose): collectScanFiles JSDoc in scripts/doc-links.ts and scripts/em-dash.ts still prose-only, guides/scripts.md §Functions & modules citation intact, no */ in any scripts/ JSDoc (glob literals only in code strings)
* **Refresh**: Re-verified entry 091 (compiled html mixed-attribute `+` concatenation / clone-time concatParts parity) against current source: parsers/attributes.mjs parts array, processors/attributes.mjs Array.isArray route, builders/ast.mjs binaryExpression(+), dom template.ts parseAttrValue/concatParts/markIfStatic, renderProp join branch, html.test.ts exact assertions (25 pass), and a fresh transformJSX probe reproducing `class: "btn " + x`.
* **Refresh**: Entry 092 re-verified: hydrate.ts:15 JSDoc 'Pass the SAME node' contract, cloneWithValues→component() call-time evaluation (template.ts:116), and the hoisted-single-view test all hold; fixed stale evidence citation component.test.ts → component-scope-hydrate.test.ts
* **Refresh**: Re-verified entry 093 against current source: tsconfig.lint.json include allow-list, package.json lint script, eslint.config.mjs .agents/** ignore all still hold; include array grew 10 -> 14 entries (fixed count, noted feedback/scripts/scan.ts also enumerated)
* **Refresh**: 094 refresh: re-verified mount/hydrate attach order (attachImpl→attached→flush→afterFlush watch→endMountPhase) against internal/handle.ts, lib/hydrate.ts, lib/mount.ts, internal/queue.ts; fixed drifted file citation — deferred-region watch fns now in internal/deferred.ts, not internal/hydrate.ts; confirmed root-array unmount model and sole flush/unmount ownership
* **Refresh**: Entry 095 re-verified 2026-09-26: setMountNode/setDeferredAdopters registration patterns, the import type back-edge, cited files/comments, cited test suites, and a re-run runtime-cycle detector over packages/dom/lib (value cycles NONE; type-only edges the only cycles) all match current source.
* **Refresh**: Re-verified entry 096 (scope-death test double-write) against current source: sync first run in packages/core/lib/effect.ts effect(); body-inside-scope before mount in packages/dom/lib/component.ts; appendToParent reactive branch + clearRenderedNodes→cleanupSubtree→clean()→componentScope disposal in packages/dom/lib/internal/render.ts + cleanup.ts; registration-order subscriber walk in core scheduler; double-write test at packages/dom/tests/component-scope.test.ts:369 green (16 pass / 0 fail)
* **Refresh**: Re-verified entry 097 against current source: relay mechanism unchanged but moved — scripts/plans.ts and scripts/plans/relay.ts are gone; TerminalRelay now lives at scripts/agent/relay.ts under the runner family (worker/merge/audits/memory) with driver.ts routing dialogs and askOrchestrator gates through the same stdin relay; handleLine routing, non-newline-terminated '→ ' prompt, and the pre-piped-stdin hang all confirmed; refreshed body citations (feeder.mjs, dropped stale skill-automation 02 pointer) and bumped last_confirmed to 2026-09-26
* **Refresh**: Re-verified 098: isTicked marker-anywhere-behind-frontmatter still true at scripts/worker/set.ts (path moved from scripts/plans/set.ts); real units carry frontmatter before the marker; Step 0 depends_on gate intact. Evidence citations updated for deleted artifacts (plans-runner fixture, audit-fixes set).
* **Refresh**: Re-verified entry 099 against current source: worktree.mjs mechanics all confirmed (BASE_DEFAULT v2; carries = plan-set folder cpSync + tracked memory patch + untracked memory copies; baseline add -A/write-tree/commit-tree no ref moved; commit resets soft to baseline and excludes carried plan folder; merge skill cherry-picks per task with ticks unstaged agent-side), 061 archived, memory/ tracked, .plans-runner/ gitignored. Body premise qualified: plan-set folders untracked, plans/notes.md a tracked exception outside the carry path; cited spec plans/root/... gone (untracked set folder, deleted) — provenance only.
* **Refresh**: Re-verified entry 100 against packages/store/lib/types.d.ts: PartialDeep/StoreMiddleware/StoreEquals/SettableKeyOf/Store still branch on bare T[K] extends guards with no undefined distribution; $update still returns Store<Simplify<T & Omit<P, keyof T>>, R> with $-prefixed methods and unknown-key materialization. Fixed dead plans/store/code/store-audit/07-future-keys.md citation (plans/ cleaned) in body.
* **Refresh**: Re-verified entry 101 against bun-types@1.4.2 test.d.ts (toEqual/toBe NoInfer overloads at lines 983-984/1036-1037) and packages/store/tests (fix patterns in future.test.ts:20/28/40/71/96; reserved-key throws without directives in reserved.test.ts:37/45)
* **Refresh**: Entry 102: re-verified Store function-row typing against current source — types.d.ts Store mapped type first row (T[K] extends (...args: unknown[]) => unknown ? T[K]), empirical tsc check (param-taking fn -> TS2345 Signal setter error; zero-param fn -> clean), materializeKey in lib/internal/create.ts preserves all functions via isFunction, zero-param precedents in functions.test.ts and snapshot.test.ts
* **Refresh**: Entry 103 re-verified 2026-09-26: headingSlug regex [^\w -] intact in scripts/doc-structure.ts (guard Check 3 present); Astro default github-slugger empirically slugs $snapshot -> snapshot and $update() -> update (docs/bun.lock, no custom slug config); store.mdx headings $-prefixed with stripped #snapshot/#update fragments
* **Creation**: Added concept [202](entries/202.md) (type: correction).
* **Deprecation**: Archived [104](archive/104-composed-store-leaves-type-as.md) → superseded by [202](entries/202.md).
* **Refresh**: Verified 104 against current source: composed leaf still types Store<Store<…>> with Signal members and the leaf assignment still needs @ts-expect-error, but $update through the wrapper typechecks clean (repo tsc green over undirected call sites; type probe showed the adopted store's plain-shaped overloads resolve first). Authored correction 202 and superseded 104.
* **Refresh**: Re-verified entry 105 (build-all-once-in-fresh-worktree) against current source: worktree.mjs seeds clean cut + bun install with no bundle step; packages/core exports map and .gitignore route @hellajs/* resolution through gitignored dist/; scripts/bundle.ts scoped arg builds only the named package via buildPackageEntry while the argless path runs buildAllPackagesFromOrder; declarations.ts tsc --emitDeclarationOnly pass is where TS2307 surfaces. All claims hold.
* **Creation**: Added concept [203](entries/203.md) (type: decision).
* **Deprecation**: Archived [106](archive/106-pre-declared-optional-store-keys.md) → superseded by [203](entries/203.md).
* **Refresh**: Entry 107 refresh: re-verified nearest-dynamic-closer rule against both parsers (plugins/babel/src/parsers/html.mjs:89-96 slot-pattern openTag test; packages/dom/lib/internal/template.ts:288-296 'dynamicComponent' in open), probe-replicated both interleavings (Evidence slots 0-5 correct; fixed Why example </__SLOT_2__> -> </__SLOT_1__>, minimal closer is slot 1), confirmed portal.test.ts 'multiple portals' + hydrate-selective.test.ts exist.
* **Refresh**: Re-verified entry 108 against current source: parity.test.ts canonical() projection (4 normalizations, 10-entry corpus), markIfStatic (template.ts:371), hoistStaticSubtrees (static.mjs:187), buildHellaNode empty-field omission + all-StringLiteral join (builders/vnode.mjs:54), root-text $ wrap (template.ts:282, pinned by html.test.ts:169), live compiled/runtime probes for joined children + root text; suite green 246/0 (was 256/0 — count updated in Evidence).
* **Refresh**: Entry 109 (babel generator retains input quotes): re-verified via live probe via plugins/babel/index.mjs — double-quoted input emits from "@hellajs/dom", single-quoted emits from '@hellajs/dom', same injected specifier; transform.test.ts exact-form asserts mirror input quotes (233-268) and JSX-only tests expect generated double quotes; helpers.ts getNamedImports regex quote-agnostic; suite 246 pass / 0 fail
* **Creation**: Added concept [204](entries/204.md) (type: correction).
* **Deprecation**: Archived [110](archive/110-two-babel-types-type-instances.md) → superseded by [204](entries/204.md).
* **Refresh**: Verified entry 110 against the current tree: its two-instance version-skew mechanism is obsolete (bun.lock pins a single @babel/types@7.29.8; the isolated linker symlinks @types/babel__generator's nested dep to the same store entry), but its prescription still holds — a tsc probe reproduced TS2741/TS2345 for a direct @babel/types default import vs the @babel/core namespace type. Authored correction 204 and superseded 110.
* **Refresh**: Entry 111 re-verified: worker SKILL.md:47 baseline-red stop rule, guides/tests.md:274-276 foreign-failure triage (outside target package), worker SKILL.md:39 re-entry/unticked-ticks mechanics all still match; own-unit unticked case still uncovered by config
* **Refresh**: Entry 112 (signal collections decision): re-verified against current source — signalArray/signalMap/signalSet shipped in packages/core/lib with raw elements + wrap/merge hooks; store consumes them (deep.ts, installCollection via materializeKey create.ts:124, closing the pre-build gap); ForEach still one whole-array effect; ForEachProps.each callable hybrid unchanged; foreach.mdx footgun scoped to plain signal; core-comparison.md carries the honest-position constraint; fixed dead plans/core/code/signal-collections pointer
* **Refresh**: Re-verified 113 against current source: hoist filter at line 330, checkJs:false, LANGS_TS includes jsx; live bun doc-snippets run confirms exit 0 / strict clean, astro-islands 12 findings (6 TS2323+TS2393 sites) verbatim; corrected stale evidence (blog 34->37, counter/todo/ssr-streaming finding classes now TS2552/TS2304, TS1xxx, TS2451; added theme-switcher) and narrowed the always-TS2323/TS2393 claim; decision (scope tutorial DoDs to strict tier or probed class) unchanged
* **Creation**: Added concept [205](entries/205.md) (type: decision).
* **Deprecation**: Archived [115](archive/115-package-agents-md-files-already.md) → superseded by [205](entries/205-package-agents-md-files-already.md).
* **Refresh**: Re-verified entry 116 against current source: packages/core/lib/signalSet.ts reconcile pre-wraps the incoming diff (both add and delete passes compare wrapped); packages/store/lib/internal/deep.ts middleware wrapper captures const raw = container before reassignment; both cited tests exist and pass (32/32 across signalSet.test.ts + collections.test.ts after bun bundle core store).
* **Refresh**: Entry 117 (bun audit builtin shadows scripts): re-verified all claims against current tree — bun 1.3.3 still lists 'audit' as builtin subcommand and live 'bun audit' in repo root printed the builtin banner (vulnerability scan), scripts/audits.ts exists, package.json wires 'audits' with no 'audit' script, AGENTS.md §Scripts row documents 'bun audits <pkg>'.
* **Refresh**: Entry 118 (tsc type-probes): re-verified every claim against source — dom exports (./, ./bundle, ./*, no jsx-runtime), JSX namespace block (index.ts, ElementChildrenAttribute children:{}), TS ~6.0.3 pin; reproduced empirically TS5112 (no --ignoreConfig), TS2875 (react-jsx), and exit-0 preserve probe incl. signal/fn/null children; added verified caveat that the probe file must import from @hellajs/dom or TS7026
* **Refresh**: Entry 119 re-verified: CHILDREN_UNKNOWN_RE (scripts/doc-structure.ts:83) still uses the single-escape /children\??:\s*unknown/ form; live bun eval confirmed the trap semantics (double-escape \?\? misses 'children?: unknown', escape+quantifier and new RegExp string form match); plan-skill trap #5 still owns the probe-the-match-set discipline the entry's seeded probe instantiates
* **Refresh**: Re-verified entry 120 against current source: parityCases/attributeCases/headParityCases exports in ssr/tests/helpers.ts, walker-vs-walker toBe shapes in ssr-async/ssr-stream matrices, lib/ssr.ts walkChild parity-invariant comment, exact-output sync asserts in ssr.test.ts — all claims still hold
* **Refresh**: Re-verified entry 121 against current tree: prose-prefixed ⚠️ callouts still exactly two (resource/docs/concepts/resources.mdx:99, ssr/docs/concepts/ssr.mdx:71); guides/docs.md still has no rule for the prose form (§Alert Boxes governs role=alert boxes, §Good/Bad Patterns ⚠️ is in-code only, Concept Docs template still 'One-line description of the concept' at line 124); cited concept intros unchanged (store 3-sentence+2-links, css 2-sentence multi-clause, dom 1-sentence); all four guards (em-dash, doc-links, lint:structure, doc-snippets) exit 0 with both forms present.
* **Refresh**: entry 122 (bun -e stdin hang): re-verified all three claims empirically under bun 1.3.3 (stream+held pipe hangs/timeout; process.stdin.once+exit(0) exits 0 echoing the line; EOF parent exits fine) and source-side (probe.ts:248 working form asserting exited code 0; rpc.ts:108, runs.ts:83 stdin:pipe supervisors) — bumped last_confirmed
* **Creation**: Added concept [206](entries/206.md) (type: correction).
* **Deprecation**: Archived [123](archive/123-relay-surface-changes-touch-five.md) → superseded by [206](entries/206-relay-surface-changes-compile-against.md).
* **Creation**: Added concept [207](entries/207.md) (type: correction).
* **Deprecation**: Archived [124](archive/124-fresh-worktree-builds-need-bun.md) → superseded by [207](entries/207-root-lock-churn-hazard-dead.md).
* **Refresh**: Entry 125 (core input-validation @throws on factory JSDoc only, zero in core .d.ts; store 2 / resource 1+5 on interface methods; AGENTS.md six-message contract): re-verified all counts and placements against current source via rg — still accurate.
* **Refresh**: Entry 126 (accept small docs length-target overages via operator amendment): re-verified against current source — guides/docs.md §Length Targets intact (728) with range→judgment→flag-line structure; plan SKILL.md:79 sanctions explicit DoD relaxation when unsatisfiable; worker consistency gate routes untickable DoDs back to plan, never forced; cited 40-70 index-docs target confirmed accurate at write time via git history (7f4dfdcf 2026-06-12 → recalibrated 40-100/150 by b049afc8 2026-09-15, after entry date); cited plan set ephemeral as expected
* **Refresh**: entry 127 (doc-snippets resets .doc-snippets/): re-verified against scripts/doc-snippets.ts (pruneStaleRuns rmSyncs stray files/dead-run dirs at run start, emits into run-<pid> scratch), .gitignore:8, and AGENTS.md:68 script-table wording
* **Refresh**: Entry 128: re-verified Chrome-only CSSOM stub-probe contract against current source (core/internal/env.ts hasDocument, css/internal/sheet.ts upsertRule/shiftIndexesUp/removeRule) and live probes — happy-dom 20.14.5 still rejects @import/@charset inserts; real-bundle stub flow still yields [statement|body{margin:0px}] with correct rebase on removeCss
* **Refresh**: Re-verified 129-plan-tick-python-fallback: edit tool still exact-match oldText, worker skill still ticks plan DoD boxes inline ([ ] -> [x] via file edit), checkbox plan format unchanged, python3 available, no duplicate active entry; cited plan set plans/css/audit/docs is merged/gone but evidence cites it as past session, not extant file.
* **Refresh**: Re-verified entry 130 against scripts/doc-snippets.ts: EXTERNAL_IMPORT_RE regex (L81), extractBlocks whole-block skip on relative specifiers (L221), doc-wide splitImports/mergeImports union with nested scoping (L318-327), checked-N-docs-M-blocks summary (L524-526), strict-tier exit gating (L528-533) — all claims hold
* **Refresh**: Entry 131 (doc JSX examples cannot run verbatim under bun): re-verified empirically — .tsx probe and bun -e with JSX still fail with 'Cannot find module react/jsx-dev-runtime' (Bun v1.3.3, exit 1) and the lib-import/style()/cssText() harness recipe still exits 0; corrected the stale mechanism (root tsconfig is now jsx:preserve, not react-jsx — the injection is bun's default dev-runtime transform, not tsconfig-driven)
* **Creation**: Added concept [208](entries/208.md) (type: correction).
* **Deprecation**: Archived [132](archive/132-declarations-only-css-silent-no.md) → superseded by [208](entries/208.md).
* **Correction**: Verified entry 132 against current source: css() no longer silently no-ops on declarations-only input — it throws '[css] top-level declarations have no selector' (css.ts throw guards, css.test.ts:181-189, ssr.test.ts:64-66; empirical bun -e repro). Authored correction 208-css-rejects-declarations-only-input and superseded 132.
* **Refresh**: Entry 133 (docs-trim-gap-prefer-formatting): re-verified all cited evidence — scripts/doc-structure.ts:89 INLINE_CSS_OBJECT_RE still matches only css()/style(), guides/docs.md §Code Examples multiline rule still binds css()/style() only, plan SKILL.md Phase 3 trap 7 (threshold/lever arithmetic) present, css index.mdx still carries the one-line vars() resolution. Bumped last_confirmed to 2026-09-26.
* **Refresh**: Entry 134 re-verified: INLINE_CSS_OBJECT_RE still at scripts/doc-structure.ts:89 scoped to css()/style() only; guides/docs.md:504 rule 'Multiline css()/style() calls' names only those two call forms; packages/css/docs/index.mdx:25 single-line vars() example unchanged; bun lint:structure exit 0.
* **Refresh**: Entry 135 (GC canaries over signal-held values): re-verified all claims against current source — signal.ts setter writes sbc+DIRTY and propagates only if(rs); sbv has exactly one write site (execution.ts:17 executeSignal, getter path); canonical test reactive-dynamic-children.test.ts:198 retains clear-while-mounted shape; fresh core+dom bundles, 12/12 pass. last_confirmed bumped.
* **Refresh**: Re-verified 136 against current source: scripts/doc-snippets.ts family split (LANGS_TS jsx/ts/tsx/typescript vs LANGS_JS js, checkJs:false line 369), per-doc TS-family .tsx module with per-family import merging, strict:true base tsconfig, HellaPrimitive excludes null (nodes.d.ts:22), strict tier gates exit code while tutorial is informational, cross-ref 078 resolves. Entry still accurate; note store docs have since converted their js fences (evidence narrative drift only).
* **Refresh**: Entry 137 re-verified against source: nodes.d.ts:217 ElementHook=(node?: Element)=>void, attributes.d.ts:72 hook:* props -> ElementHooks[K], cleanup.ts runHooks passes node as Element except zero-arg beforeMount/afterDestroy, ElementMountFn distinct at nodes.d.ts:171, hook.mdx narrowing intact
* **Creation**: Added concept [209](entries/209.md) (type: correction).
* **Deprecation**: Archived [138](archive/138-bun-lock-misses-plugins-babel-devdep.md) → superseded by [209](entries/209-worktree-provisioning-no-longer-dirties.md).
* **Refresh**: Entry 139: reproduced TS2345 (string widening in component() prop object) against current dom source via scratch tsc probe; 'as const' fix clean; PortalInsertType/PortalProps confirmed in nodes.d.ts; fixed rotted line-number citation in body
* **Refresh**: Re-verified entry 140 against current source: single-line-per-paragraph prose confirmed in packages/{router,core,dom,store}/docs (200+ char lines), routing.mdx=520 and api/router.mdx=397 match the entry's claimed post-edit values, and guides/docs.md §Length Targets carries the healthy-range/flag-beyond table with the range-to-flag-judgment checklist item; cited plan file plans/router/audit/docs/05-docs-length-trim.md no longer exists (ephemeral plans/ artifact) but the durable claims all hold
* **Refresh**: Re-verified entry 141 against current source: signalMap.ts entry(k) returns a computed dropping write args (computed.ts closure takes no params); only signalArray nodeAt(i) returns a writable raw signal (signal.ts arguments.length write). All claims hold.
* **Refresh**: Re-verified entry 142 (doc-snippets signature-only skip) against scripts/doc-snippets.ts: isExecutableBlock (lines 184-194) judged per line; shield prefixes (declare/type/interface, }-closing, signature lines) are per-line only; EXECUTABLE_RE line 91 carries ^< ; ASSIGN_RE (83) tests bare = after stripArrows (87-89) strips => and <...> groups — the continuation-line flip claim and line citations all hold. bun doc-snippets exists (package.json:70).
* **Refresh**: Re-verified entry 143 against current source: fetchWithRetry delay executor (packages/resource/lib/internal/retry.ts) and raceAbort (packages/resource/lib/internal/abort.ts) both use the hoisted let + .finally settle-hook shape; persistStore resolveReady (packages/store/lib/persistStore.ts) unchanged; prefer-const still error at eslint.config.mjs:52
* **Refresh**: Entry 144 (prototype-method spies cast at assignment site): re-verified all claims against current source — retry.test.ts scenario exists with declaration-site inferred Mock type + assignment-site cast + .mock.calls.length asserts; direct-events.test.ts precedent shapes present; guides/tests.md §Mock Patterns (explicit-generic, cast as unknown as typeof X) and §Anti-Patterns (integer-counter ban) unchanged; bun test packages/resource/tests/retry.test.ts → 14 pass
* **Refresh**: Re-verified 145 (resource api mdx mirror): type surfaces of resource.d.ts:55-119 and docs/api/resource.mdx:48-103 still identical (diff clean modulo one // section comment); onMutate citations 107/97 resolve; added scope note that JSDoc prose deliberately diverges (mirror is type-surface only)
* **Refresh**: Re-verified entry 146: test location/path in component-scope.test.ts, cf6c4293 split commit, test body (peekState polls, no BrokenComp), single 'render failed' source in component.test.ts, delay() no-arg Promise.resolve(), and isolated run 16 pass/0 fail

## 2026-09-24
* **Update**: Renumber: worker-allocated IDs 172-184 (ui-shadcn-components merge) collided with main-tree entries 172-180 allocated in parallel — renumbered to 181-193
* **Creation**: Added concept [184](entries/184.md) (type: decision).
* **Creation**: Added concept [194](entries/194.md) (type: correction).
* **Creation**: Added concept [195](entries/195.md) (type: decision).
* **Deprecation**: Archived [190](archive/190-ui-component-doc-links.md) → superseded by [194](entries/194-link-sibling-ui-component-docs.md).
* **refresh**: Entry 150 refreshed: <//> reintroduction in command/input-otp demo pages + input-otp doc re-eradicated; ban now guard-enforced via scripts/short-close.ts in lint:guards
* **correction**: Entry 150: short-close guard removed same day on user call - script deemed overkill; close-form enforcement stays prose + memory, do not re-propose

## 2026-09-23
* **Note**: main-tree parallel allocations, uncommitted operator state:
* **Creation**: Added concept [175](entries/175.md) (type: correction).
* **Creation**: Added concept [176](entries/176.md) (type: decision).
* **Creation**: Added concept [177](entries/177.md) (type: decision).
* **Creation**: Added concept [178](entries/178.md) (type: decision).
* **Creation**: Added concept [179](entries/179.md) (type: decision).
* **Creation**: Added concept [180](entries/180.md) (type: decision).
* **Creation**: Added concept [183](entries/183.md) (type: decision).

## 2026-09-22
* **Note**: main-tree parallel allocation, uncommitted operator state:
* **Creation**: Added concept [174](entries/174.md) (type: decision).
* **Creation**: Added concept [181](entries/181.md) (type: decision).

## 2026-09-19
* **Note**: main-tree parallel allocations, uncommitted operator state:
* **Creation**: Added concept [172](entries/172.md) (type: decision).
* **Creation**: Added concept [173](entries/173.md) (type: decision).
* **Creation**: Added concept [178](entries/178.md) (type: decision).
* **memory**: add 178: compiled-registry tests need the bare @hellajs/dom resetDom (dual-instance reset)
* **Creation**: Added concept [179](entries/179.md) (type: decision).
* **Creation**: Added concept [180](entries/180.md) (type: decision).

## 2026-09-18
* **Creation**: Added concept [151](entries/151.md) (type: decision).
* **Update**: Renumber: worker-allocated ID 150 (feedback-scan-ts-needs-session, dom-dissolve merge) collided with main-tree 150-close-dynamic-html-template-component — renumbered to 151
* **Creation**: Added concept [150](entries/150.md) (type: decision).
* **Creation**: Added concepts [152](entries/152.md) and [153](entries/153.md) (type: correction) — commitlint hook crash on workspace-deleting commits; bun isolated-linker worktree repair recipe (primitives-dissolution merge + ui sweep run)
* **Creation**: Added concept [154](entries/154.md) (type: decision).
* **Update**: ui set merge: added concepts [155](entries/155-package-tsconfig-must-narrow-base.md) [156](entries/156-per-module-dist-build-s.md) [157](entries/157-delegated-on-handlers-fire-from-body-capture.md) [158](entries/158-happydom-focus-fires-bubbling-focusin.md) [159](entries/159-docs-site-aliases-resolve-via-tsconfig-paths.md) [160](entries/160-esbuild-externals-ride-only-bundle.md) [168](entries/168-tailwind-v4-var-shorthands-and-opacity-modifiers-verified.md); Renumber: worker-allocated IDs 149/150/151/152/153/154/161 collided with main-tree entries — renumbered to [162](entries/162-worker-split-mode-venues-inherit.md) [163](entries/163-ts6-shadows-same-basename-tsx-when-ts-in-program.md) [168] [164](entries/164-ts6-tsc-ignoreconfig-explicit-files.md) [165](entries/165-bundle-cache-hash-set-untracked-packages.md) [166](entries/166-bun-glob-requires-as-full.md) [167](entries/167-vite-import-meta-glob-resolves.md) (plans/ui/code/hellajs-ui merge)
* **Creation**: Added concept [169](entries/169.md) (type: decision).
* **Deprecation**: Archived [022](archive/022-dom-s-hellajs-ssr-test.md) → superseded by [169](entries/169.md).
* **Creation**: Added concept [170](entries/170.md) (type: decision).
* **Creation**: Added concept [171](entries/171.md) (type: decision).
* **Creation**: Added concept [172](entries/172.md) (type: decision).
* **Creation**: Added concept [173](entries/173.md) (type: decision).
* **Creation**: Added concept [174](entries/174.md) (type: decision).
* **Creation**: Added concept [175](entries/175.md) (type: decision).
* **memory**: unit 03 statics/forms/table: registry dist recovery + compiled-dist probe technique (175)
* **Creation**: Added concept [176](entries/176.md) (type: decision).
* **Creation**: Added concept [177](entries/177.md) (type: decision).
* **Update**: unit 6 disclosure: memory 177 - babel aria/data camelCase call-site rewrite verified from plugins/babel source + ui coverage repro

## 2026-09-17
* **Creation**: Added concept [149](entries/149.md) (type: decision).

## 2026-09-16
* **Creation**: Added concept [146](entries/146.md) (type: correction).
* **Deprecation**: Archived [008](archive/008-dom-multiple-components-isolation-test.md) → superseded by [146](entries/146-dom-multiple-components-isolation-test.md).
* **Update**: Renumber: worker-allocated ID 146 (typed-event-listeners-generic-node, ui-primitives merge) collided with main-tree 146-dom-multiple-components-isolation-test — renumbered to 148

## 2026-09-15
* **Creation**: Added concept [140](entries/140.md) (type: decision).
* **Creation**: Added concept [141](entries/141.md) (type: decision).
* **Creation**: Added concept [142](entries/142.md) (type: decision).
* **memory**: captured: doc-snippets per-line signature-only skip predicate (entry 142) from store docs audit unit 01
* **Update**: Renumbered doc-snippets signature-only-skip entry from 141 to 142 — main tree had allocated 141 (signalmap-entry-handle-never-writes) before the store docs audit component merged
* **Creation**: Added concept [143](entries/143.md) (type: decision).
* **Creation**: Added concept [144](entries/144.md) (type: decision).
* **Creation**: Added concept [145](entries/145.md) (type: decision).
* **Creation**: Added concept [148](entries/148.md) (type: decision).
* **Creation**: Added concept [147](entries/147.md) (type: decision).

## 2026-09-10
* **Creation**: Added concept [120](entries/120.md) (type: decision).
* **Creation**: Added concept [121](entries/121.md) (type: decision).
* **Creation**: Added concept [124](entries/124.md) (type: decision).
* **Deprecation**: Archived [114](archive/114-worktree-example-installs-need-bun.md) → superseded by [124](entries/124.md).
* **Creation**: Added concept [125](entries/125.md) (type: decision).
* **Note**: Renumbered merge entry 124 to 125 at plans-core-audit-code merge; ID 124 was allocated in-flight by 124-fresh-worktree-builds-need-bun.
* **Creation**: Added concept [126](entries/126.md) (type: decision).
* **Creation**: Added concept [127](entries/127.md) (type: decision).
* **Update**: Renumbered merge entries 124→126 (accept-small-docs-length-target) and 125→127 (doc-snippets-resets-doc-snippets) at plans-core-audit-docs merge; IDs 124/125 were allocated in-flight by 124-fresh-worktree-builds-need-bun and core-documents-input-validation-throws.
* **Creation**: Added concept [128](entries/128.md) (type: decision). Renumbered from 124 at merge: ID 124 was taken in-flight by 124-fresh-worktree-builds-need-bun.
* **Creation**: Added concept [129](entries/129.md) (type: decision).
* **Update**: Renumbered merged entries 124→130 (relative-import-doc-block-silently), 125→131 (doc-jsx-examples-cannot-run), 126→132 (declarations-only-css-silent-no), 127→133 (docs-trim-gap-prefer-formatting), 128→134 (single-line-vars-calls-legal) at plans-css-audit-docs merge; IDs 124-128 were taken in-flight by 124-fresh-worktree-builds-need-bun, core-documents-input-validation-throws, accept-small-docs-length-target, doc-snippets-resets-doc-snippets, and chrome-only-cssom-behavior-statement.
* **Creation**: Added concept [130](entries/130.md) (type: decision).
* **Creation**: Added concept [131](entries/131.md) (type: decision).
* **Creation**: Added concept [132](entries/132.md) (type: decision).
* **Creation**: Added concept [133](entries/133.md) (type: decision). Creation bullet for 127 was omitted by the worker's log update; recorded here at renumbering.
* **Creation**: Added concept [134](entries/134.md) (type: decision).
* **Update**: Refreshed [049](entries/049-green-happy-dom-css-asserts.md) — added conditional-at-rule query colon-space collapse mapping (empirically confirmed via the dual exact pins in css-at-rules.test.ts, bun coverage css 213 pass)
* **Update**: Renumber: worker-allocated ID 124 (gc-canaries-over-signal-held, plans-dom-audit-code merge) collided with main-tree 124-fresh-worktree-builds-need-bun — renumbered to 135
* **Update**: Renumber: worker-allocated IDs 124/125 (converting-doc-fence-js-jsx, hook-props-type-element-optional; plans-dom-audit-docs merge) collided with main-tree 124-fresh-worktree-builds-need-bun and 125-core-documents-input-validation-throws — renumbered to 136/137
* **Update**: Renumber dom-tests-audit worktree memory entries 124/125 → 138/139 (main tree allocated the same IDs via a parallel set before merge).

## 2026-09-11
* **Creation**: Added concept [122](entries/122.md) (type: correction).
* **Creation**: Added concept [123](entries/123.md) (type: decision).

## 2026-09-09
* **Creation**: Added concept [112](entries/112.md) (type: decision).
* **Deprecation**: Archived [004](archive/004-defer-per-element-array-reactivity.md) → superseded by [112](entries/112.md).
* **Creation**: Added concept [113](entries/113.md) (type: decision).
* **Creation**: Added concept [114](entries/114.md) (type: decision).
* **Creation**: Added concept [115](entries/115.md) (type: decision).
* **Creation**: Added concept [116](entries/116.md) (type: decision).
* **Creation**: Added concept [117](entries/117.md) (type: decision).
* **Creation**: Added concept [118](entries/118.md) (type: decision).
* **Creation**: Added concept [119](entries/119.md) (type: decision).

## 2026-09-08
* **Creation**: Added concept [099](entries/099.md) (type: decision).
* **Deprecation**: Archived [061](archive/061-new-worktree-cut-mid-unit.md) → superseded by [099](entries/099.md).
* **Creation**: Added concept [100](entries/100.md) (type: decision).
* **Update**: Merge protocol revision: per-task commits via worktree.mjs commit + cherry-pick replace the 3-way apply; plans never enter the index, ticks updated agent-side unstaged
* **merge**: Component 02 created concept 100-composed-store-leaves-type-as (composed store leaves type as Store<Store<...>>, method calls through wrapper TS2769); renumbered 100 -> 104 on merge (100 taken by store-conditional-type-mappings)
* **merge**: Component 06 created concept 100-build-all-packages-once-fresh (build all packages once in a fresh worktree before scoped bundle/dist-dependent checks); renumbered 100 -> 105 on merge (100 taken, 102-103 reserved for component 08)
* **merge**: Component 08 landed memory 102 (store function values parameters) and 103 ($-prefixed headings anchor to the $-stripped slug); no renumber needed — 102/103 were free after 02->104 and 06->105
* **Creation**: Added concept [106](entries/106.md) (type: decision).
* **Creation**: Added concept [101](entries/101.md) (type: decision).
* **Creation**: Added concept [103](entries/103.md) (type: decision).
* **Creation**: Added concept [104](entries/104.md) (type: decision).
* **merge**: plans-plugins-babel-code-audit-fixes landed concepts 107-111 (html dynamic closers, canonical divergences, babel generator quotes, two babel-types instances, red-baseline re-entry); renumbered 100-104 -> 107-111 on merge (100-104 taken)

## 2026-09-07
* **Creation**: Added concept [096](entries/096.md) (type: correction).
* **Update**: Extended [069](entries/069-bun-s-coverage-table-renders.md) with the fresh-lcov declaration-line artifact (replaceMismatch, dom bundle) + baseline-compare triage; merged from the fragment-scope-carrier run.
* **Creation**: Added concept [097](entries/097.md) (type: decision).
* **Creation**: Added concept [098](entries/098.md) (type: decision).

## 2026-09-06
* **Creation**: Added concept [084](entries/084.md) (type: decision).
* **Creation**: Added concept [085](entries/085.md) (type: decision).
* **Creation**: Added concept [086](entries/086.md) (type: decision).
* **Creation**: Added concept [087](entries/087.md) (type: decision).
* **Creation**: Added concept [088](entries/088.md) (type: decision).
* **Creation**: Added concept [089](entries/089.md) (type: decision).
* **Deprecation**: Archived [087](archive/087.md) → superseded by [089](entries/089.md).
* **Creation**: Added concept [090](entries/090.md) (type: decision).
* **Creation**: Added concept [091](entries/091.md) (type: decision).
* **Creation**: Added concept [092](entries/092.md) (type: decision).
* **Creation**: Added concept [093](entries/093.md) (type: decision).
* **Creation**: Added concept [094](entries/094.md) (type: decision).
* **Creation**: Added concept [095](entries/095.md) (type: decision).

## 2026-09-05
* **Creation**: Added concept [082](entries/082.md) (type: decision).
* **Creation**: Added concept [083](entries/083.md) (type: correction).

## 2026-09-03
* **Creation**: Added concept [080](entries/080.md) (type: decision).
* **Creation**: Added concept [081](entries/081.md) (type: decision).

## 2026-09-02
* **Creation**: Added concept [076](entries/076.md) (type: correction).
* **Creation**: Added concept [077](entries/077.md) (type: decision).
* **Creation**: Added concept [078](entries/078.md) (type: decision).
* **Creation**: Added concept [079](entries/079.md) (type: decision).
* **Deprecation**: Archived [006](archive/006.md) → superseded by [079](entries/079.md).
* **Update**: [079](entries/079.md) refreshed — cssVars-family aliases removed same-day by user correction (no deprecation re-exports in a breaking rename; rule codified in guides/code.md §Code Rules).

## 2026-09-01
* **Creation**: Added concept [071](entries/071.md) (type: decision).
* **Creation**: Added concept [072](entries/072.md) (type: decision).
* **Update**: Refreshed [021](entries/021.md) and [032](entries/032.md) for the pull-driven ssr.stream/doc conversion (plans/ssr/code/ssr-behavior-gaps/07) — 021 now records the one-chunk-per-pull timing (drain to a gating chunk + await delay(0) so the NEXT pull runs the gated step; confirmed by the Lazy resolveLate failure); 032 now records queue-appending collection (parked-pull wake, per-drain swap-error isolation) and drops the stale rejects-Promise.all error routing.
* **Creation**: Added concept [073](entries/073.md) (type: decision).
* **Creation**: Added concept [074](entries/074.md) (type: decision).
* **Creation**: Added concept [075](entries/075.md) (type: decision).

## 2026-08-31
* **Creation**: Added concept [065](entries/065.md) (type: decision).
* **Creation**: Added concept [066](entries/066.md) (type: decision).
* **Creation**: Added concept [067](entries/067.md) (type: decision) — template-literal `infer` slots cross `/` boundaries; pattern-grammar token typing recurses per segment.
* **Creation**: Added concept [068](entries/068.md) (type: decision).
* **Creation**: Added concept [069](entries/069.md) (type: decision).
* **Creation**: Added concept [070](entries/070.md) (type: decision).

## 2026-08-30
* **Creation**: Added concept [057](entries/057.md) (type: decision).
* **Creation**: Added concept [058](entries/058.md) (type: decision).
* **Creation**: Added concept [059](entries/059.md) (type: decision).
* **Deprecation**: Archived [057](archive/057.md) → superseded by [058](entries/058.md).
* **Creation**: Added concept [060](entries/060.md) (type: decision).
* **Creation**: Added concept [061](entries/061.md) (type: decision).
* **Creation**: Added concept [062](entries/062.md) (type: correction).
* **Creation**: Added concept [063](entries/063.md) (type: decision).
* **Creation**: Added concept [064](entries/064.md) (type: decision).

## 2026-08-27
* **Creation**: Added concept [053](entries/053.md) (type: decision).
* **Creation**: Added concept [054](entries/054.md) (type: decision).
* **Creation**: Added concept [055](entries/055.md) (type: decision).
* **Creation**: Added concept [056](entries/056.md) (type: decision).

## 2026-08-25
* **Creation**: Added concept [049](entries/049.md) (type: decision).
* **Creation**: Added concept [050](entries/050.md) (type: decision).
* **Creation**: Added concept [051](entries/051.md) (type: decision).
* **Creation**: Added concept [052](entries/052.md) (type: correction).

## 2026-08-22
* **Creation**: Added concept [041](entries/041.md) (type: decision).
* **Creation**: Added concept [042](entries/042.md) (type: decision).
* **Creation**: Added concept [043](entries/043.md) (type: decision).
* **Creation**: Added concept [044](entries/044.md) (type: decision).
* **Creation**: Added concept [047](entries/047.md) (type: correction).
* **Creation**: Added concept [048](entries/048.md) (type: decision).

## 2026-08-21
* **Creation**: Added concept [039](entries/039.md) (type: decision).
* **Creation**: Added concept [040](entries/040.md) (type: decision).
* **Creation**: Added concepts [041](entries/041.md) (isDynamic test component factory shape), [042](entries/042.md) (two-microtask-hop catch assertion), [043](entries/043.md) (braced switch-case closing-brace coverage artifact) — all verified during the dom audit-fix worker run.
* **Update**: Refreshed [030](entries/030.md) — removed stale `<Show>` recommendation (no such export; superseded by resource + reactive-child idiom per suspense.mdx/AGENTS.md 2026-08-21) and recorded the new hydrate stageMissing degradation contract.

## 2026-08-20
* **Creation**: Added concept [038](entries/038.md) (type: correction).

## 2026-08-09
* **Creation**: Added concept [036](entries/036.md) (type: correction).

## 2026-07-31
* **Creation**: Added concept [035](entries/035.md) (type: decision).

## 2026-07-30
* **Creation**: Added concept [032](entries/032.md) (type: decision).
* **Creation**: Added concept [033](entries/033.md) (type: decision).
* **Creation**: Added concept [034](entries/034.md) (type: decision).
* **Deprecation**: Archived [015](archive/015.md) → superseded by [033](entries/033.md).

## 2026-07-28
* **Update**: Accuracy sweep — re-verified every active concept against `lib/`/`package.json` source. Fixed 023 (title+desc+evidence: the "dependencies null / ZERO runtime deps" generalization was false — css legitimately declares `csstype` as a runtime dep because `CSS.Properties` flows into the public `CSSObject` type shipped in `dist/types.d.ts`; consumers need it resolvable to type-check `css({...})`, so `dependency` not `devDependency`), 022 (Why: same false generalization → cross-ref 023), 026 (examples enumeration — added ssr-routing/ssr-streaming/bench; bench is the rollup-tooling `dependencies` exception, still no @hellajs/* entry), 018 (5→6 router ssr.test scenarios — 027 added the per-request re-resolution test). Bumped `last_confirmed` → 2026-07-28 on all 24 re-verified entries except 008 (flaky-test observation; not re-verifiable without a full-suite run). Rebuilt index.md.
* **Prune**: Deleted orphan `archive/007.md` (twice-superseded: 007 → 009 → 013; referenced only by archived 009, so no active entry reached it). Archive is now 009/011/017, all one-hop-reachable from active entries.
* **Creation**: Added concept [025](entries/025.md) (type: decision).
* **Creation**: Added concept [026](entries/026.md) (type: decision).
* **Creation**: Added concept [027](entries/027.md) (type: correction).
* **Creation**: Added concept [028](entries/028.md) (type: correction).
* **Creation**: Added concept [029](entries/029.md) (type: decision).
* **Creation**: Added concept [007](entries/007.md) (type: decision).
* **Creation**: Added concept [030](entries/030.md) (type: decision).
* **Creation**: Added concept [031](entries/031.md) (type: decision).

## 2026-07-17
* **Creation**: Added concept [020](entries/020.md) (type: correction).
* **Creation**: Added concept [021](entries/021.md) (type: decision).
* **Creation**: Added concept [022](entries/022.md) (type: decision).
* **Creation**: Added concept [023](entries/023.md) (type: decision).
* **Creation**: Added concept [024](entries/024.md) (type: decision).
* **Deprecation**: Archived [011](archive/011.md) → superseded by [022](entries/022.md).

## 2026-07-14
* **Creation**: Added concept [018](entries/018.md) (type: decision).
* **Creation**: Added concept [019](entries/019.md) (type: decision).
* **Deprecation**: Archived [017](archive/017.md) → superseded by [018](entries/018.md).

## 2026-07-12
* **Creation**: Added concept [014](entries/014.md) (type: decision).
* **Creation**: Added concept [015](entries/015.md) (type: decision).
* **Creation**: Added concept [016](entries/016.md) (type: decision).
* **Creation**: Added concept [017](entries/017.md) (type: decision).

## 2026-07-11
* **Update**: Accuracy refresh — re-verified every active concept against `lib/` source. Fixed 005 ("ssr UNBUILT (entry 007)" → ssr is BUILT; 007 archived → 009 → 013; corrected lifecycle/cache/render line drift) and 006 ("14 tests" → 13 tests, in description + 005 css bullet). Bumped `last_confirmed` on 001/002/003/004/005/006 (verified accurate this session). 008 (flaky-test observation) left as-is — flakiness not re-verifiable without a full-suite run; 010/011/012 RESOLVED-banner accuracy confirmed. Rebuilt index.md.
* **Creation**: Added concept [012](entries/012.md) (type: decision).
* **Creation**: Added concept [013](entries/013.md) (type: decision) — SSR+hydration marker rework (Vue-style `<!--[->…<!--]-->` markers; marker-free walk reverted).
* **Update**: [010](entries/010.md)/[011](entries/011.md)/[012](entries/012.md) marked RESOLVED via banners (013 retires the marker-free behavior; 011's unlink fixed by `bun install`).
* **Deprecation**: Archived [009](archive/009.md) → superseded by [013](entries/013.md).

## 2026-07-10
* **Update**: Refresh — entries 005/006 updated from UNBUILT to BUILT: css platform-dependent return is implemented (css.ts:37, cssVars.ts:27-41), former 4 css-side maps collapsed to 1 (injectedMap), <style> babel transform deleted. Entry 007 (ssr package) remains UNBUILT. Rebuilt index.md.
* **Creation**: Added concept [008](entries/008.md) (type: decision) — dom 'multiple components isolation' full-suite flake.
* **Update**: Refresh — entry 007 (ssr package) updated from UNBUILT to BUILT: @hellajs/ssr shipped (ssr(node): string, consolidated into lib/ssr.ts, zero runtime @hellajs/* imports; resource hasWindow guard; dom __ssr metadata on isDynamic components). Rebuilt index.md.
* **Creation**: Added concept [009](entries/009.md) (type: decision).
* **Creation**: Added concept [010](entries/010.md) (type: decision).
* **Creation**: Added concept [011](entries/011.md) (type: decision).
* **Deprecation**: Archived [007](archive/007.md) → superseded by [009](entries/009.md).

## 2026-07-07
* **Creation**: Added concept [006](entries/006.md) (type: decision).
* **Creation**: Added concept [007](entries/007.md) (type: decision).
* **Update**: Audit — entries 005/006/007 reframed to mark SSR track as DECIDED-but-UNBUILT (prose had presented planned work as shipped). Entry 005 update paragraph rewritten; path prefixes corrected (internal/render.ts, internal/lifecycle.ts). Deleted stale uppercase INDEX.md (script writes lowercase index.md). Rebuilt index.md.

## 2026-07-03
* **Creation**: Added concept [004](entries/004.md) (type: decision).
* **Creation**: Added concept [005](entries/005.md) (type: decision).

## 2026-07-01
* **Creation**: Added concept [003](entries/003.md) (type: decision).

## 2026-06-30
* **Creation**: Added concept [002](entries/002.md) (type: decision).

## 2026-06-29
* **Creation**: Added concept [001](entries/001.md) (type: decision).
* **Update**: Recorded esbuild external-import dedup fact; deleted delete-core-shim plan, updated fold-error-into-dispatch with docs evidence
