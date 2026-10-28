---
title: Edit registry.json deps line-wise on the pristine file, never jq-regenerate
description: Adding entries to packages/ui/registry/registry.json deps requires line-wise text edits preserving house formatting; jq round-trips explode compact arrays and oxfmt --fix does not restore them.
tags: [ui, registry-json, formatting, oxfmt, jq, deps]
confirmed: 2026-10-27
---
# Why

`packages/ui/registry/registry.json` is committed in oxfmt house style: short string arrays inline (`"deps": ["@hellajs/css"]`), which is NOT jq's output style. Regenerating the file through `jq` (even with post-hoc compaction regexes) explodes every array multi-line and reorders keys (`deps` lands after `registryDependencies`), producing a ~1400-line formatting diff; `vp check --fix` (oxfmt) sorts arrays but does not re-compact them, so the diff stays huge. A deps addition should be a ~40-line diff.

# Evidence

2026-10-27: adding `"@hellajs/headless"` to the deps of 21 entries (42 style variants). jq regeneration produced `1446 files changed`-scale diffs twice (with and without a compaction pass); `vp check --fix packages/ui/registry/registry.json` left `darkFiles` exploded. The working approach: `git checkout -- packages/ui/registry/registry.json`, then a python line-walker over the pristine text tracking current entry (4-space `"name": {`) and style variant (8-space `"name": {`), appending the dep into the inline `"deps": [...]` line (sorted), or inserting a `"deps": ["@hellajs/headless"],` line before `registryDependencies` when the variant had none. Result: `42 insertions(+), 21 deletions(-)`, `jq empty` valid, `vp run lint` green.
