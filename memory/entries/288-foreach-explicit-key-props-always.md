---
type: correction
title: ForEach explicit key props always render as DOM attributes — leak-free keying flows through the entry-id channel, never destructure-and-drop
description: An explicit key prop on a ForEach-rooted part renders as a DOM attribute and is the only part-side reuse channel; dropping it falls back to index keys — key via the entry's id instead.
tags: [dom, foreach, registry]
timestamp: 2026-10-14
last_confirmed: 2026-10-14
triggers: [foreach-keyed-list, key-attribute-leak, registry-dynamic-items]
supersedes: 287
---
# Why

`resolveItemKey` (`packages/dom/lib/ForEach.ts`) reads `element.props?.key` — the same props object whose entries `renderProp` (`packages/dom/lib/internal/utils.ts`) renders as attributes. The two roles are ONE channel: any key visible to ForEach's reuse maps is visible to the DOM renderer, and vice versa. Probe-verified consequences (2026-10-14):

- A part that destructures `key` and drops it fixes the `key="…"` attribute leak but SEVERS reuse: `resolveItemKey` falls back to index keys, so any `keyBy`-style opt-in keyed to the dropped prop is a no-op (a prepend rebuilds every node).
- Re-attaching key onto the returned root vnode's props (`{ ...node, props: { ...node.props, key } }`) restores reuse AND re-renders the leak.
- The leak-free ui-side channel is the entry's `id` property: `resolveItemKey` reads `(item as {id?}).id` off the each-array member, which is never rendered. Mapping `each` under a keyBy opt-in — `() => resolveItems().map((e) => ({ ...e, id: e[keyBy] }))`, with the part call passing explicit fields only — yields full reuse with zero `key=`/`id=` attributes. Entries already carrying `id` (tabs) auto-key untouched.
- The root-cause alternative is a dom-side fix: `renderProp` special-casing `key` would make explicit part-level key props reconciliation-only (chosen direction for the reactive-items family work, 2026-10-14).

Never prescribe destructure-and-drop for a part that must keep key-based reuse — the prescription silently converts explicit keys to index keys.

# Evidence

Scratch probe (`packages/ui/tests/scratch-key-probe.test.ts`, worktree `plans-ui-code-reactive-items-family`, 2026-10-14; three-part patched/html-part probe over `ForEach` + `signal` items, all assertions passing): patched part through a prepend → `a-node reused = false`; reattach variant → `outerHTML` contains `key="a"`; mapped-id variant → `reused = true | key attr = false | id attr = false`; tabs-shape entries (`id` field) → `reused = true`. Source anchors: `resolveItemKey` (explicit-key → `item.id` → index chain), `component()` (`packages/dom/lib/component.ts` returns the part's rendered root, so input props never reach `element.props`), `buildComponentCall` (`plugins/babel/src/builders/component.mjs` passes `key` through as a plain prop). Supersedes 287, whose reuse observation ran against the UNPATCHED part (key riding the attrs spread); rerun with the prescribed patch, the reuse claim reverses.
