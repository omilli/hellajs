---
type: decision
title: gen-install-sources.ts only works per-entry — the all-entries run crashes at cn, and cn/theme can never generate
description: Invoke `bun docs/scripts/gen-install-sources.ts` with explicit names: the all-entries loop dies at `cn` (no css style) and `theme` (filename mismatch), so neither ever generates.
tags: [ui, docs]
timestamp: 2026-09-29
last_confirmed: 2026-09-29
triggers: [gen-install-sources, install-sources, ui-docs, add-output]
---
# Why
The generator's loop calls `addComponent([name], { style: "css" })` for every entry from
`listComponents()`. `cn` is a tailwind-only shared entry, so the css add throws
`resolveEntry: component "cn" has no "css" style` and the loop exits 1 before regenerating
anything alphabetically after it; `theme` copies `tokens.js`/`theme.css`, so the script's
`readFileSync(<tmp>/src/components/theme.tsx)` fails ENOENT. Both failures reproduce on a
clean baseline — they are not caused by the change being documented. Entries whose tailwind
output is byte-stable (all string consts outside-referenced: hover-card, message-scroller,
popover, toggle, toggle-group, tooltip) regenerate to an unchanged file — a no-diff there is
success, not a skipped entry.

# Evidence
`bun docs/scripts/gen-install-sources.ts` → exit 1 at cn
(`[ui] resolveEntry: component "cn" has no "css" style`, packages/ui/dist/internal/registry.js);
`git stash` + rerun on baseline → identical exit 1 (foreign failure confirmed 2026-09-29).
`bun docs/scripts/gen-install-sources.ts <remaining-names>` (cn excluded) → exit 1 only at the
final theme entry, with all 54 component entries regenerated
(`git status docs/src/generated/install/`). `ls docs/src/generated/install/` holds 59 files:
no cn.json, no theme.json.
