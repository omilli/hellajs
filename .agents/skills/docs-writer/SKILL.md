---
name: docs-writer
description: >
  Write or revise user-facing documentation (docs/ api, concept, and pattern pages, index.mdx, examples' tutorial.mdx, site-authored pages) in the plain-language shape of the reference page `packages/core/docs/concepts/reactivity.mdx`: short plain sentences, lead-then-example sections, results in code comments, no jargon, no mechanism, no emphasis. Carries the prose content rules in `rules/` (one file per rule, before/after pairs) and the method that reaches them plus `guides/docs.md` (structure, mechanics) in one pass; audit-docs grades the result. Use when authoring, rewriting, or substantively revising package docs, including the plain-language overhaul plans under `plans/*/docs/`. Use ONLY for producing docs: grading against the rules → `audit-docs`, comparison docs → `comparison`, agent-instruction files (AGENTS.md, guides, skills) → `author`.
---

# Docs-writer

Produce docs a developer new to HellaJS reads top-down and understands on one pass. `packages/core/docs/concepts/reactivity.mdx` is the reference page: every other page is written to its shape. Ownership splits three ways. `guides/docs.md` owns structure and mechanics: templates, paths, links, fences, typography, the §Verification Checklist. This skill's `rules/` owns the prose content rules: one file per rule, the Incorrect passage quoted from a current doc, the Correct passage in the reference page's shape. This file owns the method that reaches both in one pass. audit-docs grades the result.

## Content rules

Read `rules/<file>.md` before drafting a section it governs; the one-liners below are the index. Every rule cites the reference-page section that exemplifies it; `_template.md` is the authoring contract for a new rule.

| Prefix | Category | Impact |
|---|---|---|
| lead | Page and section openings | HIGH |
| shape | Section and example shape | HIGH |
| sent | Sentences, words, emphasis, mechanism | HIGH / MEDIUM |
| code | Example code comments | MEDIUM |

### Page and section openings (lead)

- `lead-page-opener` - Open with what the reader does and gets: no feature list, no selling, no mechanism
- `lead-section-titles` - Name the topic in five words or fewer: no scaffolds, no mechanism claims

### Section and example shape (shape)

- `shape-lead-example-gaps` - Every section runs lead, example, gaps; never list-first or heading-into-fence
- `shape-smallest-first` - The first example is the smallest complete use case

### Sentences (sent)

- `sent-short-sentences` - One idea per sentence (two clauses, 30 words); 1-3 sentences per paragraph
- `sent-plain-words` - Define or replace every technical word; never two undefined terms in a sentence
- `sent-no-emphasis` - Bold and italics never teach; rewrite the sentence or move the contrast into ❌/✅ comments
- `sent-behavior-not-mechanism` - What the reader sees and does; never how the library does it or why it was designed so

### Example code (code)

- `code-comments-carry-output` - The result sits in a trailing comment on the line that produces it; prose never restates it

Guide-owned, not duplicated here: API names in prose (backticked, first mention linked, concept nouns plain: §Cross-References → API Names in Prose), the Internals Budget test (§Content Strategy), comment and assertion conventions (§Code Examples).

## Step 1 — Read the source contract

Never write from another doc or from memory. Open the export's implementation and tests under `lib/` and `tests/`, and extract:

- **Observable behavior** — what changes in the DOM/output for each input; what the reader sees and when.
- **The full call surface** — params, overloads, defaults, return shape. `## API` claims match `lib/index.ts`'s export, never a stale sibling doc.
- **Contracts the reader must act on** — dispose/cleanup duties, ordering requirements, error paths, mismatch behaviors.

## Step 2 — Frame the reader task

One sentence: "The reader wants to ___." It names the opener (`rules/lead-page-opener.md`) and the opening example. If the sentence describes the library instead of the reader, reframe before drafting. Reuse vocabulary the package's concept docs already taught; define anything new at first use (`rules/sent-plain-words.md`).

## Step 3 — Draft in the reference shape

Follow the doc type's template in `guides/docs.md`. Write every section as lead, example, gaps (`rules/shape-lead-example-gaps.md`): one or two plain sentences, a block whose comments carry each result (`rules/code-comments-carry-output.md`), then only what the code cannot show. The opening example is the smallest complete use case (`rules/shape-smallest-first.md`); advanced compositions and edge cases follow the basics. API names in prose take exactly one of three forms (§Cross-References → API Names in Prose). A new, renamed, or moved page updates its website wrapper and `nav.ts` registration in the same pass (§Website Wrapper Pages).

## Step 4 — Hold the internals budget

Every candidate internal fact takes the test: does knowing this change what the reader writes, calls, or debugs? Passes → state the observable behavior plus the required action; the mechanism gets at most one clause. Fails → cut it, including design rationale and machinery names (`rules/sent-behavior-not-mechanism.md`). A fact the reader must act on is a contract: document it as behavior (§Content Strategy → Internals Budget).

## Step 5 — Pass the sentence rules

Read every prose paragraph against `rules/sent-short-sentences.md`, `rules/sent-plain-words.md`, and `rules/sent-no-emphasis.md`: split sentences past two clauses or thirty words, break paragraphs past three sentences, define or replace each library word, strip every bold and italic. A paragraph still technical after this pass is rewritten from the behavior, not patched word by word.

## Step 6 — Verify

- **Guards**: `vp run doc-snippets`, `vp run lint:structure`, `vp run doc-links`, `vp run em-dash` (AGENTS.md §Scripts).
- **Content rules**: a prose probe over the page (paragraphs over three sentences, sentences over thirty words, headings over five words or scaffolded, heading into list/fence/table, emphasis in prose, internals vocabulary, re-linked API names) reads zero, or every remaining hit is a cited template exception. Plan contracts carry their own probe; `plans/` is not an artifact class the probe sweeps.
- **Accuracy**: re-read every claim against the Step 1 source read; every code block against the exported signatures.
- **Checklist**: tick `guides/docs.md` §Verification Checklist for the doc type, the Prose block included.

## Revising an existing page

Rewrite top-down, never patch in place: opener, titles, section leads and examples first (Steps 2-3), then the sentence pass (Step 5) over the whole page. Sync the wrapper lead with the new opener in the same pass: `description:` in a `.mdx` wrapper, the `<p>` lead in a ui `.astro` page, `const description` in a headless `.astro` page. The example-first template order applies to every doc touched; legacy `## API`-first order goes.

## Self-check

Source read before writing; opener states what the reader does and gets; every heading names its topic in five words or fewer; every section runs lead, example, gaps; first example smallest-complete; one idea per sentence, three sentences per paragraph at most; every library word defined or replaced; no bold or italics in prose; no mechanism or rationale; every result in a trailing comment; every internal fact passed the budget test; wrapper lead synced; guards green; checklist ticked.

Run the prime handoff gate; clean run → nothing downstream.
