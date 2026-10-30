---
title: Headless ships utils under lib/utils and component factories flat; vocabulary is utils/components
description: The headless package's public taxonomy is ui-shaped — utils (the 15 dispose-handle functions incl. modal) live in lib/utils and import from @hellajs/headless/utils; component factories (.tsx) stay flat at the lib root behind the root barrel; the behaviors/foundations/parts vocabulary is retired repo-wide.
tags: [headless, utils, components, vocabulary, package-structure, exports-map, subpath]
confirmed: 2026-10-30
---

# Why

The behaviors/foundations/parts tier taxonomy (recorded by the deleted entry this one replaces) was superseded by a user decision (2026-10-30): the headless section adopted ui's vocabulary so the two sections read as one system — nav groups Config/Components/Utils, "behaviors" renamed "utils" everywhere, "parts" renamed "components", and the foundations tier folded away (`modal` is a util). Users import utils from `@hellajs/headless/utils` (folder barrel) or `@hellajs/headless/utils/<name>`; components from the root barrel. The 21 exported `*Parts` type interfaces were renamed `*Components` (`MenuParts` → `MenuComponents`) — a type-surface rename for any deep type importer.

# Evidence

- Structure: `packages/headless/lib/utils/` (15 utils + `index.ts` barrel), component `.tsx` factories at the lib root; `packages/headless/lib/index.ts` re-exports both (root barrel surface unchanged for value exports — 45-name d.ts parity verified by diff).
- Exports map: `packages/headless/package.json` carries explicit `./utils` + `./utils/*` entries — the pre-existing `./*` wildcard maps file-per-file and does NOT directory-index-resolve (`./utils` → `dist/utils.d.ts`, not `dist/utils/index.d.ts`); without the explicit entries both tsc and runtime resolution fail (TS2307 observed in the ui registry's staged tsc gate until added).
- Docs/nav: `docs/src/nav.ts` headless section = Config/Components/Utils groups (pure headings, flat `/headless/<slug>` pages); concept docs `headless-utils.mdx` + `headless-components.mdx`; learn nav entries `Headless-Utils`/`Headless-Components`.
- Coverage scoping: `scripts/coverage.ts` include flags list `dist/utils/*.js` explicitly — moving files into a new dist subfolder silently drops them from measurement unless the include set grows (observed: 93.48% → 92.65% until fixed).
