---
type: decision
title: "html`` dynamic-component closers match nearest open dynamic node, never by slot index — open and close markers are distinct expressions"
description: "html`` open `<${C}>` and close `</${C}>` markers are separate expressions (slots 0 and 2), so closer matching by __SLOT_N__ identity never matches; close the nearest open dynamic component."
tags: [arch, dom, babel, contract]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [dynamic-component-closer, slot-marker-identity, html-close-semantics, ancestor-match-closer, parser-stack-machine]
---
# Why

`html\`<${Portal} to="#t">x</${Portal}>\`` interleaves to `<__SLOT_0__ to="#t">x</__SLOT_2__>` — the open and its closer are DIFFERENT slot markers. A stack machine that closes by matching the closer's marker name against the open's tag (the natural port of named-tag ancestor matching) silently ignores every dynamic closer: nodes stay open, later siblings nest inside the wrong component, and slot indices shift downstream. Verified empirically: marker-identity matching broke dom `portal.test.ts` (multiple portals) and both `hydrate-selective` tests; the pre-fix blind pop "worked" only because closers were name-agnostic.

Correct rule (both parsers, `plugins/babel/src/parsers/html.mjs` + `packages/dom/lib/internal/template.ts`): a closer matching `/^__SLOT_\d+__$/` closes the nearest open dynamic component on the stack (plugin: node tag matches the slot pattern; runtime: `"dynamicComponent" in open`); named closers match by tag; anything unmatched is stray and dropped.

# Evidence

- Probe (2026-09-06): `html\`<div><${P} to="#t"><span id="pa">${a}</span></${P}><${P}...b</${P}></div>\`` — slots 0(P open), 1(a), 2(P closer), 3(P open), 4(b), 5(P closer); marker-identity matching left the second Portal nested inside the first's children with `dynamicComponent: 3` / `placeholder: 4`.
- `bun test packages/dom/tests` after marker-identity attempt: 3 fail (portal multiple-targets, hydrate-selective x2); after nearest-dynamic rule: 453 pass / 0 fail. Plugin: 256 pass / 0 fail.
- Plugin side: `transform.test.ts` `<${Comp}>text</${Comp}>` passed under broken matching only because EOF flush compensates when the closer is last; `<${Comp}>text</${Comp}><div>y</div>` exposed it (verified probe: sibling div nested inside the component pre-fix).
