---
name: docs-writer
description: >
  Write or revise user-facing package documentation (docs/ api, concept, and pattern pages, index.mdx, examples' tutorial.mdx) — the production counterpart to `guides/docs.md` (rules) and `audit-docs` (grading). Method: read the source contract, frame by reader task, draft example-first, hold internals to the budget, verify with the docs guards. Use when authoring, rewriting, or substantively revising package docs. Use ONLY for producing docs — grading docs against the rules → `audit-docs`, comparison docs → `comparison`, agent-instruction files (AGENTS.md, guides, skills) → `author`.
---

# Docs-writer

Produce docs a developer new to HellaJS can consume top-down. `guides/docs.md` owns the rules — templates, paths, snippet conventions, typography, the §Verification Checklist; this skill owns the method that reaches them in one pass. audit-docs grades the result; this skill writes it.

## Step 1 — Read the source contract

Never write from another doc or from memory. Open the export's implementation and tests under `lib/` and `tests/`, and extract:

- **Observable behavior** — what changes in the DOM/output for each input; what the reader sees and when.
- **The full call surface** — params, overloads, defaults, return shape. `## API` claims match `lib/index.ts`'s export, never a stale sibling doc.
- **Contracts the reader must act on** — dispose/cleanup duties, ordering requirements, error paths, mismatch behaviors.

## Step 2 — Frame the reader task

One sentence: "The reader wants to ___." It names the one-line description and the opening example. If the sentence describes the library instead of the reader, reframe before drafting. Reuse vocabulary the package's concept docs already taught; define anything new at first use.

## Step 3 — Draft example-first

Follow the doc type's template in `guides/docs.md`; per topic: runnable example, then prose naming what the example shows, then constraints the code cannot show. The opening example is the smallest complete use case, copy-pasteable, with imports. Advanced compositions and edge cases follow the basics, never open the doc (§Content Strategy → Progressive Depth). A new, renamed, or moved page updates its website wrapper and `nav.ts` registration in the same pass (§Website Wrapper Pages).

## Step 4 — Hold the internals budget

Every candidate internal fact takes the test: does knowing this change what the reader writes, calls, or debugs? Passes → state the observable behavior plus the required action; the mechanism gets at most one clause. Fails → cut it, including design rationale and machinery names. A fact the reader must act on is a contract: document it as behavior (§Content Strategy → Internals Budget).

## Step 5 — Verify

- **Guards**: `vp run doc-snippets`, `vp run lint:structure`, `vp run doc-links`, `vp run em-dash` (AGENTS.md §Scripts).
- **Accuracy**: re-read every claim against the Step 1 source read; every code block against the exported signatures.
- **Checklist**: tick `guides/docs.md` §Verification Checklist for the doc type.

Revising an existing doc: the example-first template order applies to every doc touched — never preserve legacy `## API`-first order in a revised doc.

## Self-check

Source read before writing; opening example runnable and smallest-complete; every internal fact passed the budget test; guards green; checklist ticked.

Run the prime handoff gate; clean run → nothing downstream.
