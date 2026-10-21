---
title: Publish plugin packages from committed source - no in-repo flatten step exists, so a plugin's files allowlist must include everything its index.mjs imports
description: Plugin workspaces have no build step - what ships is the committed index.mjs plus whatever the files allowlist includes; plugins under `plugins/` are invisible to `vp run bundle`, so a plugin whose index.mjs imports ./src must list src in files or its npm tarball is broken.
tags: [plugins, packaging, npm-publish, babel-plugin, bundle]
confirmed: 2026-01-24
---

# Why

`vp run bundle <name>` resolves package directories under `packages/` only — running it
with a plugin name fails with `package directory not found: packages/<name>`, and
`scripts/bundle.ts`'s build path never touches `plugins/`. Nothing else in
`scripts/` flattens or rewrites plugin `index.mjs`. Consequences:

- A plugin package ships exactly what is committed. If `index.mjs` imports `./src/…`
  modules but `files` omits `src`, the npm tarball's entry imports files that are not
  in the tarball — the published package is broken for every non-workspace installer.
- `babel-plugin-hellajs` was in exactly that state until 2026-01-24: `files` listed
  only `index.d.ts`, `index.mjs`, `README.md` while `plugins/babel/index.mjs` imports
  `./src/transformers/jsx.mjs`. Published 0.6.9 works only because its tarball was
  flattened by a step that no longer exists in the tree. Fixed by adding `"./src"` to
  `files` (verified: `npm pack --dry-run` lists all 13 `src/*.mjs`) — any release
  packed after that fix is self-contained.
- Any new plugin package must publish `src` verbatim in `files` — never copy the
  pre-fix allowlist — or wire a real build step into `scripts/bundle/`.

# Evidence

- `cd plugins/babel && npm pack --dry-run` (2026-01-24, pre-fix): tarball listed 5
  files, no `src/`, while `plugins/babel/index.mjs` imports `./src/transformers/jsx.mjs`.
  Post-fix same day: 17 files including all 13 `src/*.mjs`.
- Registry tarball `babel-plugin-hellajs/-/babel-plugin-hellajs-0.6.9.tgz` (fetched
  2026-01-24): contains a flattened single-quote esbuild-style `index.mjs`, not the
  committed dev form — the flatten step that produced it is absent from the tree.
- `vp run bundle babel-plugin-hellajs` (2026-01-24): `Build failed … package directory
  not found: …/packages/babel-plugin-hellajs` — bundle's package resolution is
  `packages/`-only (`scripts/bundle.ts` `main`, `derivePackageGraph` consumers;
  `scripts/utils/paths.ts` maps only `*-plugin-hellajs` names for other tooling).
