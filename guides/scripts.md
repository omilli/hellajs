# Scripts Style Guide

Build tooling and CI automation under `scripts/`. These are NOT the shipped runtime — they run under `bun` in development and CI to bundle, test, lint, sync, and release the packages. Different priorities apply than `code.md` (no hot-path performance concern), but the same typographic discipline (double quotes, semicolons, 2-space indent, JSDoc, no `any`) keeps the whole repo feeling uniform.

This guide governs `scripts/**/*.ts` and `utils/**/*.ts` (the test preload). Config files (`tsconfig*`, `eslint.config.*`, `package.json`, `bunfig.toml`) follow `code.md` plus the Config checklist at the end of `code.md`.

## Decision Precedence

When rules conflict, resolve in this order:

1. **Correctness** — a broken build script blocks every package. It must produce valid output and exit non-zero on failure.
2. **Clarity** — build tooling is read infrequently and must be obvious when it is. Maintainability beats cleverness here more than in the runtime.
3. **Brevity / DRY** — the try/catch/exit boilerplate, the CLI-arg parse, the package enumeration are shared once in `utils/`, never duplicated per script.
4. **Backward compatibility** — scripts are internal (not shipped), so breaking changes are fine if the root `package.json` scripts entry still resolves.

Performance is **off the list**. Scripts are not hot paths. `for…of`, temporary allocations, and readable iteration are all fine here — `code.md`'s cached-`while`-loop rule does NOT apply to scripts.

## Language and runtime

- **TypeScript, not `.mjs` / `.js`.** Bun runs `.ts` natively — zero build step, and the lint tsconfig already includes `scripts/**`. Migration from `.mjs`/`.js` is the target state; new scripts are `.ts`.
- **`bun` and `bunx`, never `node` or `npx`.** Invoke external tools (`esbuild`, `terser`, `tsc`) via `bunx` or direct binary paths. No `#!/usr/bin/env node` shebangs — scripts are invoked as `bun ./scripts/[name].ts`, so a shebang is misleading.
- **Node builtins are allowed** — `node:fs`, `node:path`, `node:child_process`, `node:crypto`, `node:os`, `node:zlib`. Scripts are not the shipped runtime; `code.md`'s "no external dependencies" rule does not apply. Dev dependencies (`esbuild`, `terser`, `typescript`, `mitata`) are the justified exceptions, declared as root `devDependencies`.

## Canonical paths

| Artifact | Path | Notes |
|---|---|---|
| Top-level script (CLI entry) | `scripts/[name].ts` | One entry per `package.json` scripts row |
| Shared helper | `scripts/utils/[concern].ts` | Single noun (`fs`, `exec`, `logger`, `paths`) |
| Utils barrel | `scripts/utils/index.ts` | Re-exports every helper; the only import path scripts use |
| Test preload | `utils/happydom.js` | The one non-scripts JS file; governed here for style |

`scripts/utils/common.js` (the backward-compat re-export shim) is dead weight once `index.ts` exists — do not recreate it. One barrel, one import path.

## File-structure decision tree

```
New script or helper?
├─ CLI entry invoked from package.json "scripts"
│   └─ scripts/[name].ts — thin: parse args, call the pipeline, report, exit
├─ Shared logic used by 2+ scripts
│   └─ scripts/utils/[concern].ts — single noun, re-exported by utils/index.ts
├─ A concern that is large (caching, esbuild, terser, declarations, orchestration)
│   └─ scripts/[pipeline]/[concern].ts — split by concern, NOT one giant file
└─ A file exceeding ~300 lines
    └─ Split on a concern seam; build pipelines are several concerns stitched, not one module
```

The canonical case for splitting is `bundle.mjs` (875 lines today): caching, esbuild bundling, terser optimization, minified-import fixing, declaration generation, artifact validation, size metrics, and parallel dependency-ordered orchestration are eight concerns. The target is `scripts/bundle/` with one file per concern and a thin `scripts/bundle.ts` entry that calls them in order. See `scripts/AGENTS.md` for the full target layout.

## Rules

### Functions & modules

- JSDoc on every function — same rule as `code.md`. Build scripts are read rarely; the JSDoc is often the only documentation.
- One concern per file. A script that does caching AND bundling AND validation is three files.
- Thin CLI entries: the top-level `scripts/[name].ts` parses args, calls the pipeline, reports, and exits. The pipeline logic lives in `scripts/[pipeline]/` or `scripts/utils/`.
- No `globalThis` mutations to pass data between scripts. If `bundle` produces data `coverage` consumes, that crosses a process boundary — use a written file (`dist/sizes.json`) or a returned typed value, not `globalThis._buildSummary`.

