---
title: doc-snippets strict tier skips any block containing the ❌ mark
description: "A fenced doc block whose text contains ❌ anywhere (bad-pattern marks, even mixed with ✅ lines in the same block) is dropped wholesale from `vp run doc-snippets`' strict corpus, so its code is never typechecked."
tags: [doc-snippets, docs, verification, bad-pattern-examples]
confirmed: 2026-11-07
---
# Why

Docs authors who assume ❌-marked blocks are typechecked will either avoid legal bad-pattern idioms (e.g. the implicit-any `(query) => { query.q }` half of an arity-dispatch good/bad pair, where the wrong point REQUIRES the loose signature) or claim strict-tier coverage for code the tier never saw. The diagnostics disappear because the block left the corpus, not because it passes; a typo inside an intentionally-wrong example is invisible to the gate. Same skip family as the external-import skip (node/http, vitest, express) recorded separately.

# Evidence

Source (2026-11-07): `scripts/doc-snippets.ts` header "Skips (a skipped block is not checked — marking, not fixing): Blocks containing the ❌ mark (intentional bad-practice examples)." Empirical: `rg searchHandler` over `.doc-snippets/run-*/strict/packages_router_docs_api_router_mdx.ts` returns nothing while the mdx's Arity-Based Dispatch block (❌ + ✅ halves in one fence) declares it; the emitted module carries 15 AUDITSRC blocks for a doc with more executable fences.
