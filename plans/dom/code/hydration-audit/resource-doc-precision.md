# [x] Unit 3 — tighten the resource "no-ops on the server" claim to scope `run()`

## Scope

- **Gap (C6, Minor — Misleads):** `packages/ssr/AGENTS.md` Non-obvious behaviors headlines "**`resource` no-ops on the server.**" In reality only `run()` is guarded (`packages/resource/lib/resource.ts:175`); `mutate()` (`resource.ts:423`) is NOT guarded — a server-side `r.mutate(...)` would proceed to fetch. The resource docs are already precise (`packages/resource/docs/api/resource.mdx:452`: "`run()` exits before fetching"; `packages/resource/AGENTS.md:25`: scoped to `run()`); the looseness is only in the ssr AGENTS headline.
- **Decision (resolved in-unit):** do NOT guard `mutate()`. `mutate` is user-initiated, not render-time — during an SSR render there is no caller invoking it. Guarding would add a branch to a path the SSR story never exercises, and would silently drop user-issued mutations elsewhere. The fix is doc precision, not a code guard.
- **Surface: no** — AGENTS.md edit only (source of truth; `bun sync` regenerates mirrors via the post-commit hook — do NOT run manually).
- **Type:** Docs (agent-facing source of truth).

## [x] Docs

**Files:** `packages/ssr/AGENTS.md` — the "`resource` no-ops on the server" bullet in Non-obvious behaviors.

**Delta:** rephrase the headline to scope `run()` and note `mutate()` is intentionally unguarded:

```markdown
- **`resource` render-fetches no-op on the server.** `run()` guards with `hasWindow()` — resources embedded in a server-rendered tree never trigger network calls. `mutate()` is intentionally UNGUARDED: it is user-initiated (not render-time), so an SSR render never invokes it; guarding would silently drop legitimate mutations. Fetch server-side data with direct `fetch()` and pass it as `initialData`.
```

**Strategy:** keep the one-line headline accurate ("render-fetches no-op"), then spell out the `run()` scope and the deliberate `mutate()` exclusion so a future reader reads it as a considered decision, not an oversight. Matches the precision already in `resource.mdx:452` and `resource/AGENTS.md:25`. The resource docs themselves need no change (already scoped to `run()`).

**DoD:**

- [x] `packages/ssr/AGENTS.md` Non-obvious behaviors bullet rephrased to scope `run()` and document the intentional `mutate()` exclusion. — `packages/ssr/AGENTS.md:39` "render-fetches no-op" headline + the `mutate()` UNGUARDED note.
- [x] No change to `packages/resource/docs/api/resource.mdx` or `packages/resource/AGENTS.md` (already precise — verified `resource.mdx:452`, `resource/AGENTS.md:25`).
- [x] No `mutate()` code change (guarding explicitly rejected — reasoning recorded in §Considered and rejected).

## Blast radius

- AGENTS.md edit → the post-commit hook + CI run `bun sync` and regenerate `CLAUDE.md` + `.github/instructions/*` mirrors. Never run `bun sync` manually (AGENTS.md §Source of truth & sync).
- No public surface change; no test change; no `lib/` change.

## Verification

- [x] `rg 'no-ops on the server' packages/ssr/AGENTS.md` returns the rephrased line (scoped to `run()`). — verified: bullet now reads "render-fetches no-op on the server."
- [x] `bun coverage resource` green — unchanged (no code change). — baseline 190/190; no resource `lib/` edit this unit.

## Considered and rejected

- **Guard `mutate()` with `hasWindow()`.** Rejected: `mutate` is user-initiated; an SSR render never calls it. A guard adds a dead branch to a non-render path and would silently swallow legitimate mutations invoked outside a render. The doc-precision fix captures the intent without the behavioral risk.
