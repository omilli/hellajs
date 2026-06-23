---
name: plan
description: Create a plan or task breakdown using the project template. Use when asked to plan, break down, scope, or sequence work. Classifies each task as Code, Tests, Docs, or Config and writes a strict binary Definition of Done the worker skill can verify.
---

# Plan

Turn a request into one or more typed tasks, each with a binary Definition of Done. Output goes to `./plans/`. The worker skill reads these files and ticks `[ ]` to `[x]`, so the artifact is a contract — its structure and markers must match exactly what the worker expects.

Two files own this skill. This one is the workflow: how to scope, classify, and seed the Definition of Done. `.agents/skills/plan/TEMPLATE.md` is the artifact contract: the file structures, the four type definitions, the hard rules for the artifact, and the Definition of Done seed blocks. Read TEMPLATE.md before writing and copy its structure verbatim. Do not restate its contents here, and do not improvise sections when writing. When the two disagree on artifact shape, TEMPLATE.md wins.

## Before writing

Ask until the scope is unambiguous. Every open question becomes a wrong assumption in the plan, so the only bad question is the one not asked — nail down at minimum which package(s), which files, the public API surface, backward compatibility, and whether tests and docs are in scope. Do not plan into fog.

Size the work before deciding the output shape. A single obvious edit does not need a plan — say so and stop. One task becomes one file under `./plans/`; multiple related tasks become a folder with one file per task. TEMPLATE.md's "Single-task file" and "Multi-task plans" sections define the exact paths, the lowercase-hyphenated no-digits naming, and when typed sub-tasks inside one file are appropriate versus separate files.

## While writing

Classify each task as exactly one type — Code, Tests, Docs, or Config — using the file-scope definitions in TEMPLATE.md. A task is one type, never several: if work spans types, split it into separate task files (preferred) or typed sub-tasks inside one file per TEMPLATE.md's "Multi-task plans" structure. The type determines which Definition of Done seed block to copy.

Seed each task's Definition of Done from the matching block in TEMPLATE.md, drop the items that do not apply, then add task-specific items. TEMPLATE.md's binary-verifiable rule applies to everything you add: an item that cannot be checked by a command that exits 0 or a yes/no question does not belong, because the worker skill ticks it honestly and a tick must mean something verifiable.

## Public API changes

A Code task that touches any public API symbol — anything re-exported by the package's `index.ts` barrel — must include at least one runnable usage example in its Solution, showing the new or changed API from the caller's perspective: how a user imports it, what they pass, and what comes back. New exports, removed exports, renamed exports, and signature changes all count. Inline signature bullets alone are insufficient because they describe shape, not use; the call site is the contract the worker implements against and the Docs task copies verbatim, so it follows the import style and JSDoc conventions in `./guides/code.md`. TEMPLATE.md encodes this as a Definition of Done checkbox; the example itself lives in the Solution. If the task touches no public API, state that explicitly so the checkbox resolves via its "OR" branch.

## The guides are the source of truth

Every Solution, code example, and Definition of Done item follows the matching guide: Code → `./guides/code.md`, Tests → `./guides/tests.md`, Docs → `./guides/docs.md`. Multi-type plans apply each guide to its matching sub-task. A plan that contradicts a guide is wrong by definition even when the DoD otherwise checks out — `bun check` passing does not override a guide violation, because the guides encode decisions the toolchain cannot detect (naming, loop shape, test anti-patterns, doc templates). The worker re-checks this, but catching it here avoids rework.

One consequence worth calling out: a Docs-only task (all touched files are `.md` / `.mdx`) never carries `bun check` or `bun coverage` items — those commands verify code and tests, not prose. TEMPLATE.md's Docs seed block already omits them; do not add them back.

## Self-check before saving

Does every task have exactly one type and a Definition of Done seeded from TEMPLATE.md with only binary-checkable items? Did I ask enough questions to write each Solution without guessing? Does every Solution follow its matching guide? For every Code task touching a public API symbol, does the Solution include a runnable usage example?
