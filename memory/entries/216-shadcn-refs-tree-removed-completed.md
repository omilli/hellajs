---
type: fact
title: shadcn refs tree removed with the completed ui-shadcn-components set; pinned upstream fetch recipe is the re-vendor anchor
description: The refs tree (plans/ui/code/ui-shadcn-components/refs/) is gone — deleted with the untracked set folder after the set merged; re-vendor from the pinned upstreams using the recipe inside.
tags: [ui, registry, workers]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [refs-missing, shadcn-refs, lucide-icons, vendor-refs, input-otp, shadcn-components]
supersedes: 176
---
# Why
Entry 176 recorded the mid-set restoration (2026-09-23) of the refs tree and framed it in the present tense ("later units read refs normally") — no longer true. The set completed and merged (log: worker-allocated IDs 172-184 from the ui-shadcn-components merge, renumbered 181-193; `registry.json` = 61 entries = 59 components + theme + cn, matching entry 193's recount), and the untracked set folder `plans/ui/code/ui-shadcn-components/` — refs tree included — was removed with it. An agent hitting a refs-missing situation today must not expect the tree to exist: re-vendor from the pins below, scoped to the components actually needed.

# Evidence
Verified 2026-09-27: no `refs/` directory outside `.git` internals in the main tree (`fd -t d refs`), `plans/ui/code/` contains only `registry-canonical-placeholders`, and the `../hellajs-wt/` worktrees carry no refs dirs. `jq '.entries | length' packages/ui/registry/registry.json` → 61.
Recipe (carried from entry 176, provenance 2026-09-23): refs/shadcn = 62 files from `raw.githubusercontent.com/shadcn-ui/ui/<c257f688cf4de7ec10cc1be84cad29cd4631182c>/apps/v4/registry/new-york-v4/ui/` (listing via the GitHub contents API; c257f688 = "feat(registry): migrate registry, templates and CLI to cn", 2026-09-04); refs/icons = 1866 svgs from the `lucide-static-0.545.0.tgz` npm tarball, `package/icons/*`; `refs/manifest.md` was never restored (hand-authored, unrecoverable). Per-component registryDependencies live in each component's registry item json on the same commit. The original verification anchor (input-otp ref imports MinusIcon, class strings matching unit 18's plan) described files since deleted — the shipped `packages/ui/registry/input-otp/` canonicals carry no icon imports.
