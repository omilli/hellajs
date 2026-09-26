---
type: correction
title: Bare-identifier extraction over TS source needs the compiler AST, not regex string-blanking
description: Line-based string-literal blanking erases template interpolations (`class="${id}"` reads as a quoted span); collect Identifier nodes via the TypeScript API instead.
tags: [tooling, typescript]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [registry-canonical, placeholder-derivation, identifier-extraction, template-literal]
---
# Why

HTML-flavored sources are backtick templates whose double quotes are literal text, so quote-pairing blankers see `class="${srOnly}"` as a string and drop the reference. Text transforms also false-positive on comments and JSX attribute names. The compiler API gives the true reference set: walk `Identifier` nodes, skipping `.prop` names (`PropertyAccessExpression.name`), object keys (`PropertyAssignment.name`), JSX attribute names, and declaration names. `ts.createSourceFile` with `setParentNodes = true` and `ScriptKind.TSX` for `.tsx` is enough — no full program needed.

# Evidence

plans/ui/code/registry-canonical-placeholders unit: the plan's blanking rule left 13 references undeclared across 5 `-html.ts` canonicals (tsc TS2304/TS2552: `srOnly`, `dialogTitle`, `hiddenUntilSm`, `separatorBase/Rule/Content`, `errorList`, `icon`, `dialogDescription`); the AST re-derivation reproduced the plan's probed red set exactly (one error, slider `aria-valuenow`). Full gate `bun coverage ui` exit 0.
