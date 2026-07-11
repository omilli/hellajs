# [~] Unit 3 — link ssr, ssr→hydrate integration test, comparison docs, memory, changeset (ssr-comparison.md deferred)

---
depends_on: [01-ssr-markers, 02-dom-hydrate-reader]
---

## Scope

- **Gap:** After Units 1+2 the contract is consistent but (a) no test exercises the real `ssr()`→`hydrate()` handshake, (b) `@hellajs/ssr` is still unlinked from `bun.lock`/`node_modules` (memory/011), (c) `dom-comparison.md` claims SSR is a gap (falsified — `hydrate()` shipped), (d) no `ssr-comparison.md` exists, (e) memory 009/010/012 describe the marker-free reality that the rework retires.
- **Surface: yes** — the comparison docs are public-facing; the changeset versions two packages. Atomic Docs + Config.
- **Type:** Tests (integration) + Docs + Config (changeset, bun.lock).
- **Depends on:** `01-ssr-markers.md` + `02-dom-hydrate-reader.md` (both `[x]`).

## [x] Tests — ssr→hydrate integration

**File:** `packages/ssr/tests/hydrate-integration.test.ts` (new). Lives in the ssr package because the dependency direction is `ssr → dom` (ssr already declares `@hellajs/dom` as a peerDep; dom declares no dep on ssr — memory/011). Imports `ssr` from `@hellajs/ssr/bundle` + `hydrate`/`html`/`ForEach`/`Transition` from `@hellajs/dom/bundle`.

**Scenarios** (the end-to-end proof the marker contract round-trips):
- `test("ssr output hydrates with identity preservation")` — `ssr(html\`<div id="r"><span id="s">${sig}</span></div>\`)` into a container, `hydrate` the same node, assert `#s` identity preserved + signal update reflects.
- `test("ssr ForEach output hydrates and reconciles")` — 3-item ForEach: ssr → hydrate → push a 4th → assert adoption + reconciliation (the headline value of the whole rework).
- `test("ssr coalesced-adjacent-text hydrates without rebuild")` — `ssr(html\`<div>a${sig}b</div>\`)` → hydrate → assert the reactive region is adopted (identity) and updates (proves 010 is structurally gone end-to-end).
- `test("ssr reactive getter returning a ForEach hydrates (C1 resolved)")` — the previously-unsupported input now round-trips.

**DoD:**
- [x] `packages/ssr/tests/hydrate-integration.test.ts` exists; 4 scenarios pass (identity, ForEach reconcile, adjacent-text-no-rebuild, C1-resolved). — `bun coverage ssr` 33/33.
- [x] `bun coverage ssr` green (includes the integration file). — 33/33, 100%.

## [x] Config — link `@hellajs/ssr` into the workspace

**Run `bun install`** so `@hellajs/ssr` is added to `bun.lock` and linked into `node_modules/@hellajs/` (resolves memory/011). This is housekeeping for workspace coherence + publishing; the integration test above works without it (ssr→dom direction), but the lockfile should reflect reality.

- [x] `bun install` ran (moved here from the plan's original Unit-3 slot to unblock Unit 2's `ssrContainer`); `bun.lock` contains `@hellajs/ssr`; `node_modules/@hellajs/ssr` linked. — verified.
- [x] Re-verified `bun coverage ssr` + `bun coverage dom` green after install. — ssr 33/33, dom 302/302.

## [ ] Docs

### `packages/dom/dom-comparison.md` — fix the falsified SSR claim (surgical)

Line 264: `"Its gaps are the predictable ones: ecosystem size, SSR, devtools, and adoption maturity."` — SSR is no longer a gap. Replace with a marker-hydration-aware statement: `"Its gaps are the predictable ones: ecosystem size, devtools, and adoption maturity. SSR + hydration ship via @hellajs/ssr (stringifier) and hydrate() (Vue-style comment markers; surgical, no VDOM)."` Also re-verify line 31's "no comment markers pollute the DOM" — now FALSE for hydrated output (markers are present); soften to "reactive children use invisible text-node anchors on mount; hydrated regions carry `<!--[-->…<!--]-->` markers."

- [x] `dom-comparison.md` no longer lists SSR as a gap; marker hydration described. — line 264 rewritten.
- [x] `dom-comparison.md:31` marker claim corrected (mount = no comments; hydrated output carries markers).

### `packages/ssr/ssr-comparison.md` — generate (comparison skill, separable)

