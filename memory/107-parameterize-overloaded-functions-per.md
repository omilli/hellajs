---
title: Parameterize overloaded functions per row with literal calls, not union-typed row factories
description: In test.each rows over an overloaded function, rows carry the data variant and the row body makes one literal call per overload — a union-typed factory result matches no overload arm and fails TS2769.
tags: [tests, test-each, overloads, typescript, ts2769, ssr]
confirmed: 2026-11-04
---
# Why

`doc` declares two overloads discriminating on the body field — `{ body: string }` and `{ body: ReadableStream<string> }` (packages/ssr/lib/doc.ts). A row factory typed `() => string | ReadableStream<string>` makes the call argument a union, which matches neither overload arm: tsc fails the row body with TS2769 "No overload matches this call". The compilable parameterization: rows carry only the data variant (`make`), and the row body asserts both modes with literal calls — the shape the mount-selector `test.each` in packages/ssr/tests/doc.test.tsx already uses. A single row factory per body mode cannot compile, so "one row per mode" parameterizations of `doc` are structurally impossible, not a formatting choice.

# Evidence

- tsc probe on packages/ssr/tests/doc.test.tsx (2026-11-04): `error TS2769: No overload matches this call ... Type 'string | ReadableStream<string>' is not assignable to type 'ReadableStream<string> | (string & ReadableStream<string>)'` at the `doc({ body: body(), ... })` row body.
- Overload declarations: packages/ssr/lib/doc.ts (`export function doc(options: DocOptions & { body: string })` / `(options: DocOptions & { body: ReadableStream<string> })`).
- The two-literal-call row shape passes the gate: `vp run coverage ssr` exit 0, 225 tests passed, 100% lines.
