---
title: ui docs keep npx-primary with commented bunx alternatives; sweeps treat them as survivors
description: "The `# bunx @hellajs/ui ...` commented lines (and the `# Bun` runner row) in ui docs/README are intentional npx-primary mirrors of InstallSection's commandCode survivor — do not clean them up; bun-sweep DoDs expect them."
tags: [ui, docs, npx, bunx, sweeps, install-conventions]
confirmed: 2026-10-16
---
# Why

The user-decided CLI convention (2026-10-16): docs invocations are npx-primary, with Bun named only as an explicit commented alternative mirroring `docs/src/components/InstallSection.astro`'s `commandCode` (`npx ...` / `# bunx ...` / `# pnpm dlx ...`). bun-sweep DoDs exclude `bunx @hellajs/ui` and `# bunx` from residue wholesale. A future pass that greps `bunx @hellajs` and deletes the commented lines as "leftover bun" would be destroying sanctioned content and diverging from the InstallSection convention; registry token headers (`npx @hellajs/ui add theme`) are the npx-primary form, not alternatives.

# Evidence

Baseline check (2026-10-16): installation.mdx / index.mdx / theming.mdx / README.md already npx-primary with `# bunx` alternatives; user-approved repair of a DoD demanding "exactly one match" explicitly blessed the alternative lines (installation.mdx x4 incl. the `# Bun` runner row, index.mdx x2, theming.mdx x1, README x1) alongside the InstallSection.astro:51 survivor.
