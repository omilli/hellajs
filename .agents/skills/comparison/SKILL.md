---
name: comparison
description: Generate a ground-up comparison doc for a HellaJS package against its market competitors. Use when asked to write, generate, or update a comparison doc for any package. Reads ALL lib/docs/tests source, researches competitors via web, and produces a verified, source-cited comparison following the dom/dom-comparison.md template.
---

# Comparison

One skill, one package at a time. Read every source file the package exposes, research every competitor the package maps to in `TARGETS.md`, then write a comparison doc where every HellaJS claim cites a `file` and every competitor claim cites a source. Output goes to `packages/[package]/[package]-comparison.md`. Generating this doc from memory defeats the purpose — a remembered fact reads confidently and is wrong in exactly the places a reader trusts most, so every line is verified against source read this session or fetched live.

## Non-negotiables

Two rules govern this skill absolutely. The comparison doc feeds `feature`'s discovery (Step 1h reads it as the primary seed for competitor-driven ideas), so an inaccurate claim compounds: it becomes a feature idea, which becomes a plan, which becomes code. A comparison that reads confidently and is wrong in the places a reader trusts most is worse than no comparison.

**Guides are inviolable.** The comparison doc follows `guides/docs.md` — it is a `.md` file, audited as Docs. A conflict with the guide surfaces as a guide-update proposal, never a silent workaround. The doc cites HellaJS v2 and states competitor versions researched, per `docs.md` §Implementation Accuracy.

**Every change carries its full blast radius.** Every HellaJS claim cites a `lib/` file read this session; every competitor claim cites a fetched source. A claim carried from memory or from an old version of the doc without re-verification is exactly the drift this skill exists to remove. A stale gap row that may have driven a shipped feature is caught by re-verifying the claim against current source — comparison docs carry no changelog and no "was this / now this" narrative; the present-tense rule is set in Step 4.

## Step 1 — Load the package and its targets

Read `./TARGETS.md` and find the entry for the requested package. The targets listed there are the only competitors to compare against — do not add, remove, or substitute without explicit user confirmation, because each target is chosen to teach the reader something the others do not (dominant leader, closest architectural sibling, or notable minimal-alternative). If the package is missing from `TARGETS.md`, stop and ask the user which libraries to compare against before continuing.

Then read, in parallel where possible:

a. `packages/[package]/AGENTS.md` — the architectural ground truth (data structures, algorithms, non-obvious behaviors, performance).
b. `packages/[package]/README.md` — the stated purpose and public API surface.
c. `packages/[package]/package.json` — dependencies, peer deps, and bundle entry points. The doc header always cites HellaJS v2 regardless of the version here.
d. Every file under `packages/[package]/lib/` — the actual implementation (Glob to enumerate, then Read every `.ts` / `.tsx` / `.js` file; `lib/internal/` is included).
e. Every file under `packages/[package]/docs/` — documented behavior and examples.
f. Every file under `packages/[package]/tests/` — what behaviors are actually exercised and verified.

`lib/internal/` holds the most important implementation details (algorithms, data structures, optimizations), so read it in full. If a file is large, read it fully — truncated reads produce wrong claims.

## Step 2 — Extract the HellaJS facts

Build a fact ledger before writing anything. For each architectural dimension relevant to this package (see `./TEMPLATE.md` for the dimension list), record:

- The mechanism — how HellaJS implements it.
- The evidence — the exact `file` reference(s) in `packages/[package]/lib/` that prove the mechanism.
- The differentiator — what is unique, faster, or simpler than the obvious competitor approach.
- The gap — what HellaJS lacks that competitors have. Honesty here is what gives the doc credibility; a comparison that only praises is marketing.

Source the facts primarily from the `AGENTS.md` architecture section (the curated ground truth), then verify each one against the actual `lib/` source by reading the cited files. If `AGENTS.md` and the source disagree, the source wins — note the discrepancy in the ledger and proceed with the source. A claim from `AGENTS.md` that cannot be confirmed in the source is dropped or re-located, not carried on trust — citations only mean something if every one was opened this session.

