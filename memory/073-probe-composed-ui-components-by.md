---
title: "Probe composed ui components by their stamped data-slots: composed-rendered parts override, factory-rendered children keep headless slots"
description: "When probing composed registry components, target `data-slot` per element provenance: parts the composed component renders itself carry the overridden `<pkg>-*` slot, children the headless factory renders internally keep the bare `menu-*` (etc.) slot."
tags: [ui, registry, headless, data-slot, playwright, probe, selectors]
confirmed: 2026-10-30
---
# Why

Playwright probes against composed registry components time out (30s locator waits) when they assume one slot namespace. A composed component passes `data-slot="<pkg>-..."` as an attr into the headless factory part, and the attr spread overrides the factory's own `data-slot="menu-..."` on that element — but children the factory renders internally never see the override. Guessing the wrong namespace per element is the failure: same component, two slot families on one subtree.

# Evidence

Confirmed 2026-10-30 against source + live probes of the docs site dropdown-menu page (composed `docs/src/components/ui/dropdown-menu.tsx`, factory `packages/headless/lib/menu.tsx`): `DropdownMenuCheckboxItem` stamps `data-slot="dropdown-menu-checkbox-item"` (composed line ~637) overriding the factory's `menu-checkbox-item`; `DropdownMenuRadioGroup` stamps only the group (`dropdown-menu-radio-group`) while its items are rendered inside the factory with `data-slot="menu-radio-item"` (`menu.tsx` line 346) — radio items stay `menu-*`; sub trigger/content render via `sub.Trigger`/`sub.Content` with composed stamps `dropdown-menu-sub-trigger`/`dropdown-menu-sub-content` (composed lines ~833/838) overriding factory `menu-sub-trigger`/`menu-sub-content` (`menu.tsx` 418/490). Probe behavior matched: `[data-slot='menu-checkbox-item']` and `[data-slot='dropdown-menu-radio-item']` locators both timed out; the provenance-correct selectors resolved immediately (open/checked-state/Escape/submenu assertions all green with zero console errors).
