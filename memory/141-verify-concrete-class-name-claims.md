---
title: Verify concrete class-name claims in css docs by replicating hash derivation inline
description: Concrete class/animation-name claims in packages/css docs (e.g. "card-izfpuyv", "kf-uwtnhf") are checkable by replicating internal/shared.ts hash+stringify in a node -e one-liner; importing the internal module directly fails under bare node.
tags: [docs, css, hash, verification, node]
confirmed: 2026-11-20
---

# Why

Doc examples that print an exact hashed class (`"card-cqknezd"`) or animation name (`"kf-uwtnhf"`) silently rot when the example object changes: the hash covers the object's contents, so any edit to the example's declarations invalidates the printed name. Copying a hash comment from a sibling example is the usual failure route (observed: a rewritten `style()` basic-usage example carried the previous object's hash). An unverifiable-looking claim stays wrong until a reader pastes the code and sees a different class.

# Evidence

`packages/css/lib/internal/shared.ts` — `hash()` is DJB2 re-encoded as bijective base-26 letters; `stringify()` serializes with keys sorted at every depth. Both are dependency-free (`hash` uses no imports; `stringify` only `isObject`), so a `node -e` replication of ~20 lines reproduces them exactly. Verified 2026-11-20: replicating the functions and hashing the style.mdx basic-usage object yields `card-izfpuyv` (correcting a stale `card-cqknezd`); the keyframes spin object yields `kf-uwtnhf`. Direct `node --input-type=module` import of `./packages/css/lib/internal/shared.ts` fails with ERR_MODULE_NOT_FOUND: the package's extensionless internal imports do not resolve under bare node strip-types (only `vp`/vite pipelines resolve them). Alternative check path: a scratch test importing from the built `dist/` bundle — heavier; the inline replication is the one-liner.
