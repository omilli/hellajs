---
type: correction
title: commitlint scope hook crashes on commits that delete a workspace directory
description: "commitlint.config.ts reads every packages/*/package.json at hook time — workspace-deleting commits crash it (ENOENT); restore the file unstaged or drop the leftover dir, commit, re-delete."
tags: [tooling, git]
timestamp: 2026-09-18
last_confirmed: 2026-09-18
triggers: [commitlint-enoent, commit-msg-hook-crash, delete-workspace-commit, cherry-pick-rejected, conventional-commit-hook, does-not-match-index]
---
# Why
The commit-msg hook builds `publishedWorkspaces` by `readdirSync`ing `packages/` + `plugins/` and `readFileSync`ing each `<dir>/package.json`. A commit that deletes a workspace (the primitives dissolution) leaves a `packages/<name>` dir on disk without a `package.json` (staged deletion + build-artifact leftovers), so the config throws ENOENT at load; the hook then reports "Commit message does not follow conventional commits format!" — a misleading symptom for a config crash. Hit during the `feat(dom)` dissolution cherry-pick (2026-09-18).

# Evidence
`git cherry-pick debdd12f` → hook error `ENOENT: no such file or directory, open 'packages/primitives/package.json'` at `commitlint.config.ts:11` (readFileSync inside the flatMap filter), then "Commit message does not follow conventional commits format!" despite a valid `feat(dom): …` subject. Removing the leftover `packages/primitives` dir (untracked `.build-cache`/`dist` remnants) let the identical message commit cleanly.
