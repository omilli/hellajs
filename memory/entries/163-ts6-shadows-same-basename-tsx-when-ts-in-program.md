---
type: correction
title: "TS 6 program builder shadows same-basename .tsx when a same-basename .ts is in the program — never pair <name>.tsx + <name>.ts in one directory; ui registry html flavor files are <name>-html.ts"
description: TS 6 admits only one same-basename supported-extension file per directory — .ts wins, .tsx silently vanishes (vacuous typecheck). Registry html-flavor files are named <name>-html.ts.
tags: [arch, ui, tsconfig, typecheck]
timestamp: 2026-09-16
last_confirmed: 2026-09-16
triggers: [same-basename-shadow, tsx-invisible, registry-layout, include-glob, vacuous-typecheck]
---
# Why

Unit 03 of the ui registry set pinned the layout `registry/<name>/<style>/<name>.tsx` + `<name>.ts` (jsx + runtime-html flavors side by side). The spike gate's `tsc --listFiles` showed `button.ts` in the program and `button.tsx` absent — with `**/*.tsx` include lines present, with extensionless `**/*`, and even with directory-style include. Isolated probes: include `[".../button.tsx"]` alone → file found; adding the same-basename `.ts` by ANY pattern → gone. TS 6.0.3's file enumeration dedupes per basename across supported extensions (.ts/.tsx/.d.ts), so two same-basename sources in one directory can never both be checked — and the failure is silent green, exactly the vacuous-typecheck hazard memory 093 warns about, one level deeper than include-globs. The shadow also hits users: `copyFiles` flattens both files into the app's `components/`, where bundler extension resolution (.ts before .tsx) makes extensionless imports ambiguous. Fix: distinct basenames — html flavor is `<name>-html.ts` (`matchesFormat` still keys on the `.ts` suffix, so the CLI contract is unchanged). Operator approved the rename at the spike gate.

What breaks if ignored: any future registry entry (or example/plugin layout) pairing `<name>.ts` with `<name>.tsx` in one folder typechecks only half itself while every gate reads green; editors may show the `.tsx` via a different program shape, hiding the discrepancy from drive-by checks.

# Evidence

- Probe (this session, TS 6.0.3): `bunx tsc -p <cfg> --noEmit --listFiles` — full `tsconfig.lint.json` with `packages/ui/registry/**/*.ts` + `**/*.tsx` + `**/*.js` lines listed only `registry/button/css/button.ts`; `["packages/ui/registry/**/*.tsx"]` alone listed `button.tsx`; `["packages/ui/registry/**/*"]` and `include: ["packages/ui/registry"]` listed only the `.ts`.
- Fix + gate: `registry.json` files arrays → `["button.tsx", "button-html.ts"]`; `bun coverage ui` exit 0 (22 pass) with BOTH files in the program (`--listFiles` shows both).
- Plan note: `plans/ui/code/hellajs-ui/03-ui-registry-button.md` (top marker `[x]`, rename recorded); layout gotcha codified in `packages/ui/AGENTS.md` §Registry.
