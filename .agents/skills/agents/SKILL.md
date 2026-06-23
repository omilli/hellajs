---
name: agents
description: Optimize an AI-coding AGENTS.md file as a truth-grounded rebuild. Reads lib/ (primary truth), tests/, then docs/ for usage intent, then rewrites the target AGENTS.md choosing XML vs markdown per section to maximize useful signal per token. Proposes the rebuilt file with a change summary; writes only on approval.
---

# Agents

Optimize one AGENTS.md at a time as a truth-grounded rebuild. The existing file is the optimization target, not a source of truth — it may have drifted, and surfacing that drift is part of the job. Truth comes from source, in priority order: `lib/` first (what the code actually does), `tests/` second (which behaviors are actually exercised), `docs/` third (intended usage — assume accurate, but useful mainly to learn how something is meant to be used). When they disagree, `lib/` wins; note the discrepancy. This is a rebuild grounded in what the source contains, not a template to fill.

## Step 1 — Load the truth sources

Ask which AGENTS.md to optimize — the root one, or a specific package / plugin. One file per invocation. Then read, in this order:

a. Every file under the target's `lib/` — the implementation, primary truth. Glob to enumerate, then Read every `.ts` / `.tsx` / `.js` file; `lib/internal/` is included. If a file is large, read it fully — truncated reads produce wrong claims, and an AGENTS.md rebuilt on a partial read is worse than the one it replaces.
b. Every file under `tests/` — which behaviors are actually exercised. Tests reveal the real public contract, separate from what the code happens to do internally.
c. Every file under `docs/` — intended usage and framing. Docs show how things are meant to be used; treat them as accurate unless they contradict `lib/`, in which case `lib/` wins and the doc is flagged.
d. The existing AGENTS.md being optimized — read it last, as the target. Identify what it claims and where those claims are about to be confirmed or refuted by the source above. Reading it after the source prevents anchoring on its framing.

If optimizing a package / plugin AGENTS.md, skim the root `AGENTS.md` for global framing the package file should not duplicate — package files document architecture, not the repo-wide persona.

## Step 2 — Build the fact ledger

Before rewriting, record what the source actually shows, organized by the architectural dimensions relevant to this target (data structures, state machines, key algorithms, performance characteristics, non-obvious behaviors, testing approach). For each entry record the mechanism, the `lib/` evidence that proves it, and one line on why an agent would need to know it — that last line filters out trivia that bloats the file. Pull intended-usage framing from `docs/`, verified against `lib/`.

Every claim in the rebuilt AGENTS.md traces to a ledger entry. A claim without source evidence is exactly the kind of drift this skill exists to remove, so do not carry forward an unverified claim from the old file just because it was there.

## Step 3 — Decide structure per section

The XML / markdown mix is decided here, per content block — not chosen wholesale up front. Two principles decide every call:

- **XML earns its cost when the tag name changes how the agent reads what is inside.** A persona block switches the agent into a posture; a `<rule priority="high">` carries weight the prose alone would not. That semantic load justifies the tokens.
- **Markdown is the cheaper representation whenever the structure is just navigation or labeled facts.** Headers segment, bullets list, tables relate. Nesting those inside XML adds tokens and indentation for zero semantic gain.

Apply these per-content-type defaults:

| Content | Format | Why |
|---|---|---|
| Outermost wrapper + persona / role framing | XML | Boundary switches agent posture — tag name carries semantic weight |
| Major sections (overview, architecture, performance, behaviors) | Markdown `##` headers | Navigation; headers segment as well as XML at lower cost |
| Relational data (field defs, state flags, transitions) | Markdown tables | Name + value + meaning is relational; tables are several times cheaper than nested elements and scan faster |
| Atomic labeled facts (behaviors, optimizations, patterns) | Bold-label bullets (`- **name**: …`) | A label plus a sentence; XML wrappers here are pure ceremony |
| Prose (overview, verdicts) | Plain paragraph | No wrapper needed |

Then run one cleanup pass with a hard rule: **drop every single-child XML element.** A `<thing><field>…</field></thing>` with one child adds nesting and tokens for nothing — collapse it. Single-child wrappers are the most common waste in dense AGENTS.md files, and they are always removable without losing information.

Keep a section only if the ledger has content for it. Drop empty or single-line sections rather than carrying them as scaffolding; add a section the content needs even if the old file lacked it.

## Step 4 — Rebuild the file

Write the new AGENTS.md applying the Step 3 decisions to the Step 2 ledger. Preserve every claim source confirms, fix claims source refutes (drift), fill gaps source exposes but the old file missed, and cut redundancy plus the single-child overhead. Keep persona / role framing for root files; package / plugin files focus on architecture, not persona.

For a root AGENTS.md the same per-section logic applies — the scripts table and the folder-structure map are usually tighter as a real table and a bulleted tree than as nested XML.

## Step 5 — Propose, do not write

Present the rebuilt file in the conversation alongside a concise change summary so the decision to apply is informed. The summary quantifies, with counts: claims fixed for drift (source disagreed), gaps filled (source had, old file missed), XML elements cut as single-child overhead, blocks converted to tables, and the net line / token delta versus the original. Call out anything cut that the user might miss. Do not write the file yet — ask for approval, and offer to revise structure or scope first.

## Step 6 — Apply on approval

On explicit approval, overwrite the target AGENTS.md. If the user requests changes, revise the rebuild and re-propose rather than surgically editing the already-written file — the output is a cohesive rebuild, and ad-hoc patches to a rebuilt file reintroduce the inconsistency it was rebuilt to remove.

## Self-check before proposing

a. Does every claim in the rebuild trace to a `lib/` (or `tests/` / `docs/`) source read this session — nothing carried from the old file on trust?
b. Is every XML element justified by the "tag name carries semantic weight" test, with no single-child elements remaining?
c. Is relational data in tables, and atomic facts in bold-label bullets?
d. Were drift and gaps identified from source, rather than assumed?
e. Does the change summary quantify what changed honestly, including anything cut the user might miss?
