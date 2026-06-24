---
name: hotpath
description: Discover performance optimizations in a HellaJS package's hot paths. Use when asked to find, surface, audit, or hunt performance opportunities in any package. Reads every lib/ source, traces each input > hot path > result, and hands each mechanism-grounded finding to the plan skill. Manual verification today; benchmark integration pending.
---

# Hotpath

One package per invocation. Read every `lib/` source file, trace each public entry point through its hot path to its result, and surface performance optimizations grounded in a concrete mechanism — never a hunch. Every finding names the input that triggers the path, the exact instruction or allocation that's wasteful, and why it matters (frequency × cost). Hand each viable finding to `/plan` as an evidence map.

Hotpath owns **discovery** — where the wasted cycles live. Plan owns the fix design. Hotpath does not write the Contract; it hands off the mechanism plus the evidence that lets plan derive the Contract without re-reading everything.

## The mental model: input > hot path > result

Every public primitive in these packages has the same shape: a trigger (**input**) drives a piece of machinery (**hot path**) that produces an observable effect (**result**). Performance lives in the middle. The discipline of this skill is to trace that full line for every primitive before proposing anything — a finding that names only the "hot path," without the input that feeds it and the result it produces, is ungrounded, because you cannot reason about frequency (how often the input fires) or cost (how much work the path does before the result) without all three.

Derive the real input > hot path > result lines for the target package from its `AGENTS.md` + `lib/` each run; do not hardcode them. Illustrative shape, per package:

| Package | Input | Hot path | Result |
|---|---|---|---|
| core | signal write / read in reactive ctx | `propagateChange` DFS, `createLink` dedup, `validateStale` | subscribers re-run once, glitch-free |
| dom | `each()` change / user event / signal child change | ForEach reconcile (LIS + key maps), `delegatedHandler` `composedPath` walk, reactive-child effect | minimal DOM moves; handler fires |
| css | `css()` / `cssVars()` call | ref-counted CSSOM `insertRule`, reactive var batch | rule live, vars applied |
| resource | fetcher call | cache (LRU+TTL) + dedup + SWR | single response, reused |
| router | URL change | redirects → nested → flat → notFound resolution | matched view mounts |
| store | mutation | deep reactive conversion of plain object | granular signals fire |

## Non-negotiables

Two rules govern this skill absolutely. They exist because the project's end goal is ~100% uniform style, accuracy, and feel across every package — and that uniformity survives only if every skill treats the guides as inviolable and every change as carrying its full blast radius.

**Guides are inviolable.** `code.md`'s Performance section is the floor, not the ceiling: §Loops (cached `while`; no `for…of` / `for…in` on hot paths), §Memory (no new collections where `.clear()` / reference-swap works; lazy-allocate; frozen singletons), §Conditions (early returns; no nested ternary), §Decision Precedence (**Correctness > Performance > Backward compatibility > Clarity > Brevity**), §Mutation vs Immutable (mutate internal hot-path state; return fresh refs on the public surface). A finding that fixes a `code.md` violation is **Provable** by inspection. A finding that goes beyond `code.md` (a guide-compliant loop that still does redundant work) is this skill's unique value — but if an optimization would require *breaking* a guide, emit a **guide-update proposal** (`guides/code.md` §{section} + the rule quoted + the conflict + the proposed edit with reasoning) and let the user decide case by case. Proceeding past an unresolved conflict is silent deviation, and silent deviation is how uniformity dies.

**Every change carries its full blast radius.** An optimization is never just a local edit. Mutating an object the public surface returns changes the identity contract callers rely on (ForEach swaps its collections by reference — callers must never mutate returned nodes; the `__static` template optimization shares subtrees by reference). Removing an allocation can change `===` semantics a test pins. Reordering operations in propagation can change effect scheduling order a topology test asserts. Hoisting a lookup out of a loop can reorder side effects. Every finding names: the tests that pin the current behavior, the docs that describe the current shape, the cross-package callers of any changed signature, and backward compatibility. A finding that names only the hot path hides the real cost and ships half the change.

## The one rule that makes this skill trustworthy

