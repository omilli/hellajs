---
title: Bare vp test lacks --expose-gc; gc-canary tests false-alarm outside vp run coverage
description: Mid-flight `vp test` iteration fails WeakRef/gc canary tests (core computed auto-GC, dom list collections) with `ReferenceError: gc is not defined`; they pass under `vp run coverage` — a triage artifact, not a regression.
tags: [testing, triage, gc, vitest, weakref]
confirmed: 2026-10-21
---

# Why

During the core alien-signals rebase (wt/plans-core-code-alien-signals-rebase), mid-flight
`./node_modules/.bin/vp test packages/core/tests` reported two computed auto-GC failures with
`ReferenceError: gc is not defined` at `gc?.()` call sites; the same tests passed under
`vp run coverage core`. Identical false alarm in `packages/dom/tests/reactive-dynamic-children.test.tsx`
("releases item objects held only by the list collections").

# Fact

The gc-dependent canary tests require Node's `--expose-gc`, which the coverage gate's runner
provides and the bare `vp test` form does not. When iterating mid-flight, treat `gc is not
defined` failures as runner artifacts: re-verify with `vp run coverage <package>` before
debugging. Never add gc-availability guards to the tests — the coverage gate is the
environment contract.
