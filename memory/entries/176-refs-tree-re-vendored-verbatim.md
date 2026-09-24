---
type: fact
title: "refs/ tree re-vendored verbatim in place: shadcn-ui/ui @ c257f688 + lucide-static 0.545.0"
description: "The untracked refs/ source-of-truth tree (deleted mid-set) was restored verbatim from its pinned upstreams; fetch recipe + verification anchor."
tags: [ui, registry, workers]
timestamp: 2026-09-23
last_confirmed: 2026-09-23
triggers: [refs-missing, shadcn-refs, lucide-icons, vendor-refs, input-otp, shadcn-components]
---
# Why
The shadcn-catalog plan set declares `refs/shadcn/*.tsx` + `refs/icons/*.svg` the verbatim styling truth (workers are web-free, "never memory"). The tree was deleted from the main repo mid-set (units 1-17 delivered, 18-22 pending), blocking any component unit. With explicit operator direction the tree was re-vendored from the pins, so later units read refs normally instead of authoring classes from memory.
# Evidence
Restored 2026-09-23: `refs/shadcn/` = all 62 files from `raw.githubusercontent.com/shadcn-ui/ui/<c257f688cf4de7ec10cc1be84cad29cd4631182c>/apps/v4/registry/new-york-v4/ui/` (listing via the GitHub contents API; c257f688 = "feat(registry): migrate registry, templates and CLI to cn", 2026-09-04). `refs/icons/` = 1866 svgs from the `lucide-static-0.545.0.tgz` npm tarball, `package/icons/*`. Verified against unit 18's plan: the input-otp ref imports MinusIcon (not X) and its class strings matched the plan's quotes. `refs/manifest.md` was NOT restored (hand-authored, unrecoverable); upstream per-component registryDependencies are in each component's registry item json on the same commit.
