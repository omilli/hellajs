---
type: fact
title: "insertRule whitespace tolerance is asymmetric — leading newlines parse, trailing whitespace and whitespace-only segments are rejected"
description: "happy-dom accepts rule text with a leading newline but rejects trailing whitespace and whitespace-only inserts; pretty emission must terminate every segment on `;` or `}`."
tags: [css, cssom, happydom, emission-format]
timestamp: 2026-10-04
last_confirmed: 2026-10-04
triggers: [pretty-print-emission, insertrule-payload, segment-trailing-whitespace, css-text-grammar, multi-rule-split]
---
# Why

The css package's pretty-printed emission separates sibling rules with `\n`, so `registerText`'s depth-0 split hands `upsertRule` segments that begin with a newline (whatever follows a `;`/`}` boundary). That is safe only because of an asymmetry in the platform's `insertRule`: leading whitespace before a rule parses fine, but trailing whitespace after a statement (`'@import url("x.css");\n'`) and whitespace-only inserts (`'\n'`) throw. The grammar therefore keeps newlines as *separators*, never *suffixes* — every segment terminates on `;` or `}` — which is why the split in `lib/internal/injection.ts` needed no changes for pretty output. A future format tweak that emits trailing newlines (or blank-line padding *inside* one registration) would push statements into the warn-and-skip rejection path silently: server `cssText()` stays green while the client sheet loses rules.

# Evidence

Probe this session against happy-dom 20.14.5 (scratch test file under `packages/css/tests/`, preload applied): `insertRule('\n.a {\n  color: red;\n}', 0)` inserts and re-serializes to `".a { color: red; }"`; `insertRule('\n', n)` throws "Failed to parse the rule"; `insertRule('@import url("x.css");\n', n)` throws the same. Shipped shape: `lib/css.ts` `process()` joins segments with `\n` separators and ends every emission on `}`/`;`; `packages/css/tests/sheet-warn.test.ts` "inserts every segment of a multi-rule pretty registration without warning" pins the accepted leading-newline form.
