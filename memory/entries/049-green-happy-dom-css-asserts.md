---
type: decision
title: "Green happy-dom CSS asserts do not prove browser-valid CSS — invalid structures parse to silent empty rules in BOTH engines, and happy-dom diverges from Chrome on at-rule support and cssText serialization"
description: Green happy-dom CSS asserts do not prove browser validity — invalid structures parse to silent empty rules in BOTH engines; happy-dom diverges from Chrome on at-rule support and cssText serialization.
tags: [testing, css, happydom, cssom]
timestamp: 2026-09-10
last_confirmed: 2026-09-18
triggers: [happydom-css-text, invalid-css-masked, at-rule-assert, cssom-serialization, unknown-property-drop]
---

# Why

Two distinct failure surfaces hide behind a green css test suite:

1. **Silent-empty parsing (both engines).** An emitter bug produced double-brace text (`@font-face{{font-family:…}}`) — `~130` substring assertions (`toContain("font-family:…")`) passed for the package's entire published life while every browser parsed the rule to an empty block: fonts never loaded. No engine throws on the invalid nested block; both happy-dom and Chrome accept it and drop the declarations. Substring matching cannot see structure — hence the guides/tests.md exact-form rule.

2. **happy-dom ↔ Chrome divergence.** happy-dom's `insertRule` rejects `@layer` and `@starting-style` outright (Chrome accepts both), so CSSOM-composition asserts for those at-rules are impossible under happy-dom — use the server text return (same `process()` derivation) instead. And happy-dom's `cssText` serialization normalizes (`0` → `0px`, `from` → `0%`, quoted font-family loses quotes, trailing `;}` before `}`, spaces inside `rgba(...)`, conditional-at-rule query colon-space collapses (`@media`/`@container` `(min-width: 400px)` → `(min-width:400px)`) while the space after the at-rule name is retained), so exact-form asserts go through the `getStylesheet` squeeze (utils/test-helpers.js) with those mappings applied empirically, never guessed.

3. **Unknown-property declarations drop at parse time (happy-dom ≥20.14, like Chrome).** A round-trip assert on a declaration whose key is not a real CSS property (e.g. a `label:x` bag-disambiguation pin in `style(base, { label: 'x' }, opts)`) can never hold: `insertRule('.h{color:red;label:x}')` serializes back as `.h { color: red; }`. happy-dom 20.3.4 preserved such declarations (tests landed green under it); the caret-range install that came with the ui registry work (4366d850) bumped to 20.14.5, which parses browser-accurately and silently broke the round-trip assert. Pin such emissions via `cssText()` (the collector joins pre-parse `injectedMap` text), never the sheet — hosted registrations are excluded from the collector, so derive the same-text document registration and pin through that (`packages/css/tests/style-compose.test.ts`).

# Evidence

- Real Chrome (Playwright, this session): `insertRule('@font-face{{font-family:"Inter";src:url(x.woff2)}}')` → accepted, serialized `@font-face { }` — declarations gone; same for `@media (max-width:768px){{font-size:12px}}` → `@media (max-width: 768px) {\n}`.
- happy-dom under `utils/happydom.js`: same silent-empty parse for the double-brace forms (pre-fix `@font-face` tests saw `@font-face{}`); `@layer`/`@starting-style` insertRule throws; cssText normalization set captured empirically during the single-write-path migration (`plans/css/code/css-critic-fixes/`, `bun coverage css` 127 pass after fixes).
- Dual exact pins landed for `@font-face`/`@container` (`packages/css/tests/css-at-rules.test.ts`, 2026-09-10, `bun coverage css` 213 pass): emission `@container (min-width: 400px){…}` vs CSSOM squeeze `@container (min-width:400px){…}` — query colon-space collapses, at-rule-name space retained; `@font-face` emission quotes the family (`font-family:"Inter"`), CSSOM drops the quotes.
- Fix + convention landed: `getStylesheet` helper + capture-before-assert + happy-dom at-rule caveats documented in `packages/css/AGENTS.md` §Testing; exact-form anti-pattern in `guides/tests.md` §Anti-Patterns.
- Unknown-property drop (2026-09-18, this session): under happy-dom 20.14.5, `insertRule('.h-12g2qf3{color:red;label:x}')` → `.h-12g2qf3 { color: red; }` (repro via `bun --preload ./utils/happydom.js -e`; bare `bun -e` lacks the bunfig preload). Lib emission verified correct through the collector: `cssText()` → `.h-12g2qf3{color:red;label:x}`. Test fixed to assert the engine-preserved sheet form + collector-pinned full emission; `bun coverage css` 240 pass. Caveat documented in `packages/css/AGENTS.md` §Testing.
