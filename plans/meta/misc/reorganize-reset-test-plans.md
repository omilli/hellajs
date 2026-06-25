# [ ] reorganize-reset-test-plans

## Contract

### Surface change
no — no package `index.ts` barrel is touched; this plan edits/deletes plan-markdown contracts under `plans/`. Per TEMPLATE Hard rules, non-package work is Surface change: `no` by definition.

### Package
meta — cross-cutting reorganization of plan files; not a package workspace (no `index.ts`).

### Guide governance
- Files ← `code.md` §Config Verification Checklist (plan files under `plans/` are authoring artifacts consumed by the plan/worker skills, NOT published API docs — `docs.md` does not govern them; same precedent as `plans/meta/misc/add-plan-strategy-examples.md:12` and `plans/meta/docs/agents-md-sync.md:12`)

### Files
- `plans/css/code/css-rename.md` — modify — Docs task absorbs the css `AGENTS.md` exports-table rename (transferred from the dissolved `agents-md-sync.md:15`); drop the `agents-md-sync.md` deferral at `:73`.
- `plans/resource/code/resource-reset.md` — modify — Docs task absorbs the standalone `resetresource.mdx` page + website wrapper (transferred from the dissolved `api-reference-pages.md:16-17`) AND the resource `AGENTS.md` exports-table add (transferred from `agents-md-sync.md:16`); drop deferrals at `:45-46,52,95,104`; add `packages/resource/AGENTS.md` to Contract.Files.
- `plans/router/code/router-reset.md` — modify — already owns `resetrouter.mdx`; Docs task absorbs the router `AGENTS.md` exports-table add (transferred from `agents-md-sync.md:17`); rewrite the contradictory "registered in meta/api-reference-pages.md" clauses at `:52,95` to unambiguous self-ownership; add `packages/router/AGENTS.md` to Contract.Files.
- `plans/dom/code/dom-reset-mount-handle.md` — modify — Docs task absorbs the standalone `resetdom.mdx` page + website wrapper (transferred from `api-reference-pages.md:20-21`) AND the dom `AGENTS.md` exports-table edits — `resetDom` rename, `MountHandle` add, eight-entry trim — (transferred from `agents-md-sync.md:18`); drop deferrals at `:75,118`; add `packages/dom/AGENTS.md` to Contract.Files. NOTE the split: the dom `AGENTS.md` **testing-section** rewrite (globals → explicit imports) goes to the consolidation plan, NOT here — this plan owns only the exports-table delta.
- `plans/meta/misc/test-harness.md` — modify — rescope as the consolidation plan: add a Docs task absorbing the `guides/tests.md` rewrite verbatim from `guides-tests-md.md`; add a Config task absorbing the per-package `AGENTS.md` testing-section rewrites for core/dom/store + root `AGENTS.md` packages table + testing section + `bun sync` regeneration (transferred from `agents-md-sync.md:18-22`); rewrite the Docs view at `:25` (currently defers the guide rewrite to `guides-tests-md.md`) to own it.
- `plans/store/code/devtools.md` — modify — replace the deferral clauses at `:63,105` ("registered in meta/docs/api-reference-pages.md", "AGENTS.md/CLAUDE.md sync owned by meta/docs/agents-md-sync.md") with self-ownership; add the store `AGENTS.md` exports-table entry for `devtools` to Contract.Files (the dissolved `agents-md-sync.md` never specced this — a latent gap; the feature plan now owns it explicitly).
- `plans/store/code/persist.md` — modify — same citation cleanup at `:72,114`; add the store `AGENTS.md` exports-table entry for `persist` to Contract.Files.
- `plans/css/code/ssr-extraction.md` — modify — replace the deferral clause at `:66` with self-ownership; add the css `AGENTS.md` exports-table entry for `extractCSS` to Contract.Files (the dissolved `agents-md-sync.md` never specced this — a latent gap; the feature plan now owns it explicitly).
- `plans/store/code/snapshot-composed-reactivity.md` — modify — drop the "broader AGENTS.md regeneration owned by meta/docs/agents-md-sync.md" deferral at `:22,33,82`; the scoped store `AGENTS.md` edit already listed in Contract.Files becomes the full ownership (no broader-sync plan remains).
- `plans/router/code/blocking-guards.md` — modify — drop the "broader sync owned by meta/docs/agents-md-sync.md" deferral at `:30,84,132`; the scoped router `AGENTS.md` edit already listed in Contract.Files becomes the full ownership.
- `plans/resource/code/cache-observability.md` — modify — rephrase `:61` to stand on `docs.md` §Template Selection directly (in-place interface extension needs no standalone page) instead of citing the dissolved "meta/api-reference-pages exception".
- `plans/meta/docs/api-reference-pages.md` — delete — fully dissolved; every page it owned transfers to the feature plan that owns the export (resets) or is dropped (flush → documented as a pattern in `testing-patterns-doc.md:20-21`).
- `plans/meta/docs/agents-md-sync.md` — delete — fully dissolved; export-table work transfers to each feature plan, testing-section + root + sync transfers to the consolidation plan.
- `plans/meta/docs/guides-tests-md.md` — delete — fully dissolved; the `guides/tests.md` rewrite transfers verbatim into the consolidation plan.

