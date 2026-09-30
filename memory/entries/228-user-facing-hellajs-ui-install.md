---
type: decision
title: User-facing @hellajs/ui install commands lead with npx; bunx and pnpm dlx follow as commented alternatives
description: >
  User-facing docs (site install widget, ui package README/docs, comparison) show
  `npx @hellajs/ui ...` as the primary command with `# bunx ...` / `# pnpm dlx ...`
  commented beneath; registry source and agent-facing files stay bunx.
tags: [docs, ui]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [ui-docs, install-command, cli-docs, package-runner, registry-docs]
---

# Why

npx ships with Node and is the copy-paste default for the broadest audience; the user
set this convention on 2026-09-30: first for the per-component install widget
(`docs/src/components/InstallSection.astro`), then explicitly extended it to all
user-facing docs surfaces. Scope boundaries the same decision fixed:

- **Install-flow blocks** (init, `add <name>`, theme) get the full pattern: npx primary
  line + `# bunx ...` commented alternative.
- **Catalog/reference blocks and prose** (README Basic Usage, cli.mdx trio,
  plain-javascript.mdx flag block, ui-comparison.md workflow trio) get a plain
  runner swap to npx, no alternative lines.
- **installation.mdx's labeled runner list** orders npm, Bun, pnpm (all three shown,
  labeled, uncommented).
- **Excluded:** registry `tokens.js` header comment + its docs-site vendored copy
  (byte-pinned to `add` output by the drift guard) and agent-facing files
  (AGENTS.md, guides) keep bunx.

# Evidence

User decision via ask_user_question ("All docs surfaces" option), implemented across
`docs/src/components/InstallSection.astro`, `packages/ui/README.md`,
`packages/ui/docs/index.mdx`, `packages/ui/docs/concepts/{installation,cli,plain-javascript}.mdx`,
`packages/ui/ui-comparison.md`, `docs/src/pages/ui/index.mdx`. Verified: docs site build
(168 pages), `bun doc-snippets` (strict tier), `bun em-dash`, `bun doc-links` all green;
built `docs/dist/ui/accordion/index.html` renders npx → `# bunx` → `# pnpm dlx`.
