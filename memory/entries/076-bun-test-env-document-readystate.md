---
type: correction
title: "bun test env document.readyState is \"interactive\" (HappyDOM under utils/happydom.js preload) — the \"always complete\" assumption is false; readyState gates and test shadows must be written against \"interactive\""
description: bun test's readyState is 'interactive' and never advances — gates must not assume 'complete'; tests drive gated branches by shadowing readyState (defineProperty) plus manual readystatechange.
tags: [testing, happydom, hydration, dom]
timestamp: 2026-09-02
last_confirmed: 2026-09-02
triggers: [readystate-shadow, readystate-gate, happydom-preload-env, defer-gate-testing]
---

# Why

Plan `plans/dom/code/behavior-gaps/04-selective-hydration.md` originally gated Suspense-region deferral on `readyState !== "complete"`, premised on "HappyDOM's readyState is always `complete`" (so no existing test would ever defer). Measurement falsified the premise: the env is `"interactive"`. Under the original gate, every hydrate-suspense test whose staged template is missing would defer instead of degrading, breaking `packages/ssr/tests/hydrate-integration.test.ts`'s degrade contract. The corrected gate `=== "loading"` is also truer in the browser: only a script parsed mid-document can still receive later stages — once parsing finishes, nothing more arrives.

The env value is load-bearing for two future audiences: authors of readyState-gated production code (the env their tests run in is `"interactive"`, not `"complete"` — a `!== "complete"` gate is a deferred-in-every-test footgun) and authors of tests that must drive a gated branch (shadow + manual `readystatechange`, since nothing advances the value on its own).

# Evidence

- Measured this session: `bun --preload ./utils/happydom.js -e 'console.log(document.readyState)'` → `interactive`; `bunfig.toml` wires `[test] preload = "./utils/happydom.js"`.
- `packages/dom/lib/internal/hydrate.ts:651` — the corrected defer gate: `swappedStage.sentinel && swappedStage.missing && document.readyState === "loading"`.
- `packages/dom/tests/hydrate-selective.test.ts` — the `withReadyState` shadow pattern (instance `Object.defineProperty` + try/finally `Reflect.deleteProperty` restore, `readystatechange` dispatched manually after restore); its back-compat case ("adopts synchronously when the template is present and parsing is done") relies on the env's real `"interactive"` value NOT deferring under the `=== "loading"` gate.
- Plan gate-correction note: `plans/dom/code/behavior-gaps/04-selective-hydration.md`, Code task item 2.
