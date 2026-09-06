---
type: correction
title: lint:structure's Complete-Code parity check is LIVE (m flag fixed) with a single-file fallback — no manual replica needed
description: lint:structure's Complete-Code parity check is LIVE with a single-file fallback for one-fence tutorials — bun lint:structure is the parity oracle; 087's manual-replica workaround is retired.
tags: [docs, toolchain, tutorials, lint-guards]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [complete-code-parity, lint-structure-parity, tutorial-lockstep, single-file-tutorial]
supersedes: 087
---
# Why

The dead gate let tutorial drift accumulate invisibly, and plans substituted manual replicas (087's workaround) — which cost effort and, empirically, under-report: 087's replica enumerated four drifts but missed a fifth (UserProfile.tsx's trailing blank line), surfaced by the live gate on its first run. Manual parity replicas are strictly weaker than the gate; trust `bun lint:structure`.

The fallback exists because three guide-compliant tutorials (counter, theme-switcher, todo) document a single src file as one bare fence — the shape `guides/docs.md` §Tutorial Docs prescribes ("single-file apps as one block") — while the guard originally recognized only heading-keyed blocks, so a naive gate fix would false-positive all three ("exists but has no Complete Code block"). The fallback implements the guide's allowance: zero `### `src/...`` headings + exactly one documentable src file → the section (bounded by the next `## ` heading) must hold exactly one fence, byte-compared to that file; zero or multiple fences are findings of their own. A tutorial whose src tree grows past one file must switch to the heading-per-file shape.

# Evidence

- scripts/doc-structure.ts: `COMPLETE_CODE_RE = /^## Complete Code/m`; `checkTutorialParity` fallback branch with `completeCodeSection` / `blockMatchesFile` / `stripBreadcrumb` helpers (read in session, 2026-09-06).
- Liveness probes (2026-09-06): one-line drift in blog's `### `src/theme.ts`` block → exit 1 reporting `src/theme.ts Complete Code block drifts from the real file`; one-line drift in counter's lone fence → exit 1 reporting `src/main.jsx ... drifts`; reverts → exit 0. All seven example tutorials pass green.
- First live run surfaced two drifts: ssr-streaming theme.ts (stale css()-object block; fixed by pasting the real file verbatim) and blog pages/UserProfile.tsx (sole example src file ending `};\n\n`; normalized to single trailing newline, user-approved) — the latter absent from 087's replica enumeration.