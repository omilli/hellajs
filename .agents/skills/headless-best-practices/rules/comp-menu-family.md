---
title: Compose menus from MenuRows, menuSub, and menubar
impact: HIGH
impactDescription: hand-rolled menu rows lose selection dispatch and close-on-select, plain menu factories as submenus break stacking, and uncoordinated bar menus stay open side by side
tags: menu, menubar, menuSub, MenuRows
---

## Compose menus from MenuRows, menuSub, and menubar

`menu()` returns `{ Trigger, Content }`; the row parts are the static `MenuRows` (`Item`, `CheckboxItem`, `RadioGroup`, `RadioItem`, `Label`, `Separator`, `Group`, `Shortcut`) - selection dispatches through a document-level event that `Content` listens for, so rendering your own rows instead of `MenuRows` members breaks selection, typeahead focus, and close-on-select (`closeOnSelect: false` keeps the menu open on that row; `CheckboxItem` toggling closes unless told otherwise). Nested submenus come from `menuSub()` - hover-intent trigger (`pointerOnly`, ~100ms open / 300ms close), ArrowLeft exit, content enter cancelling a pending close - not from nesting a second `menu()`, which double-stacks layers and dismissal. `menubar()` returns `{ Bar, menu }`: each bar menu announces its open state, the bar closes siblings and mirrors the open id (`value`/`onValueChange`), and horizontal arrows hand off open-then-move between triggers. `trigger: "contextmenu"` swaps the button for a zone opening the menu at the pointer through a virtual anchor.

**Incorrect (what is wrong):**

```tsx
import { menu } from "@hellajs/headless";

const File = menu();
const Edit = menu(); // a nested "submenu" as a second top-level menu: two
// independent layers - Escape dismisses both at once, hover intent and
// ArrowLeft exit are absent, and selection in the child closes nothing.
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { menu, MenuRows, menuSub } from "@hellajs/headless";

const autoSave = signal(true);
const theme = signal("dark");
const File = menu();
const Recent = menuSub();

const MenuHost = () => (
  <div>
    <File.Trigger>File</File.Trigger>
    <File.Content side="bottom" align="start">
      <MenuRows.Item shortcut="Ctrl+S">Save</MenuRows.Item>
      <MenuRows.CheckboxItem checked={() => autoSave()} onCheckedChange={(next) => autoSave(next)}>
        Autosave
      </MenuRows.CheckboxItem>
      <MenuRows.RadioGroup
        items={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        value={() => theme()}
        onValueChange={(next) => theme(next)}
      />
      <MenuRows.Separator />
      <Recent.Trigger inset>Open Recent</Recent.Trigger>
      <Recent.Content side="right" sideOffset={0}>
        <MenuRows.Item closeOnSelect={false}>Keep this menu open</MenuRows.Item>
      </Recent.Content>
    </File.Content>
  </div>
);
```

Reference: `packages/headless/lib/menu.tsx` and `packages/headless/tests/menu.test.ts` and `packages/headless/tests/menubar.test.ts`
