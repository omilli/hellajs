---
type: decision
title: "tsc type-probes pass --ignoreConfig and --jsx preserve — @hellajs/* exports no jsx-runtime subpath and TS 6 rejects files-on-CLI beside a tsconfig"
description: "tsc type-probes: `bunx tsc --ignoreConfig --noEmit --strict --jsx preserve ...` — react-jsx fails (no jsx-runtime export); omitting --ignoreConfig fails TS5112 under TS 6."
tags: [tooling, types, probes, dom]
timestamp: 2026-07-29
last_confirmed: 2026-07-29
triggers: [tsc-probe, type-probe, ignoreConfig, jsx-runtime, assignability-check]
---

# Why

Verifying a published type's assignability with a throwaway probe needs flags the root
`tsconfig.json` doesn't hand you, and two plausible invocations fail first:

- `--jsx react-jsx --jsxImportSource @hellajs/dom` → TS2875: `@hellajs/dom/jsx-runtime`
  does not exist — dom's `package.json` exports only `.`, `./bundle`, and the `./*`
  wildcard over `dist/`; no jsx-runtime files ship. JSX is transformed at build time by
  the babel plugin; every example tsconfig uses `"jsx": "preserve"`.
- Passing probe files on the CLI without `--ignoreConfig` → TS5112 under the pinned
  TypeScript 6.0.x (memory 025): a `tsconfig.json` is present but not loaded when files
  are specified.

Probe shape that compiles all JSX children forms (components + intrinsics — intrinsic
children have no declared prop, so `ElementChildrenAttribute.children: {}` accepts
`HellaChildren` unions):

```sh
bunx tsc --ignoreConfig --noEmit --strict --jsx preserve \
  --module esnext --moduleResolution bundler --target esnext --skipLibCheck <file>.tsx
```

# Evidence

- `packages/dom/package.json` `exports` — no `./jsx-runtime` entry (read 2026-07-29).
- `packages/dom/lib/index.ts` global `namespace JSX` — `ElementChildrenAttribute { children: {} }`,
  `IntrinsicElements extends HTMLAttributeMap`; `attributes.d.ts` declares no `children` prop.
- Empirical this session: react-jsx invocation errored (TS2875 + TS2322s), `--ignoreConfig
  --jsx preserve` probe of the five `HellaChildren` usage shapes exited 0.
- Related: 025 (TS 6.0.x pin), 056 (runtime probes via `bun -e` from `packages/<pkg>`) —
  neither covers tsc flag selection.