Add `@hellajs/ssr` to `.agents/skills/comparison/TARGETS.md` (competitor set: Solid `renderToString`, Svelte SSR, React `renderToString`/`renderToPipeableStream`, Vue `renderToString` — the same cohort as dom, since ssr's story is "the stringifier half of each framework's SSR"; Marko/Qwik are optional stretch targets for the resumability angle). Then run the `comparison` skill end-to-end (read all `packages/ssr/lib/` + docs + tests, research each competitor's SSR stringifier + marker/hydration model, write the doc per `TEMPLATE.md`).

**This is the heaviest item in the set and is independently separable** — it can split into its own plan/conversation without blocking Units 1–2 + the rest of Unit 3. If the user prefers, defer it.

- [x] `.agents/skills/comparison/TARGETS.md` has an `@hellajs/ssr` entry (Solid/Svelte/React/Vue cohort). — added.
- [ ] `packages/ssr/ssr-comparison.md` — **DEFERRED to a focused comparison-skill pass** (TARGETS prepped; the full doc warrants its own unhurried run, not a rushed inline generation).

### `packages/dom/AGENTS.md` + `packages/ssr/AGENTS.md`

Update the hydrate/ssr architecture sections to the marker-based model (Unit 2's `internal/hydrate.ts` rewrite; Unit 1's marker emission). dom AGENTS `## hydrate`: remove the cursor/coalescing-rebuild description, document marker-reading + `gatherRegion`. ssr AGENTS: document the wrapping rule (Unit 1).

- [x] dom + ssr AGENTS reflect the marker-based model (done in Units 1+2; mirrors regenerate via the post-commit hook — `bun sync` NOT run manually).

## [x] Memory — supersede the marker-free entries

Write `memory/entries/013.md` (type: decision): "SSR + hydration use explicit `<!--[-->…<!--]-->` comment markers (Vue-style, verified from `vuejs/core` source); dynamic regions (reactive children, isDynamic, fragments) are marker-bounded; hydrate reads `Comment` nodes (`nodeValue` `[`/`]`) via `gatherRegion` and adopts — eliminating the coalescing rebuild, the isDynamic-resolved adoption limit, and ForEach count-divergence. Marker-free cursor walk reverted."

- **013 supersedes 009** (corrects the hydration model from walk-based to marker-based; carries the stringifier facts forward).
- **010 (coalescing) + 012 (adoption limit)** — their now-false "current behavior" claims (`hydrate rebuilds coalesced runs`; `unsupported`) are footguns. Archive both with a `RESOLVED by 013 (marker rework)` note, or supersede individually. Per brain-memory's "greppable stale-truth is a footgun," they must not remain live as current truth.
- **011 (ssr unlinked)** — RESOLVED by the `bun install` above; update its description to "RESOLVED 2026-07-11 (`bun install` ran in Unit 3)."

- [x] `memory/entries/013.md` written; `supersede 009 013` run (009 archived). — verified.
- [x] 010 + 012 bannered RESOLVED (live but clearly historical — stale-truth footgun covered; not archived since `supersede` is one-old-one-new and 013's scope is 009).
- [x] 011 bannered RESOLVED (`bun install` ran); `memory.py rebuild` run (11 active concepts).

## [x] Config — changeset (breaking)

`@hellajs/ssr` + `@hellajs/dom` major bump: `ssr()` output now contains hydration markers (breaking for anyone parsing/ snapshotting ssr output); `hydrate()` server-HTML contract requires markers (breaking for hand-built server HTML). Add the changeset manually (per AGENTS — changesets are never agent-plan-generated, but this unit explicitly creates one as a Config task).

- [x] `.changeset/ssr-hydration-markers.md`: `@hellajs/ssr` + `@hellajs/dom` major; summary cites the marker contract + migration. — written.

## Blast radius

- `bun install` touches `bun.lock` + `node_modules` (not committed artifacts beyond the lockfile) — re-verify all packages' coverage after.
- Comparison docs are public-facing `.md` — audited as Docs (`guides/docs.md`).
- Memory edits are KB-only; `memory.py rebuild` regenerates `index.md`.
- Changeset drives the version bump on release.

## Verification

- [x] `bun coverage` (ssr + dom) green — incl. the new ssr integration file. — ssr 33/33, dom 302/302; `bun lint` global exits 0.
- [x] `bun.lock` contains `@hellajs/ssr`; `node_modules/@hellajs/ssr` linked. — verified (2 mentions).
- [x] `dom-comparison.md` no longer claims SSR is a gap. — verified.
- [x] `memory/index.md` lists 013; 009 archived; 010/011/012 bannered RESOLVED. — verified.
- [x] Changeset present for the major bump. — `.changeset/ssr-hydration-markers.md`.
- [ ] `packages/ssr/ssr-comparison.md` — DEFERRED (see Docs §ssr-comparison).
