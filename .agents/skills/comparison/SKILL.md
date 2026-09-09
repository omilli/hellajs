---
name: comparison
description: Generate a ground-up comparison doc for a HellaJS package against its market competitors. Use when asked to write, generate, or update a comparison doc for any package. Reads ALL lib/docs/tests source, researches competitors via web, and produces a verified, source-cited comparison following the dom/dom-comparison.md template.
---

# Comparison

One skill, one package at a time. Read every source file the package exposes, research every competitor mapped in `TARGETS.md`, then write a comparison doc where every HellaJS claim cites a `lib/` file and every competitor claim cites a fetched source. Output: `packages/[package]/[package]-comparison.md`. Generating from memory defeats the purpose — a remembered fact reads confidently and is wrong exactly where a reader trusts most; every line is verified against source read this session or fetched live.

## Non-negotiables

The doc feeds `feature`'s discovery (its Step 1g reads it as the primary seed), so an inaccurate claim compounds: feature idea → plan → code. A confidently-wrong comparison is worse than none.

- **Guides are inviolable.** The doc is a `.md` file following `guides/docs.md`, audited as Docs; conflicts surface as guide-update proposals. It cites HellaJS v2 and states competitor versions researched (`docs.md` §Implementation Accuracy).
- **Full blast radius.** Every HellaJS claim cites a `lib/` file read this session; every competitor claim cites a fetched source. A claim carried from memory or the old doc without re-verification is exactly the drift this skill exists to remove.

## Step 1 — Load the package and its targets

Read `./TARGETS.md`, find the package's entry. The targets listed are the only competitors — never add, remove, or substitute without explicit user confirmation (each is chosen to teach something the others don't: dominant leader, closest architectural sibling, or notable minimal-alternative). Package missing from `TARGETS.md` → stop, ask the user.

Then read in parallel: `packages/[package]/AGENTS.md` (architectural ground truth), `README.md` (stated purpose, API surface), `package.json` (deps, entry points), every file under `lib/` including `lib/internal/` (the most important implementation details — read in full; truncated reads produce wrong claims), every file under `docs/`, every file under `tests/` (what is actually exercised).

## Step 2 — Extract the HellaJS facts

Build a fact ledger before writing. Per architectural dimension (see `./TEMPLATE.md` for the list): the mechanism (how HellaJS implements it), the evidence (exact `lib/` file references), the differentiator (unique, faster, or simpler than the obvious competitor approach), and the gap (what HellaJS lacks — honesty is what gives the doc credibility; a comparison that only praises is marketing).

Source facts primarily from `AGENTS.md`'s architecture section, then verify each against the actual `lib/` source. Source wins over AGENTS.md on disagreement — note the discrepancy. An AGENTS.md claim unconfirmable in source is dropped, not carried on trust.

## Step 3 — Research the competitors

Per target: WebFetch the official docs, GitHub README, and npm page. Minimum facts: architectural/reactive model, key features and API shape, known limitations. For framework-attached competitors (Vue Router, Next.js Router, …), research the current major version — knowledge of older versions reads as current and misleads. Note the researched version. A failed/stale fetch → mark that competitor's facts `unverified` in the doc, never fill with a plausible guess.

## Step 4 — Write the comparison doc

Follow `./TEMPLATE.md`'s section structure verbatim — never add, rename, reorder, or skip sections. TEMPLATE.md owns the shape (fixed sequence, domain-section candidates, At-a-Glance labels, structural floors); it points to `packages/dom/dom-comparison.md` as the voice-and-density reference. This list owns voice:

- Present-tense point-in-time snapshot of what each library does and does not do today. No changelog, no "was/now/previously/no longer/once/still/grew to/now ships" framing anywhere — a reader wants current state, not a diff against an earlier version of this doc.
- Every HellaJS behavior claim ends with `(lib/[file].ts)` or `(lib/internal/[file].ts)`. A claim you cannot cite is a claim you cannot make.
- Every competitor claim factual and current; unverified ones marked "per [source]" or `unverified`.
- Tables for at-a-glance scanning, prose for nuance — use both; collapsing into one table loses the reasoning.
- Honest about where HellaJS is weaker, smaller, or less mature — the dom comparison's closing gaps paragraph is the tone.
- Direct, technical, no hedging, no filler; match dom's voice. Cite HellaJS v2 regardless of `package.json`; state competitor versions researched.

## Step 5 — Self-check before saving

a. Every HellaJS claim has a `file` citation actually read this session. b. Pure present tense — none of the banned framing. c. At least one honest gap or weakness. d. Bottom Line differentiators genuinely unique (no single competitor matches all). e. Section structure matches `TEMPLATE.md` exactly. f. `lib/internal/` (if it exists) read in full. Any "no" → fix first. Save to `packages/[package]/[package]-comparison.md`.

## When updating an existing comparison

Re-read all source files (the implementation may have changed), re-verify every citation, re-fetch competitor info, and rewrite as a fresh present-tense snapshot. No previous version exists from the reader's perspective: no carried framing, no changelog, no blindly preserved prose — each claim re-verified against current source.

Run the prime handoff gate; evaluate the `feedback` trigger table literally.
