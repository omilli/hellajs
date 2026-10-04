---
type: decision
title: css() and style() objects nest like Sass — never repeated prefix selectors
description: Nested keys compose as descendant selectors under the parent (`&` replaces it); write `main { h2 { code {} } }`, never flat `main h2 code` keys.
tags: [css, convention]
timestamp: 2026-10-03
last_confirmed: 2026-10-03
triggers: [css-nesting, style-object, selector-prefix, docs-rebuild, prose-styles]
---
# Why
User directive during the site-foundation rebuild (07 review gate): "we are able to nest rules in the same way sass and other pre processors do. no need for repetitive like main h2 code selectors. This must be universal across ALL css/styles during this rebuild." Flat prefix selectors were rejected in review and rewritten (09's chrome-css.ts redone at its review gate for the same reason). Applies to every css()/style() object in the docs rebuild (units 08–11) and site chrome. What breaks if ignored: review redo, inconsistent style surface across the rebuilt site.

BOUNDARY: `&` substitution is LEADING-ONLY — `key.startsWith("&")` gates the replace. `&` in combinator position (`"#state:checked ~ &"` under `.subject`) falls to the descendant-composition branch and emits `.subject #state:checked ~ &` with a literal `&` left in the selector — invalid css, silently dropped. State-keyed selectors whose subject is not the shared prefix (checkbox/drawer sibling rules) must stay top-level keys; each is unique, so the no-repeated-prefix directive is not violated. Re-confirmed when 09's first nesting pass emitted `#nav-drawer:checked ~ &` verbatim into the built head.

# Evidence
User correction in the 07 session; composition semantics verified in `packages/css/lib/css.ts` `process()` — `key.startsWith("&")` gates `AMP_REGEX` replacement; every other key under a non-empty selector emits `` `${selector} ${key}` `` (descendant). Leading-& emission verified byte-identical in built docs css: `docs/src/styles/prose.ts` nested form produces `main table th{`, `main ul > li::marker{`. Combinator-& failure reproduced 2026-10-03: `docs/dist/learn/concepts/reactivity/index.html` head carried `.site-nav #nav-drawer:checked ~ &{transform:none}` until the rules moved to top-level keys.