**Never assert a speedup you did not measure.** No "2x faster," no "30% reduction," no "~10ms saved" — not in the report, not in the handoff. Until benchmarks exist, confidence is **mechanistic, not numeric**: a finding stands on the mechanism (allocation cost, polymorphism, redundant work) and the frequency (how often the path runs), not on an invented number. The moment you write a number without a benchmark behind it, the report becomes fiction, and fiction handed to plan becomes a contract built on a lie. Reasons and mechanisms generalize; fabricated numbers do not.

## Step 1 — Load the package and its hot paths

Ask the user which package to target; one per invocation, no mixing. Read, in parallel where possible:

a. `guides/code.md` — the Performance sections (Loops, Memory, Conditions, Decision Precedence, Mutation vs Immutable). This is the floor every finding is checked against.
b. `packages/[pkg]/AGENTS.md` — architectural ground truth; it names the hot paths and the non-obvious behaviors (ordering invariants, identity contracts, scheduling rules) that constrain what an optimization may change.
c. `packages/[pkg]/index.ts` — the public entry points. Each re-export is an **input** in the input > hot path > result trace, and the arbiter of `surface` vs `internal` scope at handoff.
d. Every file under `packages/[pkg]/lib/` **including `lib/internal/`** — the hot paths live here. Read in full; truncated reads of a hot path produce wrong conclusions. `lib/internal/` holds the hottest code (propagation, reconciliation, cache, resolution, deep conversion) and the most valuable findings.
e. Every file under `packages/[pkg]/tests/` — the behavior currently pinned. This is the blast radius: any optimization that would change observable order, identity, or scheduling must name the test it disturbs.
f. Every file under `packages/[pkg]/docs/` — the published shape; a perf change that alters a documented contract (return identity, call frequency guarantees) ripples here.

## Step 2 — Classify every path as hot or cold

Before proposing anything, classify. This classification is the gate — optimizing a cold path trades Clarity for nothing and violates Decision Precedence (Clarity outranks Performance, and Performance only "earns its cost against the hot path" per `code.md` line 5).

| Class | Runs in steady state | Examples |
|---|---|---|
| **Hot** | per-write / per-render / per-event / per-item / per-access | signal getter+setter, `propagate`/`propagateChange`, `createLink`, `validateStale`, ForEach reconcile, `delegatedHandler`, `renderProp`, cache hit/miss, route resolution, store deep-convert |
| **Cold** | once per lifetime, or rare | module init, template parse (cached after first call), first mount, error/dispatch handling, cleanup/disposal, `customElements.define`, config validation |

Cold findings are reported in a separate tier, flagged "cold — usually not worth it," with the Decision Precedence reasoning. Do not drop them silently (the user may know a path runs hotter than it looks — e.g. a "parse" that re-parses because the cache key is unstable), but never prioritize them above hot findings.

## Step 3 — Trace input > hot path > result; mine the ledger

For each **hot** path, trace the full input > hot path > result line, then look for the optimization categories below. Record every observation into a ledger entry. **No mechanism, no entry** — a hunch ("this looks slow") is not a finding; name the category or drop it.

### Optimization categories

