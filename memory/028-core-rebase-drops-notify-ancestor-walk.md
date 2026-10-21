---
title: Core's alien-signals 3.2.1 rebase drops notify's ancestor walk; base queue ordering is the contract
description: The vendored `createReactiveSystem` port keeps the machinery verbatim but the host `notify` deliberately omits the vendored ancestor walk — it reordered parent gates ahead of same-write direct subscribers and broke dom/ui suite behavior; parents order through their own dependency writes.
tags: [core, alien-signals, scheduler, propagation, queue, rebase]
confirmed: 2026-10-21
---

# Why

Rebasing `@hellajs/core` onto alien-signals 3.2.1 (plans/core/code/alien-signals-rebase,
merged from wt/plans-core-code-alien-signals-rebase): the plan prescribed porting vendored
`notify`'s ancestor walk (queue armed parents, reverse the inserted span). Porting it verbatim
broke two sibling suites: a parent effect (dom's portal render gate, ui's exit-holding gate)
got queued at its child's notification position — consuming its `WATCHING` bit early — so a
later same-propagation write to the parent's own dependency could not re-notify it, and the
gate's early queue slot ran (unmounting + disposing content effects) before same-write direct
subscribers sitting later in the subscription list. Symptom: ui combobox reopen left the held
content node at `data-state="closed"`; the old engine ordered the gate via its own dep write
(a write inside the parent's run nests a flush after the direct subscribers).

# Fact

Host `notify` (packages/core/lib/internal/scheduler.ts) is append + `WATCHING` clear +
`SIGNAL_DEPS`→`DIRTY` marking only — **no ancestor walk, no span reversal**. Parent-before-
child ordering comes from the parent's own dependency write nesting a flush inside the
child-notification pass. The four strict-mode pins (accumulation, cancel-out, queue-intact
abort, throwing computed) are unaffected. Consequences: (1) unit 02's bench A/B compares old
engine vs this host — do not attribute ordering deltas to vendored 3.2.1 semantics; (2) any
future alien-signals version bump must re-derive the host `notify` against the existing suite,
not port upstream's.
