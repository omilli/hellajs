---
name: plan
description: Create a plan or task breakdown using the project template. Use when asked to plan, break down, scope, or sequence work. Classifies each task as Code, Tests, Docs, or Config and writes a strict binary Definition of Done the worker skill can verify.
---

# Plan

Turn a request into one or more typed tasks, each with a binary Definition of Done. Output goes to `./plans/`. The worker skill reads these files and ticks `[ ]` to `[x]`, so the structure is a contract, not a suggestion.

## Before writing

Ask (as many) questions until the scope is unambiguous. Do not plan into fog or assume you have too many questions. The only bad question is one you don't ask. Every open question becomes a wrong assumption in the plan. Nail down at minimum: which package(s), which files, the public API surface, backward compatibility, and whether tests and docs are in scope. 

Size the work. If it is one obvious edit, say so and do not write a plan. A single task writes to `./plans/[task-name].md`. Two or more related tasks write to `./plans/[plan-name]/[task-name].md` — one file per task, lowercase hyphenated, no digits.

Read the template: `Read .agents/skills/plan/TEMPLATE.md`. Copy its structure verbatim. Do not add, rename, or reorder sections.

## While writing

Classify each task as exactly one type. A task is one type — not several. If work spans multiple types, split it into separate task files (preferred), or typed sub-tasks inside one file per the template's "Multi-task plans" section.

- **Code** — `packages/*/lib/`, `packages/*/src/`, `plugins/**`, `scripts/**` (`.ts` / `.tsx` / `.js` / `.mjs`)
- **Tests** — `packages/*/tests/**`, `*.test.ts`, `*.spec.ts`
- **Docs** — `packages/*/docs/**`, `docs/**`, any `.mdx` / `.md`
- **Config** — `tsconfig*.json`, `eslint.config.*`, `package.json`, `bunfig.toml`, `.npmrc`, `.nvmrc`, `plugins/**/{babel,rollup,vite}/**`, `.github/workflows/**`, any `*.config.{ts,mjs,js}`

Seed each task's Definition of Done from the matching block in TEMPLATE.md, drop the items that do not apply, then add task-specific items. Every DoD item must be either a command that exits 0 or a yes/no question. No prose, no weasel words. If you cannot verify it, do not keep it.

## Hard rules

- No numbered lists anywhere in the plan body. No digits in file names.
- `[ ]` and `[x]` are the only completion markers.
- Do not improvise sections. The template is the template.

## Self-check before saving

Ask: Does every task have exactly one type, a per-type Definition of Done seeded from TEMPLATE.md, and only binary-checkable items? Did I ask enough questions to write each Solution without guessing? Do the solutions follow `./guides/code.md`, `./guides/tests.md`, and `./guides/docs.md`?
