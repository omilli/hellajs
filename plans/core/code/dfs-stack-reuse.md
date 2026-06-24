# [ ] dfs-stack-reuse

## Contract

### Surface change
no

### Package
core

### Guide governance
- Files ← code.md §Package File Structure, §Files, §Benchmark Files, §Memory, §Loops

### Files
- packages/core/lib/internal/propagation.ts — modify — `propagateChange` (the `stack = { sv: lns, sp: stack }` allocation at the fan-out descent branch)
- packages/core/lib/internal/validation.ts — modify — `validateStale` (the `stack = rs || lps ? { sv: link, sp: stack } : stack` allocation)
- packages/core/benchmarks/propagation.bench.ts — create — bench harness (fan-out + deep-chain graphs)

### Tests view
No new test file. The DFS traversal-order and glitch-free single-execution invariants this optimization must preserve are already pinned by `tests/topology.test.ts` — specifically the jagged-diamond-with-tails `invocationCallOrder` assertions and the skip-update / lazy-branch scenarios. Per `tests.md` §Files and core's public-surface-only testing approach (`packages/core/AGENTS.md` "Testing approach"), these existing tests are the regression guard; a duplicate ordering test would re-assert what topology.test.ts already covers.

### Docs view
No impact. The change is internal (`lib/internal/`). `docs/concepts/reactivity.mdx` "Internal Mechanics" describes doubly-linked connections but not the stack-frame representation. The `Stack<T>` type in `lib/types.d.ts` is intentionally retained (removing it would be a separate Surface change: yes plan). Per `docs.md`, nothing to publish.

---

## [ ] Benchmark DFS stack allocation + capture baseline (Code)
**Type:** Code
**Depends on:** None

### Strategy
The finding is Speculative — the mechanism (per-fan-out-node `{ sv, sp }` heap allocation during DFS) is real, but young-gen allocation in JSC/V8 is fast and the alien-signals lineage chose the linked-list deliberately, so the cost may be unmeasurable. This task establishes the measurement before any optimization code is written. Create `packages/core/benchmarks/propagation.bench.ts` extending the existing mitata harness (`benchmarks/signals.bench.ts`), with two graphs that stress the two allocation paths: (a) fan-out — one signal feeding computeds each read by two effects, so each computed has multiple subscribers and `propagateChange` pushes a frame on every write propagation; (b) a deep computed chain behind one effect with intermediate subscribers, forcing `validateStale` recursive stack allocation. Time signal writes over a large iteration count, excluding mount; metric is ops/sec. Run each graph multiple times to establish run-to-run variance. Record the baseline medians in this Strategy block. `bun check core` excludes `benchmarks/` (verified: exits 0 today with the existing bench), so the bench is verified by running it, not by check.

### Definition of Done
- [ ] `packages/core/benchmarks/propagation.bench.ts` exists with a fan-out graph (one signal, multiple computeds each with multiple subscribers) and a deep-chain graph (multi-level computed chain)
- [ ] `bun ./packages/core/benchmarks/propagation.bench.ts` runs to completion and prints ops/sec for both graphs
- [ ] Baseline medians (multiple runs each) recorded in this task's Strategy block above
- [ ] Run-to-run variance noted (so Task 2 has a noise floor to compare against)

## [ ] Optimize DFS stack (or verify no-op) (Code)
**Type:** Code
**Depends on:** Benchmark DFS stack allocation + capture baseline

### Strategy
Only proceed once Task 1's baseline is on file. Replace the linked-list-of-frames stack in both `propagateChange` and `validateStale` with a preallocated array plus a depth-index pointer owned by each module (two separate arrays, not one shared — `validateStale` can run mid-flush during lazy computed evaluation, so separate stacks avoid reentrancy reasoning; a shared stack would be less memory but adds a coupling invariant). Reset via index zeroing, never reallocate (code.md §Memory). The critical invariant is EXACT DFS traversal order — the array-stack must push and pop in the same sequence as the linked-list, preserving glitch-free single execution, the no-double-queue guarantee, and visitation order. Decision rule: keep the optimization only if the array-stack variant shows a delta on the fan-out graph that exceeds the Task-1 noise floor (medians separate across multiple runs). If the delta is within noise, revert the optimization and close the plan as a verified no-op — noise is a legitimate, expected outcome given the lineage and young-gen allocation speed; the finding's value was confirming the mechanism's cost rather than assuming it. Decision Precedence: Correctness (order preserved) outranks Performance.

### Definition of Done
- [ ] `bun check core` exits 0
- [ ] `bun lint` exits 0
- [ ] `propagation.ts` `propagateChange` modified: linked-list `{sv,sp}` frames replaced by array + index (or reverted per the decision rule)
- [ ] `validation.ts` `validateStale` modified: same
- [ ] Bench re-run after the change; delta vs the Task-1 baseline recorded in this Strategy block
- [ ] Either the array-stack variant is in place with a delta exceeding the noise floor, or it was reverted and this line records "no measurable improvement — closed as verified no-op"
- [ ] `tests/topology.test.ts` passes — specifically the jagged-diamond-with-tails `invocationCallOrder` assertions (DFS visitation order preserved)
- [ ] No new runtime dependency
- [ ] Backward compatible — internal change; `Stack<T>` type retained in `lib/types.d.ts`
- [ ] Contract Tests-view and Docs-view hold — no sibling tasks needed; the "no impact" reasoning above is accurate against the actual change
- [ ] Audit skill run on changed files (`propagation.ts`, `validation.ts`) reports no `code.md` deviations
