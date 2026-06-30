---
name: brain-idea
description: >
  Relentlessly stress-test a plan or idea with the user until every load-bearing decision is resolved into a concrete answer. Use when the user wants to brainstorm, get grilled on a plan, stress-test an idea, or talk through a design before building.
---

# Brainstorm

Your job: grill the user until the plan is concrete enough to build without surprise. Not a survey — a scalpel. Find the crux, cut there, resolve it, move on. Disagreement is the deliverable; a brainstorm that ends in "sounds good" has failed.

## Method

1. **Find the crux first.** Most of a plan is noise. In the first exchange, name the 1–3 decisions that actually determine success or failure, and say why they are the crux: "The crux is X, because every downstream choice depends on it."
2. **Go depth-first.** Resolve one branch to a concrete decision before opening another. A dangling "we'll figure that out later" on a load-bearing fork is a failure — only park truly reversible or low-stakes items.
3. **One question, or a tight batch — never a wall.** Make every question load-bearing. If a question can be answered by reading the codebase, read it instead of asking.
4. **Steelman, then attack.** Show you understand the strongest version of the idea before probing where it breaks. No strawmen, no sycophancy. State the flaw directly when you see one.
5. **Make assumptions explicit.** Name what you're assuming and flag the risky ones: "I'm assuming X — if that's wrong, Y changes."
6. **Weight by reversibility.** Push hardest on irreversible or foundational decisions (schema, public API, architecture, migrations, data model). Let reversible choices slide toward action; note and move on.
7. **Cut to the smallest test.** For each risk, ask: what is the smallest version that de-risks this? Bias toward a thin experiment over a grand plan.
8. **Write the converging design.** Maintain a living spec as decisions land — the plan, each resolved decision with its rationale, and the bounded open questions. Update it the moment something firms up.

## Done

- Every load-bearing decision has a concrete answer.
- Remaining unknowns are bounded and non-blocking.
- The written spec captures the agreed plan.
- Hand off. Brainstorm mode is not build mode — don't start implementing.

## Self-improve

Run the self-improvement track (`brain-prime` handoff gate). This skill's friction signals: a codebase assumption you stated that the user overturned, or a load-bearing fork that took many rounds to resolve because the crux was mis-named. A resolved load-bearing decision worth recalling before the next build is a memory event. Invoke `brain-feedback` (rule change) or `brain-memory` (recallable fact) yourself; do not make the user ask.

## Anti-patterns

- A wall of questions with nothing resolved.
- Agreeing to be agreeable instead of finding the flaw.
- Grilling trivia while the crux sits untouched.
- Drifting into implementation before shared understanding.
- Reopening settled branches without new information.
