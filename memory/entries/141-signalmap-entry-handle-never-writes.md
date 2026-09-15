---
type: decision
title: SignalMap entry(k) returns a computed whose call ignores write arguments — entry writes never apply on any container
description: Store Map `entry(k)(v)` is never an applying write — the handle is a core computed that drops the argument (writable containers included); only `nodeAt(i)` returns a writable handle.
tags: [contract, testing]
timestamp: 2026-09-15
last_confirmed: 2026-09-15
triggers: [signalmap-entry-handle, entry-write-test, collection-guard-audit, readonly-forwarding]
---
# Why

A plan or test naturally reads `entry(k)` as the Map analogue of `nodeAt(i)` and asserts "write applies" — it cannot. The computed call closure reads no arguments, so a `entry(k)(v)` write is a silent no-op everywhere; only the guard's throwing stub turns it into an error on readonly keys. Asserting an applied entry write produces an unfixable red (Expected 42, Received 1) and wastes a debug round on core behavior, not the change under test.

# Evidence

`packages/core/lib/signalMap.ts` (`container.entry = (k) => { … return computed(…) }`) — the handle is a computed; `packages/core/lib/computed.ts` — the returned closure never inspects `arguments`; write is dropped. Hit this session: plan unit `plans/store/audit/code/02-readonly-nodeat-entry-leak.md` test scenario "(write applies)" failed with Expected 42 / Received 1; corrected per operator decision to assert a live handle tracking a later `$update`.
