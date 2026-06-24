# [ ] add-plan-strategy-examples

## Contract

### Surface change
no

### Package
meta — `.agents/skills/plan/` is not a package workspace (no `index.ts`). Per TEMPLATE Hard rules: non-package work → `plans/meta/{type}/`; Type Config → `misc`.

### Guide governance
- Files ← `code.md` §Config verification checklist (per `AGENTS.md`, config + agent-authoring files follow `code.md`'s Config checklist by convention). NOTE: `docs.md` governs package API/concept docs (`packages/*/docs/**`, `docs/**`) and does not apply to agent-instruction markdown under `.agents/skills/` — these are authoring artifacts the agent reads at runtime, not published docs. Cited to avoid mis-applying `docs.md` templates here.

### Files
- `.agents/skills/plan/TEMPLATE.md` — modify — Strategy section description (single-task template block + each multi-task sub-task block): add guidance that Strategy SHOULD carry a minimal illustrative example (1-3 line snippet or before→after sketch) when the change has a concrete shape. Anchor: the `### Strategy` lines in both the "Single-task plan" and "Multi-task plan" code blocks.
- `.agents/skills/plan/SKILL.md` — modify — Phase 3 §Strategy per task: add a bullet that Strategy includes a minimal example when it aids a reader who hasn't read the discovery handoff, weighing accessibility alongside the existing "advisory context, not a parse target" framing. Anchor: Phase 3 bullet list (Decision Precedence / Functions & Modules / Loops / anti-patterns).

### Tests view
No impact. `.agents/skills/**/*.md` are agent-instruction files, not source under `packages/*/lib/`; `tests.md` governs `packages/*/tests/**` named after a public surface. No `test()` applies. Verification is the DoD (guidance present, parse contract preserved).

### Docs view
No impact. `docs.md` governs package/website docs, not agent-authoring markdown. No public symbol, no doc page.

---

## [ ] Add minimal illustrative example to plan Strategy sections
**Type:** Config
**Depends on:** None

### Strategy
The density-vs-accessibility tension (recorded in `memory/entries/plan-accessibility.md`) is real but narrow: the plan skill deliberately keeps Strategy as terse advisory prose ("advisory context, not a parse target" — `SKILL.md` Phase 3), which serves the worker parser but starves a human skimming `plans/` — hardest for `Surface change: no` plans, which seed zero example today (only `Surface change: yes` plans get a runnable example, via Contract `Public API delta`, `TEMPLATE.md` Public API delta block). Resolve minimally WITHOUT breaking the worker's parse contract (keys on `[ ]`/`[x]` markers, `## ` task headers, `### Definition of Done` items — none of which live inside Strategy prose, so an inline code block there is invisible to the parser): add guidance that Strategy SHOULD include a 1-3 line illustrative example (snippet or before→after sketch) when the change has a concrete shape. Keep it advisory ("when it aids the reader"), not mandatory, so abstract tasks aren't forced to fabricate. Trade-off considered and rejected: a mandatory per-task Example block — over-weight for trivial tasks and would balloon plan length, undermining the density the skill currently optimizes for; advisory guidance lands the affordance only where it pays off.

**Illustrative example (eating this plan's own dog food):**

Before (current Strategy guidance, `TEMPLATE.md`):
```
### Strategy
[2-4 sentences: approach, key decisions, trade-offs...]
```

After:
```
### Strategy
[2-4 sentences: approach, key decisions, trade-offs...]

Example (when the change has a concrete shape):
[1-3 line snippet or before→after sketch — e.g. the exact git command, the signature delta, the config shape]
```

A real instance — the fix-sync plan's Strategy could have closed with the one-line payoff a caveman reader needs:
```sh
git add ':(glob)**/CLAUDE.md' .github/instructions/ .github/copilot-instructions.md
```

### Definition of Done
- [ ] `bun lint` exits 0
- [ ] `.agents/skills/plan/TEMPLATE.md` Strategy description carries the example guidance in both the single-task and multi-task template blocks — verified by grep
- [ ] `.agents/skills/plan/SKILL.md` Phase 3 carries a bullet on including a minimal example, weighing accessibility against the "advisory, not a parse target" framing — verified by read
- [ ] Worker parse contract preserved: no new `[ ]`/`[x]` markers, `## ` task headers, or `### ` sections introduced inside Strategy prose — `grep -n '## \[\|^### ' .agents/skills/plan/TEMPLATE.md` shows no spurious parse targets beyond the existing structure
- [ ] `memory/entries/plan-accessibility.md` updated to "addressed" with a pointer to the new guidance (or its INDEX line refined), keeping memory honest about what landed
