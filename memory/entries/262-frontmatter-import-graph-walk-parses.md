---
type: decision
title: Frontmatter import-graph walk parses TSX islands via typescript+jsx babel plugins
description: "plugins/astro/evaluate.mjs parseModule runs plugins [\"typescript\", \"jsx\"] so JSX island components in a page's import graph parse and their theme styles collect; TSX mode rejects legacy <T>expr casts."
tags: [arch, contract]
timestamp: 2026-10-04
last_confirmed: 2026-10-04
triggers: [astro-plugin, frontmatter-extraction, import-graph]
---
# Why

The extraction walk follows a page's imports into island components, and island
sources are JSX/TSX: a typescript-only parser throws `SyntaxError` on the first
JSX element, crashing `astro build` for any page whose graph reaches an island
(repro: `examples/astro-islands` pilot build, `Unexpected token` at
`Counter.tsx` 6:17). The fix is one token in `parseModule`. Boundary to keep in
mind: `typescript` + `jsx` together is TSX mode, which disables legacy
`<Foo>expr` type assertions (`as` casts parse fine). A `.ts` module reachable
from a walked graph using an angle-bracket cast would newly fail to parse.
Verified no such casts exist in repo reachable graphs, and docs-site pages have
zero walked graphs (no frontmatter creator imports), so the widening is safe
today.

# Evidence

Failing: `cd examples/astro-islands && bun run build` → exit 1,
`Unexpected token, expected "," (6:17)` at `evaluate.mjs` `parseModule`.
Probe: `parse(Counter.tsx, plugins: ["typescript"])` → SyntaxError;
`plugins: ["typescript", "jsx"]` → parses (3 statements).
Passing: `bun test plugins/astro/tests` 19 pass / 0 fail (incl. new
TSX-island-in-graph test); `bun run build` exit 0 with all six extracted rules
in the built head; `rg '<[A-Z][a-zA-Z]*>' examples/astro-islands/src --glob
'*.ts'` → no matches.
