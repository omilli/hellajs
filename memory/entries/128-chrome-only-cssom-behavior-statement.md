---
type: decision
title: "Chrome-only CSSOM behavior (statement inserts, index rebasing) is verifiable from the real bundle by stubbing globalThis.document with an accepting fake sheet"
description: When happy-dom rejects the insert (049), pin client-side placement/rebase by stubbing globalThis.document with an accepting fake sheet — the real upsertRule/shiftIndexesUp/removeRule flow runs.
tags: [testing, css, cssom]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [cssom-stub-probe, statement-insert, happydom-rejects-insert, chrome-only-cssom, index-rebase-verify]
---

# Why

happy-dom's `insertRule` rejects every block-less statement form (`@import …;`, `@charset "…"`), so client-side placement (insert-before-braced) and the insert-shift index rebase (`shiftIndexesUp`) are unobservable under the test DOM — the plan for statements (plans/css/audit/code/03) pinned only server text + the warn surface, leaving the rebase untested. A `bun -e` probe from `packages/<pkg>` (056) can run the REAL bundle's full client flow: set `globalThis.document` to `{ head: { insertBefore() {} }, createElement: () => ({ sheet }), getElementById: (id) => id === "hella-css" ? el : null }` where `sheet` is splice-based (`insertRule(text, i) { rules.splice(i, 0, { cssText: text }); return i; }`, `deleteRule(i) { rules.splice(i, 1); }`, `get cssRules() { return rules; }`). `hasDocument()` is a lazy `typeof document` check (core `internal/env.ts`), and `getSheet` resolves the stub via `getElementById`, so `upsertRule`/`removeRule`/rebase all execute for real. Removal precision is the strongest assert: register braced text, then a statement (shift happens), then `removeCss` the braced object — a failed rebase deletes the wrong rule. Not a committed test shape (registerText's split and stub fidelity make it probe-only); it is verification evidence for Chrome-only contracts.

# Evidence

Probe this session (worktree plans-css-audit-code, unit 03): `css({body:{margin:0}})` then `css({'@import':'url("x.css")'})` → sheet `[@import url("x.css");|body{margin:0px}]`; `removeCss({body:{margin:0}})` dropped body (stored index shifted 0→1), leaving the statement; mixed text registered 2 segments and `removeCss` dropped both (ruleCount includes statements). Complements 049 (assert via server text when the DOM diverges) and 085 (split correctness via cssRules counts) — this covers the case where the insert itself is the unobservable.
