---
title: Check tsgolint TS1361 false positives before fixing type-only-import shadowing
description: "tsgolint (TS7) flags TS1361 on a local function legally shadowing an erased `import type` name — verify against tsc before restructuring code; the usual root cause is a dead type-import name."
tags: [tsgolint, typescript, vp-lint, false-positive, jsx]
confirmed: 2026-10-16
---
# Why

tsgolint (the TS7/Go engine behind `vp lint` type-check) resolves a JSX/value identifier to a type-only import binding and errors TS1361 ("cannot be used as a value because it was imported using 'import type'") even when a local `function`/`class` declaration of the same name legally shadows it — type-only imports are erased and create no value binding. tsc 6 accepts the same file (`bunx tsc -p tsconfig.lint.json --noEmit` exited 0 while tsgolint errored). "Fixing" the code to appease it (renaming the local, dropping the shadow) restructures correct source for a checker bug.

# Evidence

`packages/ui/registry/radio-group/radio-group.tsx`: `import type { RadioGroupItem, … }` at the top + `export function RadioGroupItem` + `<RadioGroupItem …>` in JSX — tsgolint TS1361 at the JSX site, old tsc gate exit 0. Root cause was the imported type name being dead in the file; dropping it from the import line cleared the error without touching the shadowing function. Verified 2026-10-16 during the vite-plus lint migration (worktree probe: tsc exit 0 vs `vp lint` TS1361 on the identical file).
