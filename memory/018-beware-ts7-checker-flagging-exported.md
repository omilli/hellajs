---
title: Beware TS7 checker flagging exported-let seams when a second symbol shares the setter-adjacent name
description: A TS2304 "Cannot find name" on a setter that visibly exists usually means its name was typo'd at the import site — the TS7 checker reports the confusion against the declaration's neighborhood, not the import.
tags: [typescript, tsc, debugging, ts7, import-typos]
confirmed: 2026-12-17
---
# Why      A long bisect can go hunting for a checker bug in exported-let + interface-setter patterns (suspected name-collision with synthesized export setters) when the real cause is a one-word import typo. The reducer that settles it: copy the file to `lib/internal/zzprobe.ts`, append `export const zzProbe = typeof <setter>`, run tsc — if the probe fails too, inspect the import site before suspecting the compiler.
# Evidence  `features/errors.ts` imported `setDispatchError` while `internal/dispatch.ts` exports `setErrorDispatch`; tsc reported "Cannot find name 'setDispatchError'" and TS7 emitted exit code 0 alongside the errors (gate on stderr lines, never the exit code). Probe + import-site read resolved it in minutes; the collision hypothesis was disproven by a minimal `setSeam` repro that typechecked fine.
