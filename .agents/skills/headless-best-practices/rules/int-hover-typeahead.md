---
title: Match hoverIntent pointerOnly and menuTypeahead getters to the surface
impact: MEDIUM
impactDescription: focus arming auto-opens submenu triggers under roving focus, and a captured item list makes typeahead jump to removed rows
tags: hoverIntent, menuTypeahead, timing, typeahead
---

## Match hoverIntent pointerOnly and menuTypeahead getters to the surface

`hoverIntent(target, handlers)` opens after `openDelay` (default 700) and closes after `closeDelay` (default 300); `focus`/`blur` arms are included by default for keyboard parity - pass `pointerOnly: true` for surfaces where roving focus must not auto-open (menu sub-triggers; the factories set it there). A module-level skip-delay window makes any open within the previous 500ms instant, shared across ALL consumers so moving between adjacent triggers never re-incurs the delay; `resetHeadless()` clears it for tests. When the surface can open without hover (a click-opened sub-trigger), pass `isOpen` so leave and outside-dismiss still schedule the close. `menuTypeahead(container, resolveItems, onSelect)` re-invokes `resolveItems` per keystroke - return the live rows, never a captured array; printable keys buffer with a 500ms auto-reset, `startsWith` matches case-insensitively first, then substring matching wraps from the item after the last selection.

**Incorrect (what is wrong):**

```ts
import { hoverIntent } from "@hellajs/headless/utils";

// Without pointerOnly, arrow-key roving across the parent menu fires the
// focus arm and every submenu the rove passes over opens.
const dispose = hoverIntent(subTrigger, { onOpen: openSub, onClose: closeSub });
```

**Correct (what is right):**

```ts
import { hoverIntent, menuTypeahead } from "@hellajs/headless/utils";

const armSubmenu = (subTrigger: HTMLElement, menuEl: HTMLElement) => {
  const disposeHover = hoverIntent(subTrigger, {
    onOpen: () => subTrigger.setAttribute("data-state", "open"),
    onClose: () => subTrigger.setAttribute("data-state", "closed"),
    openDelay: 100,
    closeDelay: 300,
    pointerOnly: true, // roving focus must not auto-open submenus
  });
  const disposeTypeahead = menuTypeahead(
    menuEl,
    () =>
      Array.from(menuEl.querySelectorAll<HTMLElement>("[role='menuitem']")).map((node) => ({
        node,
        text: node.textContent ?? "",
      })),
    (item) => item.node.focus(),
  );
  return () => {
    disposeHover();
    disposeTypeahead();
  };
};
```

Reference: `packages/headless/lib/utils/hoverIntent.ts` and `packages/headless/lib/utils/menuTypeahead.ts` and `packages/headless/tests/menutypeahead.test.ts`
