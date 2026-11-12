---
title: Capture scheduled drain throws via a queueMicrotask stub
description: Vitest fails a test file on a scheduled-drain rejection even with a process "unhandledRejection" listener attached; capture the scheduler's microtask by stubbing globalThis.queueMicrotask (original restored in finally) and invoke the callback under expect(() => ...).toThrow.
tags: [testing, vitest, scheduler, microtask, unhandled-rejection]
confirmed: 2026-11-12
---
# Why

Effects that throw inside a microtask-scheduled drain surface as unhandled microtask rejections. Pinning that semantics in a test cannot go through `process.on("unhandledRejection", handler)` + `await delay()`: vitest installs its own unhandled-rejection tracking and still reports the rejection as a file-level error, failing the run even though the assertions passed (verified empirically: the listener captured the error, the test body passed, the run exited 1 with `Errors 1 error`). The stub approach keeps the rejection out of the runner while still asserting the drain's abort semantics: the captured callback is invoked synchronously inside `expect(() => scheduled[0]!()).toThrow(...)`, and the stub is restored in a `finally` per the patched-globals rule so later writes hit the real `queueMicrotask`.

# Evidence

Empirical probe run under `./node_modules/.bin/vp test packages/core/tests` (2026-11-12): a scratch test attaching `process.on("unhandledRejection")` passed its own assertions but the file failed with an unhandled-rejection error attributed by vitest; the same scenario using a `globalThis.queueMicrotask` capture (original restored in `finally`) passed clean. Working example: `packages/core/tests/flush.test.ts`, test "the scheduled drain aborts on a throw and preserves queue survivors for the next flush".
