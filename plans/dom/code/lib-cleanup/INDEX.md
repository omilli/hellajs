# [ ] Plan set: lib-cleanup

Trim `packages/dom/lib/` to minimal efficiency — delete redundancy, fold trivia, apply documented perf conventions. Every unit here surfaced from a read of `lib/` this session; each is independently shippable (no hard deps between them).

## Shared scope

- **Package:** dom
- **Goal:** smallest correct change at each root cause; preserve every public behavior. No functionality removed.
- **Verification:** `bun coverage dom` (bundle + coverage + lint) exits 0; `bun lint` exits 0. Per dom `AGENTS.md`, never run bare `bun test` — it tests stale `dist/`.
- **AGENTS.md / CLAUDE.md sync:** every unit that changes a documented internal also edits `packages/dom/AGENTS.md`. CLAUDE.md is generated — never edit by hand (post-commit hook regenerates it).
- **Guide governance:** `guides/code.md` (source), `guides/tests.md` (verification), `guides/docs.md` (doc placement) — invoked per unit as needed.

## Units (decide one by one)

| Unit | Blast radius | Tier | Recommendation |
|---|---|---|---|
| [remove-handlercounts](remove-handlercounts.md) | deletes `internal/counts.ts`; touches `events.ts`, `reset.ts`, AGENTS.md, dom-comparison.md | 1 (redundancy) | **Approve** — strict duplicate, zero behavior change |
| [peekstate-single-lookup](peekstate-single-lookup.md) | touches `cleanup.ts`, `reactive.ts`, `dispatch.ts` | 2 (convention) | **Approve** — applies AGENTS.md:224 mandated rule |
| [tighten-hellachild-type](tighten-hellachild-type.md) | modifies public type `HellaChild`; may break external callers | 4 (type smell) | **Decide fork** — three options laid out in plan |

## Escape-hatch items (trivia — no plan file)

Single-file, single-concept, low-risk. Per brain-plan escape hatch, these do not get plan files; mention "do the escape hatches" and they execute as a batch:

- **Unexport `appendChild`** — `internal/template.ts:174`. Export keyword is dead; all 3 call sites are local. One-keyword delete.
- **Inline `getBoundaryConfig`** — `internal/render.ts:22-26`. One-line wrapper (`peekState(boundary)?.errorConfig`) used 3× in same file. Inline at call sites.
- **Inline `markStaticSubtrees`** — `internal/template.ts:283-289`. Single-call-site 1-line loop wrapper. Fold into `parseHTML` at `:273`.
- **Simplify `INSERT_METHODS`** — `Portal.ts:6-11`. Keys identical to values; replace Record with a `Set` allowlist + direct `target[type]` indexing.
- **Rename `internal/utils.ts`** — generic name for rendering primitives. Cosmetic only; rename ripples to ~5 internal consumers. Lowest priority.

## Dependency graph

No `depends_on` between any units. Plans B and E both touch `internal/dispatch.ts` but on different functions (`findBoundary` vs adding `onError`); if both are pursued, apply B before E to avoid merge friction (soft ordering, not a hard dep).
