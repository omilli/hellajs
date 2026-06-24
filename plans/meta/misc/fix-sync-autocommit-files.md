# [x] fix-sync-autocommit-files

## Contract

### Surface change
no

### Package
meta — `.github/` is not a package workspace (no `index.ts`). Per TEMPLATE Hard rules: non-package work → `plans/meta/{type}/`; Type Config → `misc`.

### Guide governance
- Files ← `code.md` §Config verification checklist (per `AGENTS.md`: config files follow `code.md` plus the Config checklist at the end of `code.md`). `scripts.md` scopes `scripts/**/*.ts` and `utils/**/*.ts` only — it does not govern `.github/hooks/*.sh` or `.github/workflows/*.yml`, so these fall under `code.md`'s Config checklist by convention.
- Decision Precedence ← `scripts.md` §Decision Precedence (Correctness > Clarity > Brevity) applied by intent to rarely-read CI automation.

### Files
- `.github/hooks/post-commit` — modify — the three parallel detect+add blocks (`CLAUDE.md` / `.github/instructions` / `copilot-instructions`) collapsed into one unconditional `git add` of the closed generated set, with commit gated on `git diff --cached --quiet`.
- `.github/workflows/ci.yml` — modify — "Sync LLM files" step: broaden the gate grep to include `.github/instructions|copilot-instructions`, and complete the `git add` pathspec to stage the full generated set.

### Tests view
No package test impact. The touched files are git automation (a POSIX `sh` hook and a workflow YAML), not source under `packages/*/lib/` and not governed by `tests.md`'s surface-named `{feature}.test.ts` rule (tests.md §Files — tests live under `packages/*/tests/**`, named after a public surface). Verification is observable reproduction via DoD commands (`sh -n`, pathspec coverage, a sentinel add-dry-run), not a `test()`.

### Docs view
No impact. Root `AGENTS.md` §"Source of truth & sync" already states the hook "auto-runs `bun sync` when an `AGENTS.md` changes, then auto-commits the generated files with `--no-verify`," and that "CI also runs `bun sync` and commits any drift." The fix makes reality match that prose; no doc contradicts the change and no public symbol is involved (docs.md governs package API/concept docs).

---

## [x] Fix sync auto-commit to stage the full generated set
**Type:** Config
**Depends on:** None

### Strategy
The sync-generated set is closed and known: 9 `CLAUDE.md` mirrors + `.github/instructions/*.instructions.md` + `.github/copilot-instructions.md`. The bug is detect-then-add fragility — the hook gates each `git add` on `git diff --name-only`, which excludes untracked files, so a **newly generated** `.instructions.md` (with no modified sibling) is invisible and never staged; CI's `git add` list omits the instructions dir + copilot entirely. Replace detect-then-add with unconditional `git add ':(glob)**/CLAUDE.md' .github/instructions/ .github/copilot-instructions.md` (git pathspec magic — portable across `sh`/`bash`, robust to new packages and new instruction files, respected by `.gitignore` so `node_modules` is safe), then commit only if staging produced changes (`git diff --cached --quiet`). Trade-off considered and rejected: a minimal `git diff --name-only → git status --porcelain` swap would fix the untracked blindness but leave three parallel blocks that can drift independently; collapsing to one add is clearer for rarely-read tooling (Clarity over Brevity, per `scripts.md` §Decision Precedence).

### Definition of Done
- [x] `bun lint` exits 0 — verified exit 0 (baseline green + post-change green)
- [x] `bun run sync` exits 0 and regenerates without error — verified exit 0
- [x] `.github/hooks/post-commit` modified: the three detect+add blocks replaced by one unconditional `git add ':(glob)**/CLAUDE.md' .github/instructions/ .github/copilot-instructions.md`, followed by `git commit` gated on `git diff --cached --quiet` — verified post-commit:17-25
- [x] `sh -n .github/hooks/post-commit` exits 0 — verified
- [x] `test -x .github/hooks/post-commit` succeeds — verified (executable bit preserved)
- [x] `.github/workflows/ci.yml` "Sync LLM files" step modified: gate grep includes `\.github/instructions|copilot-instructions`, and the `git add` stages the full set — verified ci.yml:41,44
- [x] Pathspec covers the full closed set: `git ls-files ':(glob)**/CLAUDE.md' | wc -l` equals `git ls-files | grep -c CLAUDE.md` — verified glob=9 total=9 (match)
- [x] New-files-in-dir robustness proven: sentinel `__sentinel.instructions.md` → `git add -n .github/instructions/` shows it staged; `git status --porcelain` makes the CI gate fire — verified, sentinel removed
- [x] No new runtime dependency introduced — verified package.json untouched by this change
- [x] AGENTS.md §"Source of truth & sync" prose remains accurate — verified AGENTS.md:25 ("auto-runs bun sync ... auto-commits the generated files with --no-verify"; "CI also runs bun sync and commits any drift") still describes the behavior; no doc edit required