## Step 3 — Research the competitors

For each target in `TARGETS.md` for this package, gather current facts via web research. Use WebFetch on the competitor's official docs, GitHub README, and npm page. Minimum facts per competitor:

- Reactive / architectural model — how it solves the same problem HellaJS solves.
- Key features and API shape.
- Known limitations or trade-offs.

For framework-attached competitors (Vue Router, Angular Router, Next.js Router, etc.), research the current major version's approach — knowledge of older versions reads as current and misleads the reader. Note the version you researched in the ledger. If a web fetch fails or returns stale info, mark that competitor's facts as `unverified` in the doc rather than filling the gap with a plausible-sounding guess.

## Step 4 — Write the comparison doc

Read `./TEMPLATE.md` and follow its section structure verbatim — do not add, rename, reorder, or skip sections. TEMPLATE.md owns the doc shape: the fixed section sequence, the domain-specific section candidates per package, the At-a-Glance dimension labels, and the structural hard rules (sequential numbering, a paragraph minimum per `###`, the features-matrix row floor, the Bottom Line differentiator and gap floors, pipe tables). It points to `packages/dom/dom-comparison.md` as the voice-and-density reference.

What follows is how to write the prose that fills those sections — TEMPLATE.md owns structure, this list owns voice:

- Write the doc as a point-in-time present-tense snapshot of what each library does and does not do today. No changelog, no "was this / now this," no "previously / no longer / once / still / grew to / now ships" framing anywhere — a reader comparing libraries wants the current state, not a diff against an earlier version of this doc. When updating an existing comparison, rewrite the prose fresh; carry no historical framing forward and annotate no delta (Step 5 checks for it).
- Every claim about HellaJS behavior ends with a citation in the form `(lib/[file].ts)` or `(lib/internal/[file].ts)`. A claim you cannot cite is a claim you cannot make — the citation is the only thing distinguishing this doc from an opinion piece.
- Every competitor claim is factual and current. State researched facts plainly; mark unverified ones "per [source]" or `unverified`.
- Tables are for at-a-glance scanning; prose is for nuance. Use both — collapsing everything into one table loses the reasoning a comparison exists to convey.
- Be honest about where HellaJS is weaker, smaller in ecosystem, or less mature. The dom comparison's final paragraph ("Its gaps are the predictable ones: ecosystem size, SSR, devtools, and adoption maturity") is the tone to match.
- Match the voice of `packages/dom/dom-comparison.md`: direct, technical, no hedging ("HellaJS is the only one here that..."), no filler.
- Cite HellaJS v2 regardless of the version in `package.json`, and state the competitor versions you researched.

## Step 5 — Self-check before saving

Before writing the file, verify:

a. Does every HellaJS claim have a `file` citation that was actually read this session?
b. Does the doc read as present tense — no changelog, no "was / now / previously / no longer / once / still / grew to / now ships" framing anywhere?
c. Does the doc include at least one honest gap or weakness?
d. Does the Bottom Line list differentiators that are genuinely unique (no single competitor matches all)?
e. Does the section structure match `./TEMPLATE.md` exactly — no added, renamed, reordered, or skipped sections?
f. Was `packages/[package]/lib/internal/` read in full (if it exists)?

If any answer is no, fix it before saving. Save to `packages/[package]/[package]-comparison.md`.

## When to update an existing comparison

If `packages/[package]/[package]-comparison.md` already exists, re-read all source files (the implementation may have changed since it was written), re-verify every citation, re-fetch competitor info, and rewrite the doc as a fresh present-tense snapshot. There is no previous version from the reader's perspective, so carry over no "was / now / previously / no longer" framing and note no changelog — a comparison describes what each library does today, not what this doc used to say. Do not blindly preserve old prose either; verify each claim against current source and rephrase it present-tense.