| # | Category | Mechanism — why it's wasteful | `code.md` rule |
|---|---|---|---|
| 1 | Allocation in hot path | per-call `new Map/Set/Array/Object`, closure creation, `.slice/.map/.filter`, `Array.from`, spread `[…x]`, `Object.keys/entries/values`, per-iteration object literal | §Memory (clear/swap/lazy) |
| 2 | Iterator protocol | `for…of` / `for…in`, destructured iteration, spread of arrays, `yield`, `await…of` — allocates an iterator per traversal | §Loops (banned) |
| 3 | Polymorphism / megamorphic | a call site seeing many hidden classes; property access on unstable shapes; `arguments` object leak instead of rest/explicit params | — |
| 4 | Hidden-class drift | `delete`, conditional field-add after construction, out-of-order field init across "same" objects (core node shapes are deliberately field-stable — flag any drift) | §Naming |
| 5 | Redundant work | repeated lookups, re-resolution, re-reading a hot field inside a loop, recomputing invariants that don't change | — (beyond guide) |
| 6 | Missing fast path | common case (~99%) enters the slow path; no short-circuit before the heavy work (mirror of core's no-subscriber write bail) | §Conditions |
| 7 | Branch order | rare branch placed first so the common case pays not-taken-then-taken; unpredictable branches worth eliminating | §Conditions |
| 8 | Closure in loop | new function allocated per iteration | §Memory |
| 9 | Structure mismatch | `Map` where a fixed-key object/array wins; array scan where `Map`/`Set` lookup wins | — |
| 10 | Cache opportunity | identical re-resolution (template/selector/route/regex) repeatable via a **bounded** memo | §Memory (beware unbounded/stale) |
| 11 | Mutation vs allocation | hot internal path building fresh refs when in-place update is safe — OR mutating a shared/public ref callers expect to be fresh | §Mutation vs Immutable |
| 12 | Field/flag re-read | reading the same hot field or bitmask repeatedly instead of caching it into a local once | — (V8 loads) |

### Ledger entry shape (one per finding)

- **Path** — input > hot path > result, one line (the trace).
- **Anchor** — function name where the waste lives (survives edits; not a line number).
- **Observation** — the exact instruction / allocation / branch, quoted from source.
- **Mechanism** — the category from the table above + one sentence on why it's wasteful. This is the grounding; without it the entry is a hunch.
- **Frequency** — per-write / per-render / per-item / per-access, derived from the **input** in the Path line.
- **Confidence** — **Provable** (clear `code.md` violation or clear allocation bug — inspection settles it) / **Likely** (sound mechanism + high frequency; a bench will confirm) / **Speculative** (could go either way; bench needed).
- **Optimization** — one sentence: the change.
- **Guide status** — `fixes code.md §X` | `beyond guide (still compliant)` | `would-break code.md §Y → proposal` (emit the proposal in Step 5's Guide assessment).
- **Blast radius** — tests that pin current behavior, docs that describe the shape, cross-package callers, backward-compat. Unassessed blast radius means the entry is not ready for plan.
- **Manual verification** — see Step 4. Provable findings say "provable by inspection"; Likely/Speculative findings name a bench.
- **Priority** — P0 (Provable + hot + low blast radius) → P3 (Speculative, or cold, or high blast radius). Derive from Confidence × Frequency × blast-radius cost.

Mine ruthlessly: drop any entry that cannot name a category, merge overlapping entries, and prefer three solid findings over twelve speculative ones.

## Step 4 — Manual verification (benchmarks pending)

Benchmarks do not exist yet. Until they do, every Likely/Speculative finding carries a concrete manual-verification path — not a guess, and never an invented result:

- **Provable** — inspection is enough. The `code.md` violation or the allocation pattern is the proof; no bench is required to justify the fix.
- **Likely / Speculative** — propose a micro-bench: name the file (e.g. `examples/bench/[pkg]-[anchor].bench.ts`), the setup (build the steady-state graph/list/cache at realistic N), the operation to time (the hot path in isolation, not including mount), and the metric (ops/sec or ns/op across N iterations). The user runs it and reports back; the skill does not invent the number. If you cannot write a bench that would actually move from Speculative → Provable, the finding is not actionable yet — say so and defer.

This step is the single point of change when benchmarks land — see "Benchmark integration (pending)" at the end.

## Step 5 — Report inline

Render the report in the conversation. Do not write a file unless asked. Use this exact structure so the findings list is scannable and each item is self-contained enough to hand off to `/plan`:

```
## 1. Hotpath — [package]

### Summary
[N findings: A Provable, B Likely, C Speculative, D cold]
One-sentence overall assessment of the package's hot-path health.

### Hot-path map
[input > hot path > result line per primitive audited]

### Findings (ordered: Provable → Likely → Speculative → Cold; Frequency within tier)

#### [n]. [Provable|Likely|Speculative|Cold] — Anchor — short title
**Path**: input > hot path > result
**Mechanism**: [category #] — why it's wasteful
**Evidence**: `quoted excerpt from source`
**Frequency**: [per-write / per-render / per-item / per-access]
**Optimization**: [one sentence]
**Guide status**: [fixes §X | beyond guide | would-break §Y → proposal]
**Blast radius**: [tests / docs / callers / compat]
**Manual verification**: [bench file + metric | provable by inspection]

### Guide assessment
[guide-update proposals, if any — full shape: guides/code.md §section + rule quoted + conflict + proposed edit + reasoning. "No edits proposed" if the guide held up.]
```

Be critical but constructive. If a hot path is already tight (core's `propagate` is field-cached, flag-masked, stack-based, allocation-free in steady state — a model), say so explicitly. A run that manufactures findings to seem thorough is worse than one that says "clean."

## Step 6 — Hand off to plan

At the end of the report, list the findings by number and ask the user which (if any) to hand off to `/plan`. Do not auto-load `/plan` and do not write a plan file unprompted — hotpath reports; the user decides what becomes tracked work. A clean run with no actionable findings states that and stops, with no handoff offered.

Hotpath is **reactive discovery** (optimize-this), alongside audit (fix-this) and feature (add-this). All three feed plan the same shape — an evidence map — so plan's Phase 0 intake is identical regardless of source. For each finding the user chooses to hand off, produce:

- **Gap** — the one-sentence Optimization, rephrased as the target state plan will reach.
- **Scope hint** — `internal` (most hot-path findings live in `lib/internal/`, not re-exported by `index.ts`), `surface` (only if the waste is in the signature/return of a re-exported symbol), `scripts`, `tests`, `docs`. Plan re-verifies by reading `index.ts`.
- **Citations** — `{ file, anchor, what-it-shows }` per finding. The Anchor is verbatim (function name, not a line number). "What-it-shows" is the mechanism: for Provable, the violated `code.md` rule + section; for beyond-guide, the wasted-work category + the trace.
- **Confidence + Manual verification** — carried through verbatim so plan can seed a DoD item requiring the bench to pass (Likely/Speculative) or the guide rule to hold (Provable). This is how the "no invented numbers" discipline survives into the contract.
- **Type tag** — `Code` (almost always; performance work is internal code). Plan seeds the matching DoD block.

Let plan ask its own clarifying questions before writing — do not pre-answer them. A hot-path optimization usually needs scope narrowed (does it preserve scheduling order? does it preserve return identity? is the bench a DoD gate or advisory?) before it becomes a contract the worker skill can execute, and bypassing plan's Phase 0 produces shaky contracts.

When the user hands off a group of findings with one root cause (e.g. several per-render allocations that all trace to the same reconcile pass), produce ONE evidence map for the group, not N individual maps. The Gap describes the aggregate target; Citations covers all anchors; plan derives the task breakdown — individual findings become Contract.Files entries and DoD items, not separate plans.

## Step 7 — Self-check

For each finding marked for handoff:

a. Does the Path line name all three — input > hot path > result?
b. Does Mechanism cite a category number from the Step 3 table (not a vibe)?
c. Is Confidence assigned, and is the entry free of any unmeasured number or percentage?
d. Is Frequency derived from the input in the Path line (not assumed)?
e. Is Guide status explicit — fixes §X / beyond guide / would-break §Y?
f. Is Blast radius enumerated (tests, docs, callers, compat), not "medium"?
g. Does every Likely/Speculative finding carry a concrete Manual verification path (bench file + setup + metric)?
h. Was `lib/internal/` read in full?
i. Was `index.ts` read (the surface arbiter)?
j. Does the finding respect Decision Precedence — no Clarity-for-perf trade proposed on a cold path?

If any answer is no, fix it before handing off.

## Benchmark integration (pending)

Benchmarks do not yet exist; this skill runs on mechanism + manual verification. When a suite lands, update **only** these spots — they are pre-marked so the edit is surgical:

1. **Step 4** — replace "benchmarks pending" with: run the matching bench, capture baseline, apply the change, re-run, quote the measured delta with the bench file path.
2. **Confidence** — add a fourth level, **Measured**, that outranks Provable and is the *only* confidence that may carry a number. The "Never assert a speedup you did not measure" rule then becomes enforceable (Measured = cited bench) instead of aspirational.
3. **Step 5 report** — findings gain a `Measured: ±X% ([bench-file])` line in place of `Manual verification` when a bench exists; findings without a bench keep the manual path.
4. **Step 6 handoff** — Measured findings carry the bench result into plan's DoD as a numeric gate; Provable/Likely/Speculative keep the current mechanistic contract.

The "Never assert a speedup you did not measure" rule in the Non-negotiables stays verbatim — it is the invariant the benchmark integration makes *real* rather than *promised`.