### Shared utils — use them, do not reimplement

| Util | Purpose | Use instead of |
|---|---|---|
| `logger` (`utils/logger.ts`) | `info` / `success` / `warn` / `error` with consistent prefixes | bare `console.log` / `console.error` |
| `execCommand` (`utils/exec.ts`) | spawn + timeout + captured stdout/stderr | raw `child_process.spawn` |
| `execCommandInherited` | spawn with inherited stdio (terminal passthrough) | raw `child_process.spawn` |
| `ensureDir` / `readJson` / `writeJson` / `scanDirRecursive` / `fileExists` (`utils/fs.ts`) | fs helpers | raw `node:fs` ceremony |
| `projectRoot` / `packagesDir` / `pluginsDir` / `getPackagePath` (`utils/paths.ts`) | resolved paths | `path.resolve(process.cwd())` per file |
| `getPackageInfo` / `isValidPackage` (`utils/packages.ts`) | package enumeration + metadata | ad-hoc `fs.readdir` + filter |

A script that re-implements what a util already does is a DRY violation and a drift source.

### Error handling

- `process.exit(1)` on failure — non-zero exit is how CI detects a broken step.
- One try/catch at the top-level `main()`, not scattered per function. Library functions in the pipeline throw; the entry catches and exits.
- Errors carry the command and args that failed (see `execCommand`'s error messages) — a bare "command failed" is unactionable in CI logs.

### CLI argument parsing

- Consistent pattern: the first non-`--` arg is the package name; `--flag` args are booleans; `--key=value` args are options. Extract this once in `utils/` if more than two scripts parse args.
- Validate the package name via `isValidPackage` before any work — fail fast with a clear message, not a stack trace from a missing directory.

### Dependency graph

- Derive build order and dependencies from each package's `package.json`, not a hardcoded `DEPENDENCY_GRAPH` / `BUILD_ORDER` constant. A hardcoded graph drifts the moment a package adds or removes a dependency. Read the `dependencies` / `peerDependencies` of each `packages/*/package.json` and topologically sort.

### Style (shared with code.md)

- Double quotes, semicolons always, 2-space indentation (NOT tabs).
- `import type` separated; `node:` prefixed builtins.
- No `any` — `unknown` and type-narrow. `catch (error)` gives `unknown` under strict; narrow before `.message`.
- JSDoc `@param` / `@returns` with TS types, not `{string}` / `{Object}` JSDoc-style annotations.

## Verification Checklist

Run this when holding a scripts file (`scripts/**/*.ts`, `utils/**/*.ts`). Each item is a yes/no or a command.

**Structure**
- [ ] File is `.ts`, not `.mjs` / `.js` (test preload `utils/happydom.js` excepted)
- [ ] One concern per file; CLI entries are thin (parse → call → report → exit)
- [ ] No `globalThis` mutations for inter-script data
- [ ] A file over ~300 lines is split on a concern seam
- [ ] No `common.js`-style backward-compat shim duplicating the `index.ts` barrel

**Runtime**
- [ ] No `node` or `npx` invocations — `bun` / `bunx` only
- [ ] No `#!/usr/bin/env node` shebangs
- [ ] External tools (`esbuild`, `terser`, `tsc`) invoked via `bunx` or direct binary path

**Utils usage**
- [ ] Uses `logger` not bare `console.log`
- [ ] Uses `execCommand` / `execCommandInherited` not raw `spawn`
- [ ] Uses `projectRoot` / `packagesDir` not per-file `path.resolve(process.cwd())`
- [ ] Uses `getPackageInfo` / `isValidPackage` not ad-hoc `fs.readdir` + filter
- [ ] No re-implementation of an existing util

**Types & style**
- [ ] JSDoc on every function (TS types, not `{string}` / `{Object}`)
- [ ] Double quotes, semicolons, 2-space indent
- [ ] `import type` separated; `node:` prefixed builtins
- [ ] No `any` — `catch (error: unknown)` narrowed before `.message`

**Error handling**
- [ ] `process.exit(1)` on failure (non-zero for CI)
- [ ] One try/catch at top-level `main()`, not scattered
- [ ] Errors name the command + args that failed

**Pipeline (build scripts only)**
- [ ] Build order derived from `package.json` dependencies, not a hardcoded constant
- [ ] Cache (if present) keyed on file hashes + git status, invalidated correctly

**Toolchain**
- [ ] `bun lint` exits 0 (scripts are in the lint tsconfig)