### Tests view
No impact. The touched files are `.md` plan contracts under `plans/`, not source under `packages/*/lib/`; `tests.md` §Files governs `packages/*/tests/**`. No `test()` applies.

### Docs view
No impact. `docs.md` governs published package/website docs (`packages/*/docs/**`, `docs/**`); plan files under `plans/` are authoring artifacts the skills consume at runtime, not published docs.

---

## [x] Make the four reset plans self-contained
**Type:** Config
**Depends on:** None

### Strategy
The reset cluster currently fragments ownership: each trio implements + tests its symbol but defers the standalone API page (resource, dom) and every package `AGENTS.md` edit to the dissolved meta plans. Apply the project's blast-radius rule literally — each plan owns its full surface. Concretely: (a) css-rename and router-reset already own their standalone pages, so they only absorb their package `AGENTS.md` exports-table edit; (b) resource-reset and dom-reset-mount-handle fold the deferred standalone page + website wrapper into their Docs task AND absorb their `AGENTS.md` exports-table edit. The dom `AGENTS.md` testing-section rewrite is NOT a exports-table edit — it transfers to the consolidation plan (it describes the harness migration, not the reset symbol). Rewrite every deferral clause to first-person ownership. Trade-off considered and rejected: keeping a trimmed `agents-md-sync.md` for the export-table work — that preserves exactly the fragmentation this reorg eliminates; a symbol's `AGENTS.md` entry is part of that symbol's blast radius, full stop.

Example (resource-reset.md Docs task, before → after):
```
// before (:95)
Do NOT create resetresource.mdx here — owned by meta/docs/api-reference-pages.md;
the AGENTS.md sync is owned by meta/docs/agents-md-sync.md.
// after
Create resetresource.mdx (Function template) + the website wrapper + add resetResource
to packages/resource/AGENTS.md exports table (invalidateAll is NOT a full reset —
misses dedup map + onlineCallbacks).
```

### Definition of Done
- [x] `plans/css/code/css-rename.md` Contract.Files includes `packages/css/AGENTS.md` (exports-table rename of the four entries) and the Docs task Strategy owns it — verified css-rename.md:24,116
- [x] `plans/resource/code/resource-reset.md` Contract.Files includes `packages/resource/AGENTS.md`, the standalone `resetresource.mdx` page, and the website wrapper; no deferral clause remains at `:45-46,52,95,104` — verified resource-reset.md:22-25,50,56,99,108-109
- [x] `plans/router/code/router-reset.md` Contract.Files includes `packages/router/AGENTS.md`; the clauses at `:52,95` assert unambiguous self-ownership (no "registered in meta/api-reference-pages.md") — verified router-reset.md:23,53,96,106
- [x] `plans/dom/code/dom-reset-mount-handle.md` Contract.Files includes `packages/dom/AGENTS.md` (exports-table: `resetDom` rename, `MountHandle` add, eight-entry trim), the standalone `resetdom.mdx` page, and the website wrapper; no deferral clause remains at `:75,118` — verified dom-reset-mount-handle.md:27-29,75,81,124,135
- [x] `rg -q "meta/docs/api-reference-pages|meta/docs/agents-md-sync" plans/css/code/css-rename.md plans/resource/code/resource-reset.md plans/router/code/router-reset.md plans/dom/code/dom-reset-mount-handle.md` exits 1 (zero matches — no reset plan defers to a dissolved meta plan) — verified exit=1
- [x] `bun lint` exits 0 — verified

## [x] Rescope test-harness as the consolidation plan
**Type:** Config
**Depends on:** None

### Strategy
`test-harness.md` already owns the globals→explicit-imports migration (strip preload, add `utils/test-helpers.ts`, rewrite package tests). It is the natural consolidation home because (a) it defers only its companion guide rewrite to `guides-tests-md.md`, and (b) the per-package `AGENTS.md` **testing-section** rewrites describe exactly the migration it performs — so owning them keeps the prose next to the behavior. Absorb two new tasks: a Docs task carrying the `guides/tests.md` rewrite verbatim from `guides-tests-md.md`, and a Config task carrying the core/dom/store `AGENTS.md` testing-section rewrites + root `AGENTS.md` packages table + testing section + `bun sync` regeneration from `agents-md-sync.md:18-22`. Rewrite the Docs view at `:25` from deferral to ownership. The exports-table deltas (which symbols each package ships) stay with each feature plan — only the cross-cutting testing-section story consolidates here. Trade-off considered and rejected: distributing the guide rewrite to a surviving standalone plan — the guide and the harness migration are one conceptual change; splitting them is the fragmentation this reorg ends.

