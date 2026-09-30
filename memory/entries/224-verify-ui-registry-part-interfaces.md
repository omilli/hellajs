---
type: decision
title: Verify ui registry part interfaces before documenting example props
description: ui registry part components forward only explicitly rendered props — grep the component body before putting a prop in a doc example, or the doc teaches a dropped prop.
tags: [ui, docs]
timestamp: 2026-09-29
last_confirmed: 2026-09-29
triggers: [component-docs, registry-parts, prop-contract]
---
# Why

HellaJS ui components read props explicitly (no spread-to-element), so any prop not named in the component body is silently dropped. `NativeSelectOptGroup` declares only `{ children, class }`, yet `native-select.mdx` documented `<NativeSelectOptGroup label="Standard">` — the rendered `optgroup` carried no `label` attribute, so the example taught an API that cannot work. Docs-only sweeps must document the interface as it is (plain native `<optgroup label>` for headings) and route the source gap to `plan`; the same check applies to every part API in later sweep units (select, combobox, command).

# Evidence

`packages/ui/registry/native-select/native-select.tsx` `NativeSelectOptGroup` renders `<optgroup data-slot class>{children}</optgroup>` with no `label` read; identical body in `native-select-html.ts` and both tailwind flavors (`docs/src/generated/install/native-select.json`); repo-wide `rg "NativeSelectOptGroup"` shows the doc example was the only `label` passer.
