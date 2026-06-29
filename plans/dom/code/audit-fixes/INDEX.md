# [ ] Plan set: audit-fixes

Resolve the audit findings in `packages/dom/tests/` from `guides/tests.md`.

## Scope

All test files under `packages/dom/tests/`. Guide-level (not lint-enforced) findings: import-order rule drift, one-test files, banned naming, duplicate imports, mixed-surface file.

## Units

- [unit-a-import-order](unit-a-import-order.md) — Update `guides/tests.md` §Test Framework to match the dominant convention; fix 9 files' import order.
- [unit-b-one-test-files](unit-b-one-test-files.md) — Add tests to `mount-validation`, `mount-binding`, `mount-targets` (≥2 per file); split the two-behavior test in `mount-targets`.
- [unit-c-test-names](unit-c-test-names.md) — Rename two `"works correctly"` tests in `direct-events.test.ts`.
- [unit-d-split-reset-dom](unit-d-split-reset-dom.md) — Split `reset-dom.test.ts` into two files; update dom `AGENTS.md`.

## Dependency graph

```
unit-a-import-order ──► unit-d-split-reset-dom
    (hard: unit-d edits reset-dom.test.ts after unit-a consolidates
     its imports)

unit-b-one-test-files ── (independent)
unit-c-test-names     ── (independent)
unit-d-split-reset-dom ── (depends on unit-a)
```
