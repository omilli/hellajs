---
type: decision
title: Verify which checkout the docs dev server serves before diagnosing live-site bugs — the :4321 server can be a sibling checkout, not this repo
description: The docs dev server at localhost:4321 may serve a sibling checkout (e.g. ../hellajs-ui-cleanup) — fetch a served module URL and read its /@fs/ path before diagnosing live-site bugs from this repo.
tags: [environment, docs-site, debugging]
timestamp: 2026-10-12
last_confirmed: 2026-10-12
triggers: [docs-dev-server-checkout, live-site-bug-repro, browser-verify-fix]
---
# Why
Diagnosing a live docs-site bug from this repo's source silently diagnoses the wrong tree when the dev server runs from a sibling checkout at the same commit — source reads match, so nothing signals the divergence, yet rebuilt dist/ bundles here never reach the served site. Browser-verifying a fix then requires serving this repo's docs on a spare port (`bun astro dev --port 4322` in docs/), never mutating the sibling's source; its gitignored dist/ may be instrumented for diagnosis but must be restored from backup.

# Evidence
2026-10-12 alert-dialog reopen bug: `curl http://localhost:4321/src/demos/alert-dialog-demo.tsx` returned imports under `/@fs/home/milli/dev/hellajs-ui-cleanup/...` while the working repo was `/home/milli/dev/hellajs` (both at 617737e4; sibling on branch ui-cleanup with uncommitted demo/docs edits). Fix verified live via `bun astro dev --port 4322` from this repo after `bun bundle dom`.
