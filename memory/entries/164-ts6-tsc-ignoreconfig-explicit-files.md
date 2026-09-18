---
type: decision
title: "TS 6 tsc refuses explicit file args when a tsconfig.json is discoverable — pass --ignoreConfig or it errors TS5112 instead of silently ignoring the project"
description: "bunx tsc <files...> under TS 6 exits TS5112 when a discoverable tsconfig.json sits above any arg — add --ignoreConfig to the flags for file-args invocations."
tags: [tooling, tsc, scripts]
timestamp: 2026-09-16
last_confirmed: 2026-09-16
triggers: [ts5112, tsc-explicit-files, ignoreconfig, tsc-cli-flags, declaration-emission-cli]
---

# Why

TS 5.x silently ignored a discovered tsconfig when files were passed on the command line; TS 6 turns that into a hard error. Any script invoking `tsc` with explicit file args from inside a package dir (every package root has a tsconfig.json) fails its build step until `--ignoreConfig` is added. Same TS 6 program-builder family as entry 150's same-basename shadowing. Hit in `scripts/bundle/registry.ts`'s declaration pass: `bunx tsc <staged...> --emitDeclarationOnly …` run with cwd = repo root died on `packages/ui/tsconfig.json` discovery.

# Evidence

- Red: `bun bundle ui` exit 1, `error TS5112: tsconfig.json is present but will not be loaded if files are specified on commandline. Use '--ignoreConfig' to skip this error.` (bundle log, first compileRegistry run).
- Green: `--ignoreConfig` prepended to the tsc args in `scripts/bundle/registry.ts` → `bun bundle ui` exit 0 with `.d.ts` emitted for all staged sources.
