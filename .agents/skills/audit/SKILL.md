---
name: audit
description: Audit source code, tests, config, or documentation against the project style guides. Use when asked to review, critique, grade, or audit any .ts/.tsx, .test.ts, .mdx/.md, tsconfig/eslint/package.json, or build plugin file — auto-detects the content type and applies the matching guide from ./guides/.
---

# Audit

One audit skill, four content types. Detect what you were given, read the matching guide, run that type's audit job, then assess the guide itself. Never read all four guides — only the one that matches the input.

## Step 1 — Detect the content type

Classify each input file (or the dominant type of a batch) using the strongest signal first. State the detected type explicitly at the top of the audit before continuing.

| Type | Strongest signal | Path signals | Content signals |
|------|------------------|--------------|-----------------|
| **Tests** | `*.test.ts` / `*.spec.ts` extension, or any path under `*/tests/` | `packages/*/tests/**` | `from "bun:test"`, `describe(`, `test(`, `expect(`, `mock(` |
| **Docs** | `.mdx` / `.md` extension, or any path under `*/docs/` or `docs/` | `packages/*/docs/**`, `docs/src/pages/**` | frontmatter (`---\ntitle:`), prose with fenced code blocks |
| **Config** | Any `tsconfig*.json`, `eslint.config.*`, `package.json`, `bunfig.toml`, `.npmrc`, `.nvmrc`, `*.config.{ts,mjs,js}`, or a path under `plugins/**/{babel,rollup,vite}/**` or `.github/workflows/**` | root config files, `plugins/**`, `.github/**` | `"compilerOptions"`, `rules:` with eslint plugin refs, `"scripts":`, build-plugin `export default` hook shape |
| **Code** | `.ts` / `.tsx` / `.js` / `.mjs` under `lib/`, `src/`, `plugins/`, or `scripts/` | `packages/*/lib/**`, `plugins/**`, `scripts/**` | `export function`, JSDoc, `@hellajs/` imports |

Precedence for ambiguous files:

- A `.test.ts` / `.spec.ts` file is always **Tests** — even if it sits outside `tests/`.
- An `.mdx` / `.md` file is always **Docs** — even if it contains a lot of code.
- A `tsconfig*.json`, `eslint.config.*`, `package.json`, or `*.config.{ts,mjs,js}` file is always **Config** — even if it lives next to source.
- Files under `examples/` are **Real World Examples** (they document usage), not source code.
- If a batch mixes types, audit each file against its own guide. Do not collapse them into one pass.

## Step 2 — Read the matching guide

Read exactly one:

- **Tests** → `./guides/tests.md`
- **Docs** → `./guides/docs.md`
- **Config** → `./guides/code.md` (no dedicated `./guides/config.md` exists yet; config files follow `code.md`'s conventions — double quotes, semicolons, no external deps, strict typing — plus the Config-specific checks below)
- **Code** → `./guides/code.md`

## Step 3 — Run the audit job

Rules common to every type:

- Be critical but constructive. Justify every finding with a specific example quoted from the input.
- Do not suggest things for the sake of it. If the input already follows the guide, say so explicitly.
- For every issue, propose one concrete, actionable change that would bring the input into compliance.

Type-specific additions:

- **Tests** — After the qualitative pass, run `bun coverage` and report any missing lines or untested scenarios. Cross-check the tests against the source they cover: does each test assert a behavior the source actually exposes?
- **Docs** — Cross-check for accuracy against the current source code and tests. Flag any code example that does not reflect actual behavior, any signature that has drifted, and any claim contradicted by the implementation.
- **Config** — Cross-check the config against actual usage. For `package.json`: every entry in `scripts` referenced by a workflow or another script must exist and resolve. For `tsconfig*`: path mapping must match the package layout, and nothing weakened `strict`. For `eslint.config.*`: no rule may contradict `./guides/code.md` (e.g., banning double quotes or allowing missing semicolons). For build plugins (`babel` / `rollup` / `vite`): the exported hook shape must match its stated purpose and the runtime it targets. Flag any unjustified new runtime dependency and any orphaned or renamed script.
- **Code** — No extra step beyond the common rules. The style guide is the source of truth.

## Step 4 — Assess the style guide itself

Decide (very critically) whether the guide you just applied is accurate and up-to-date. If you find any rule that is wrong, stale, contradicted by the real codebase, or missing for a case this audit had to resolve, propose a specific edit to that guide. Justify each proposal with clear reasoning and examples.

Never reference explicit package code when proposing guide edits — reference general practices and principles only.
