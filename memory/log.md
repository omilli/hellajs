# Memory Update Log

## 2026-07-28
* **Creation**: Added concept [025](entries/025.md) (type: decision).

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
