# Memory Update Log

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
