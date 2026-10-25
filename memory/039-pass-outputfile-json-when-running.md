---
title: Pass --outputFile.json when running vp test with the json reporter
description: "`./node_modules/.bin/vp test <paths> --reporter=json` alone writes only a stub to stdout and drops the real blob at .vitest/json/output.json — which then trips the fmt check in `vp run lint`."
tags: [vitest, reporter, json, triage, lint]
confirmed: 2026-10-24
---
# Why

The json reporter's default sink is `.vitest/json/output.json`, not stdout: a bare
`--reporter=json` run captures a 111-byte pointer line instead of the report, and the
untracked scratch file it leaves behind fails `vp check`'s formatting gate on the next
`vp run lint` (four-file "formatting issues" list including the json). Both cost a
round-trip per failure-enumeration run — the machine-readable failure list pattern
(scoped or full-suite triage) wants the report at an explicit, gitignored path.

# Evidence

Command shape that works (verified 2026-10-24, ui suite enumeration):

    ./node_modules/.bin/vp test packages/ui/tests --reporter=json \
      --outputFile.json=packages/ui/tests/.tmp/logs/<name>.json

`--help` documents both flags; the default-path behavior is printed by the bare run
("JSON report written to .../.vitest/json/output.json"). Clean up a stray default sink
with `rm -rf .vitest/json` before re-running lint.
