---
type: decision
title: Pass "as const" on string-literal props inside component() JSX-shape tests
description: Writing `component(Comp, { type: "replace", … })` in tests widens the literal to `string` and fails tsc (TS2345); add `as const` on the prop.
tags: [testing, compile-shapes]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [component-jsx-shape, ts2345-literal-widening, portal-compile-shape-test]
---
# Why

The JSX compile shape writes component props as a plain object literal. A string-literal prop like `type: "replace"` widens to `string` in that position, breaking the component's narrow prop type. The tagged-template shape (`html` with `type="replace"`) never hits this — so JSX-shape tests added to files whose existing tests are all `html`-shaped will fail at typecheck even though the runtime behavior is identical. Alternative to `as const`: a typed const outside the literal, but `as const` matches existing file convention (`portal.test.ts` line 23 `as const` on the test.each rows).

# Evidence

`packages/dom/tests/portal.test.ts` unit 03 of plans/dom/audit/tests: `component(Portal, { to: "#target", type: "replace", children: [...] })` produced `TS2345: Type 'string' is not assignable to type 'PortalInsertType | undefined'` under `bun coverage dom`; `type: "replace" as const` fixed it, exit 0 (455 pass / 0 fail, 2026-09-10).
