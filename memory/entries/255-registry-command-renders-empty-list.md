---
type: correction
title: "Registry Command renders an empty list without `items` — group keys derive from props.items only"
description: "The Command root builds body group keys from orderedGroups(props.items); a filter-only Command renders nothing forever — pass a static items array to seed the ungrouped key."
tags: [ui, registry, command]
timestamp: 2026-06-27
last_confirmed: 2026-06-27
triggers: [command-palette, async-results, filter-prop, registry-compose]
---
# Why
`renderBody` takes its group keys from `orderedGroups(items)` where
`items = props.items ?? []`; the ungrouped branch is the `""` key. With
`filter` set and `items` unset, keys = [] so the render loop never runs and the
body returns [] while `rankedList.length > 0` — the list stays empty with no
Empty message. The `filter` prop's signature invites dynamic-result
compositions (the docs search palette is exactly that), so this reads as a
registry bug; the docs island works around it by passing `items={QUICK_LINKS}`
(no `group` fields → seeds only the ungrouped key; the filter still drives the
body). Registry-level fix = a plan/audit finding for the ui package, not the
consumer.
# Evidence
Playwright against the built site (unit 10): filter-only Command →
`[data-slot='command-list']` with 0 children at open and after typing; the
static-items demo on the same page renders fine. packages/ui/registry/command/
command.tsx renderBody: `const groups = orderedGroups(items)` (source read this
session).
