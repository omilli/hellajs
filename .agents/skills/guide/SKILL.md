---
name: guide
description: Apply a guide update after a proposal is accepted, or when a guide needs updating for any reason. Verifies the edit is a general principle (not package-specific), checks blast radius across all six packages and the verification checklists and cross-references, and reports ripple effects.
---

# Guide

Execute a guide change. Guides govern all six packages — a guide edit is the highest-blast-radius change in the repo, rippling to every audit, every plan governance header, every worker verification, and every future skill run. This skill exists because every loop skill emits guide-update *proposals*, but a proposal is only the "what should change"; this skill is the "now make the change safely."

## Non-negotiables

Two rules govern this skill absolutely. A guide edit alters every future run across every package — uniformity survives only if guide changes are general, verified, and fully accounted for.

**Guides are inviolable — even to this skill.** A guide edit follows the guides' own meta-structure: decision trees at the top, rules in the middle, verification checklists at the end. A new rule adds a tree branch AND a checklist item; it does not get dropped into prose alone. And the edit must be a general principle, never a package-specific detail — reason from principle (same rule as audit Step 4), because a rule hardcoded to one package rots on the next refactor and breaks uniformity across the other five.

**Every change carries its full blast radius.** A guide edit ripples to: the verification checklist in the same guide, the decision trees, the canonical examples, the plan skill's governance headers (which cite guide sections by name — do they still resolve?), the cross-references between guides, and existing code that may now be non-compliant under the new rule. Grep the codebase; surface non-compliant code as follow-up work, not a reason to abandon a correct change.

## Step 1 — Intake

Receive either a guide-update proposal (Guide + Rule + Conflict + Proposal) emitted by another skill, or a direct request ("update guides/code.md §Loops"). Read the cited guide section in full, plus the surrounding sections it cross-references. If the input is a proposal, the Conflict and Proposal fields are the spec; verify them against the section before applying.

## Step 2 — Verify generality

Guides govern all six packages. Test the proposed edit: is it a general principle, or does it encode a detail from one package? "Internal hot-path state justifies short field names for hidden-class density" is general; "the `sbc` field in signal.ts should be 3 chars" is package-specific. A package-specific rule rots and breaks the uniform feel across packages — reframe to the general principle or reject it back to the requester.

## Step 3 — Apply the edit, keeping the guide's three layers in sync

Every guide is now structured in three layers: decision trees at the top, prose rules in the middle, verification checklists at the end. An edit that touches one layer must touch all three that apply:

- **New rule** → add a decision-tree branch (if it affects a decision the agent makes) AND a verification-checklist item (so audit catches it going forward) AND the prose rule.
- **Changed rule** → update the tree branch, the prose rule, and the checklist item together. They drift apart silently otherwise.
- **New canonical example** → add it to the canonical-examples table (code.md) or the relevant examples section.
- **Removed rule** → remove from all three locations; grep the skills and other guides for references to the removed rule.

## Step 4 — Blast-radius check

After the edit, check every ripple:

- **Same guide** — does the verification checklist reflect the new rule? Does a decision tree need a new branch? Does a canonical example now contradict the rule?
- **Cross-guide** — guides reference each other. A `code.md` file-structure change may affect `tests.md` file-naming or `docs.md` file locations. Read the related sections and check for contradictions introduced by the edit.
- **Skills** — the plan skill's governance header cites guide sections by name (`Files ← code.md §Package File Structure`). Do the citations still resolve after the edit? Grep `.agents/skills/` for section references to the edited guide.
- **Existing code** — grep the codebase for code now non-compliant under the new rule. This is follow-up audit/plan work, not a reason to abandon a correct guide change — but it must be surfaced so it does not become silent non-compliance. A guide rule nothing follows is dead weight; either the code is wrong (→ audit/plan) or the rule is wrong (→ re-verify generality).

## Step 5 — Report

Report: what changed (the edit, in which layer), what ripple effects were found (checklists updated, trees branched, cross-references checked, skills re-cited), and what follow-up work the change creates (non-compliant code to fix, feature ideas to re-check). Guides are not synced by `bun sync` (only AGENTS.md files are), so no mirror regeneration is needed — but every downstream skill run now uses the new rule.

## Self-check

a. Is the edit a general principle, not a package-specific detail?
b. Did the decision tree, prose rule, and verification checklist all stay in sync?
c. Were cross-guide references checked for contradictions?
d. Were existing-code grep results surfaced as follow-up, not ignored?
e. Do plan governance-header citations still resolve after the edit?
