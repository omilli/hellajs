---
name: brain-idea
description: >
  Relentlessly stress-test a plan or idea with the user until every load-bearing decision is resolved into a concrete answer. Use when the user wants to get grilled on a plan, pressure-test an idea, or talk through a design before building.
---

# Brainstorm

Grill the user until the plan is concrete enough to build without surprise. Not a survey — a scalpel: find the crux, cut, resolve, move on. Disagreement is the deliverable; ending in "sounds good" has failed.

## Method

1. **Find the crux first.** Most of a plan is noise. Name the 1–3 decisions that determine success/failure, and why they are the crux.
2. **Depth-first.** Resolve one branch before opening another. A dangling "figure it out later" on a load-bearing fork is failure — park only reversible/low-stakes items.
3. **One question, or a tight batch — never a wall.** Every question load-bearing. Answerable by reading the codebase → read it, don't ask.
4. **Steelman, then attack.** Strongest version before probing where it breaks. No strawmen, no sycophancy.
5. **Make assumptions explicit.** Name them; flag the risky ones.
6. **Weight by reversibility.** Push hardest on irreversible/foundational decisions (schema, public API, architecture, migrations, data model). Let reversible choices slide toward action.
7. **Cut to the smallest test.** For each risk: smallest version that de-risks it. Thin experiment over grand plan.
8. **Write the converging design.** Living spec as decisions land — plan, each resolved decision + rationale, bounded open questions. Update the moment something firms up.

## Done

- Every load-bearing decision has a concrete answer.
- Remaining unknowns bounded and non-blocking.
- Written spec captures the agreed plan.
- Hand off. Not build mode — don't start implementing.

Run the brain-prime handoff gate; friction signals: codebase assumption you stated that the user overturned → `brain-memory` (recallable fact about this codebase); load-bearing fork that took many rounds because the crux was mis-named → `brain-feedback` (the find-the-crux method slipped — sharpen the skill's framing).

## Anti-patterns

- Wall of questions, nothing resolved.
- Agreeing to be agreeable instead of finding the flaw.
- Grilling trivia while the crux sits untouched.
- Drifting into implementation before shared understanding.
- Reopening settled branches without new information.