### Definition of Done
- [x] `plans/meta/misc/test-harness.md` contains a Docs task titled for the `guides/tests.md` rewrite, with Strategy + DoD matching `guides-tests-md.md:30-49` — verified test-harness.md:93 (Docs task header) + Strategy/DoD below it
- [x] `plans/meta/misc/test-harness.md` contains a Config task for the core/dom/store `AGENTS.md` testing-section rewrites + root `AGENTS.md` packages table + testing section + `bun sync`, with Strategy noting the transfer from `agents-md-sync.md:18-22` — verified test-harness.md:108
- [x] The Docs view field in `test-harness.md` no longer defers the guide rewrite to `guides-tests-md.md` (the citation at `:25` is gone) — verified test-harness.md:25 now owns the testing-model doc surface
- [x] `rg -q "guides-tests-md" plans/meta/misc/test-harness.md` exits 1 (zero matches) — verified exit=1
- [x] `bun lint` exits 0 — verified

## [x] Clean out-of-cluster citation deferrals
**Type:** Config
**Depends on:** None

### Strategy
Full dissolution (per the scope decision) dangles references in six plans outside the reset/test cluster. Five of them (store/devtools, store/persist, css/ssr-extraction, store/snapshot, router/blocking-guards) already perform their own work — they write their own pages and do scoped `AGENTS.md` edits — and merely *attribute coordination* to the dissolved meta plans ("registered in…", "broader sync owned by…"). For those, the edit is citation replacement: drop the attribution, assert self-ownership. Three of them (devtools, persist, ssr-extraction) also have a latent gap — neither they nor `agents-md-sync.md` ever specced adding their symbol to their package `AGENTS.md` exports table; the feature plan now owns that explicitly via Contract.Files. The sixth (resource/cache-observability) cites the "meta/api-reference-pages exception" as a justification for skipping a standalone page — rephrase it to stand on `docs.md` §Template Selection directly (in-place interface extension). Trade-off considered and rejected: leaving the out-of-cluster citations dangling and deleting the meta plans anyway — that breaks the worker (a Contract citing a deleted plan is a broken pointer) and violates the blast-radius non-negotiable.

### Definition of Done
- [x] `plans/store/code/devtools.md` contains no clause deferring to `meta/docs/api-reference-pages.md` or `meta/docs/agents-md-sync.md`; Contract.Files includes the store `AGENTS.md` exports-table entry for `devtools` — verified devtools.md:24,63,106
- [x] `plans/store/code/persist.md` same — no deferral clause; Contract.Files includes the store `AGENTS.md` exports-table entry for `persist` — verified persist.md:24,72,115
- [x] `plans/css/code/ssr-extraction.md` same — no deferral clause at `:66`; Contract.Files includes the css `AGENTS.md` exports-table entry for `extractCSS` — verified ssr-extraction.md:26,66
- [x] `plans/store/code/snapshot-composed-reactivity.md` drops the "broader AGENTS.md regeneration owned by meta/docs/agents-md-sync.md" deferral at `:22,33,82`; the scoped store `AGENTS.md` edit in Contract.Files is the full ownership — verified snapshot-composed-reactivity.md:22,33,82
- [x] `plans/router/code/blocking-guards.md` drops the "broader sync owned by meta/docs/agents-md-sync.md" deferral at `:30,84,132`; the scoped router `AGENTS.md` edit in Contract.Files is the full ownership — verified blocking-guards.md:30,84,90,132
- [x] `plans/resource/code/cache-observability.md:61` stands on `docs.md` §Template Selection (no "meta/api-reference-pages" citation) — verified cache-observability.md:61
- [x] `rg -q "meta/docs/api-reference-pages|meta/docs/agents-md-sync" plans/store/ plans/router/ plans/resource/code/cache-observability.md plans/css/code/ssr-extraction.md` exits 1 (zero matches) — verified exit=1
- [x] `bun lint` exits 0 — verified

## [ ] Delete the three dissolved meta plans
**Type:** Config
**Depends on:** Make the four reset plans self-contained + Rescope test-harness as the consolidation plan + Clean out-of-cluster citation deferrals

### Strategy
Only after every surviving plan has absorbed its transferred ownership (tasks 1–3) can the three meta plans be removed without leaving broken pointers. `api-reference-pages.md` is fully dissolved: reset pages moved into the reset plans, css pages were already owned by css-rename, and `flush` is documented as a pattern in `testing-patterns-doc.md:20-21` (no standalone page). `agents-md-sync.md` is fully dissolved: export-table edits to feature plans, testing-section + root + sync to the consolidation plan. `guides-tests-md.md` is fully dissolved: its rewrite lives in the consolidation plan. A final grep proves no surviving plan cites any of the three, except this reorg plan's own deletion record.

### Definition of Done
- [ ] `plans/meta/docs/api-reference-pages.md` does not exist
- [ ] `plans/meta/docs/agents-md-sync.md` does not exist
- [ ] `plans/meta/docs/guides-tests-md.md` does not exist
- [ ] `rg "api-reference-pages|agents-md-sync|guides-tests-md" plans/` returns matches ONLY inside `plans/meta/misc/reorganize-reset-test-plans.md` (this file's own deletion record) — verified by reading every other match's file path
- [ ] `bun lint` exits 0
