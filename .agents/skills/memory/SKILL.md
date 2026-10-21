---
name: memory
description: >
  Persist a verified decision or confirmed fact/correction to the repo knowledge base, or refresh/retire a stale entry. Use when a memory event fires (a retry after failure, a non-obvious fact confirmed from source/docs, a justified deviation from a stated rule, or a user correction) AND the learning does NOT belong in always-on config. Use ONLY for recallable decisions/facts — a learning that should change an always-on rule belongs to the `feedback` skill, not here.
---

# Memory

Persistent self-improvement layer. The KB is a flat dir of self-contained `memory/NNN-slug.md` entries; the single writer is this skill (via `memory.ts`) — the KB lives at the repo root, data apart from the skill that manipulates it. This skill owns the write side only; the read/discovery protocol is prime's (`rg` over `memory/`). Conservative like `feedback`: most events fail the write gate; that is correct.

**Entry schema:**

    ---
    title: Imperative title (the rule/fact itself)
    description: One-sentence actionable core.
    tags: [discovery, keywords]
    confirmed: YYYY-MM-DD
    ---
    # Why       rationale / what breaks if ignored
    # Evidence  source citation or the passing command

Filename `NNN-slug.md` — slug derived from the title at creation; ID = max existing numeric prefix + 1 (`memory.ts add` allocates both). Entries are self-contained: never reference other entries, never cite plans in any form — `plans/` paths, unit/set names (`Unit-06`), plan provenance — plans are deletable at any time, so every plan citation is a future ghost; evidence cites commands, source, and dates only, never session-relative phrasing ("This session:") — the frontmatter `confirmed` date is the only time anchor; a future reader has no session to resolve the reference against. Quote any frontmatter value containing `: `, leading YAML indicators, or `"`.

**Command form:** `bun .agents/skills/memory/memory.ts <cmd>` (repo KB resolved automatically). Commands: `add "<imperative title>"`, `confirm <id>`, `stale [days=180]`.

## Step 1 — Confirm memory event, not feedback event

A memory event: retry after failure revealed the correct approach; non-obvious fact confirmed against source/docs (not from memory); justified deviation from a stated rule; user correction. Route: rule change → `feedback`. Recallable fact/decision → here. One sink per event; if both apply, feedback takes the rule, memory takes the residual fact.

## Step 2 — Apply the write gate

Write only if ALL hold: verified this session against source, a passing check, or an explicit user statement (never inference); load-bearing (recalling it later changes an action or avoids rework); not already captured (grep `memory/` first — duplicates merge, not multiply). Any fails → do not write.

## Step 3 — Write the entry

`memory.ts add "<imperative title>"` allocates the ID, derives the slug, and writes the template (title + today's `confirmed` pre-filled); fill `description`, `tags`, and the body in the file afterward. Done — the file is the only artifact; nothing else to regenerate.

## Step 4 — Refuted or reversed → delete

The entry's claim is false, or the decision/ritual it records is undone → delete the entry file outright and author the corrected fact fresh via Step 3 when it is worth keeping — a new self-contained entry, never a reference to what was deleted. Still true but the evidence drifted (stale line refs, renamed symbols) → Step 5's in-place fix, never deletion. Never leave two entries that disagree.

## Step 5 — Refresh on staleness

`memory.ts stale [days=180]` lists candidates, oldest first. Each: re-verify against current source before trusting. Still true → `memory.ts confirm <id>` (bumps `confirmed` to today) plus the in-place drift fix; false or reversed → Step 4.

## Self-check

Memory event, not a feedback rule change; write gate passed (verified + load-bearing + non-duplicate); entry self-contained (no cross-references, no plan citations — paths, unit/set names, or provenance — no session-relative phrasing); refuted → file deleted, correction authored fresh.
