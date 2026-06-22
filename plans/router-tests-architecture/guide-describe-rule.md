## [ ] Enforce one inner describe per file in the test style guide
**Type:** Docs

### Depends On
- None

### Objective
The test style guide prevents multi-concern test files by mandating at most one inner `describe` per file and forbidding categorical file-name prefixes.

### Solution
Edit `guides/tests.md` in two places.

In the **Test Structure** section, the current rule reads:

> Max depth: two `describe` levels — outer (feature/package) + inner (sub-area). Sibling inner describes encouraged for distinct sub-areas. Deeper nesting disallowed.

Replace the sentence `Sibling inner describes encouraged for distinct sub-areas.` with a rule that makes the file the grouping seam:

- At most **one** inner `describe` per file. The file name is the grouping mechanism — if a second sibling inner `describe` is wanted, the second concern belongs in its own file.
- Rationale to include in the guide: sibling inner describes let unrelated API surfaces co-locate in one file. That defeats the file-as-grouping principle, hides how many concerns a file actually covers, and produces files that grow past the soft cap before anyone notices the split is overdue.

Keep the "Max depth: two `describe` levels" and "Deeper nesting disallowed" sentences as-is — they are not in conflict with the new rule.

In the **Files** section, the current guidance is:

> `{feature}.test.ts` — lowercase, hyphenated. The `.test`/`.spec` marker is load-bearing: omitting it makes the file invisible to `bun test` / `bun coverage`.

Tighten the naming guidance by adding after the load-bearing-marker sentence:

- File names identify the **specific** API surface or behavior area under test (e.g. `scroll`, `active`, `crumbs`, `hash-mode`, `navigate-options`). Categorical prefixes like `features-` add no information — every test file covers a feature. A file named with only a category, or with no surface at all, is a signal that it mixes concerns and should be split.

This is a guide-only edit. No source, test, or config files change in this task. The code example already present in the Test Structure section (the two-level `describe` snippet) remains valid under the new rule, so it needs no change.

### Definition of Done
- [ ] Every code example in the changed guide file is still valid under the new rule
- [ ] `guides/tests.md` states that a file contains at most one inner `describe` block
- [ ] `guides/tests.md` states that two or more sibling inner `describe` blocks must be split into separate files
- [ ] `guides/tests.md` forbids categorical file-name prefixes (e.g. `features-`) and requires names to identify a specific API surface
- [ ] Running `rg "Sibling inner describes encouraged" guides/tests.md` returns no matches
- [ ] No claim in the changed guide contradicts the actual structure of `packages/*/tests/` after this plan lands
