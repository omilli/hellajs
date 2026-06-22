---
name: comparison
description: Generate a ground-up comparison doc for a HellaJS package against its market competitors. Use when asked to write, generate, or update a comparison doc for any package. Reads ALL lib/docs/tests source, researches competitors via web, and produces a verified, source-cited comparison following the dom/dom-comparison.md template.
---

# Comparison

One skill, one package at a time. Read every source file the package exposes, research every competitor the package maps to in `TARGETS.md`, then write a comparison doc where every HellaJS claim cites a `file` (line numbers not needed) and every competitor claim cites a source. Output goes to `packages/[package]/[package]-comparison.md`. Never generate this doc from memory — every line is either verified against source or fetched live.

## Step 1 — Load the package and its targets

Read `./TARGETS.md` and find the entry for the requested package. The targets listed there are the only competitors to compare against — do not add, remove, or substitute without explicit user confirmation. If the package is missing from `TARGETS.md`, stop and ask the user which libraries to compare against before continuing.

Then read, in this exact order, and in parallel where possible:

1. `packages/[package]/AGENTS.md` — the architectural ground truth (data structures, algorithms, non-obvious behaviors, performance).
2. `packages/[package]/README.md` — the stated purpose and public API surface.
3. `packages/[package]/package.json` — dependencies, peer deps, and bundle entry points. (Version is always v2 in the doc header regardless of package.json.)
4. Every file under `packages/[package]/lib/` — the actual implementation. This is non-negotiable. Use Glob to enumerate, then Read every `.ts` / `.tsx` / `.js` file. Internal subdirectories (`lib/internal/`) are included.
5. Every file under `packages/[package]/docs/` — documented behavior and examples.
6. Every file under `packages/[package]/tests/` — what behaviors are actually exercised and verified.

Do not skip `lib/internal/`. The most important implementation details (algorithms, data structures, optimizations) live there. If a file is large, read it fully — truncated reads produce wrong claims.

## Step 2 — Extract the HellaJS facts

Build a fact ledger before writing anything. For each architectural dimension relevant to this package (see `TEMPLATE.md` for the dimension list), record:

- The mechanism — how HellaJS implements it.
- The evidence — the exact `file` reference(s) in `packages/[package]/lib/` that prove the mechanism.
- The differentiator — what is unique, faster, or simpler than the obvious competitor approach.
- The gap — what HellaJS lacks that competitors have (be honest; the doc loses credibility without this).

Source the facts primarily from the `AGENTS.md` architecture section (it is the curated ground truth), then verify each one against the actual `lib/` source by reading the cited files. If `AGENTS.md` and the source disagree, the source wins — note the discrepancy in the fact ledger and proceed with the source.

Never cite a claim you have not verified in this session. If a reference from `AGENTS.md` cannot be confirmed in the source, drop the claim or re-locate the correct file.

## Step 3 — Research the competitors

For each target in `TARGETS.md` for this package, gather current facts via web research. Use WebFetch on the competitor's official docs, GitHub README, and npm page. Minimum facts to collect per competitor:

- Reactive / architectural model — how it solves the same problem HellaJS solves.
- Key features and API shape.
- Known limitations or trade-offs.

For framework-attached competitors (e.g., Vue Router, Angular Router, Next.js Router), research the current major version's approach — do not rely on knowledge of older versions. Note the version you researched in the fact ledger.

If a web fetch fails or returns stale info, note it in the ledger and mark that competitor's facts as `unverified` in the doc. Do not fabricate.

## Step 4 — Write the comparison doc

Read `./TEMPLATE.md` and follow its section structure verbatim. Do not add, rename, reorder, or skip sections. The template defines:

1. **Title + intro** — name the competitors, cite HellaJS v2 (the current source code), state that every claim was verified against `packages/[package]/lib/`.
2. **At-a-Glance Summary table** — one row per dimension, one column per library. Dimensions come from the template; adapt the dimension labels to the package's domain (e.g., "Rendering strategy" for dom, "Caching model" for resource, "Styling approach" for css).
3. **Architecture deep-dive** — one `###` subsection per library, ending with a `**Verdict:**` paragraph.
5. **Domain-specific comparison sections** — the template lists candidate sections per package type; include the ones that apply.
6. **Built-in Features Matrix table** — feature × library grid.
7. **Notable HellaJS differentiators** — bulleted list, each with a `file` citation.
8. **Ergonomics & Syntax** — code examples showing HellaJS API.
9. **Bottom Line** — positioning summary, numbered differentiators (only properties no single competitor matches all of), and an honest gaps paragraph.

### Writing rules

- Every claim about HellaJS behavior must end with a citation in the form `(lib/[file].ts)` or `(lib/internal/[file].ts)`. No exceptions. If you cannot cite it, you cannot claim it.
- Every claim about a competitor must be factual and current. If you researched it this session, state it plainly. If you could not verify it, say "per [source]" or mark it unverified.
- Tables are for at-a-glance scanning; prose is for nuance. Use both — do not collapse all comparison into a single table.
- Be honest about where HellaJS is weaker, smaller in ecosystem, or less mature. The dom comparison's final paragraph ("Its gaps are the predictable ones: ecosystem size, SSR, devtools, and adoption maturity") is the tone to match. A comparison that only praises is marketing, not engineering.
- Match the voice of `packages/dom/dom-comparison.md`: direct, technical, no hedging ("HellaJS is the only one here that..."), no filler.
- Use HellaJS v2 regardless of the version in `package.json`. State the competitor versions you researched.

## Step 5 — Self-check before saving

Before writing the file, verify:

1. Does every HellaJS claim have a `file` citation that was actually read this session?
2. Does the doc include at least one honest gap or weakness?
3. Does the "Bottom Line" list differentiators that are genuinely unique (no single competitor matches all)?
4. Does the section structure match `TEMPLATE.md` exactly?
5. Was `packages/[package]/lib/internal/` read in full (if it exists)?

If any answer is no, fix it before saving. Save to `packages/[package]/[package]-comparison.md`.

## When to update an existing comparison

If `packages/[package]/[package]-comparison.md` already exists, treat it as a previous version. Re-read all source files (the implementation may have changed since it was written), re-verify every citation, re-fetch competitor info, and update the doc. Note any claims that were corrected at the top of the updated doc in a one-line changelog entry. Do not blindly preserve old claims — verify them against current source.
