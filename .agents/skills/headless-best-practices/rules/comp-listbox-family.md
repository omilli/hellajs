---
title: Key listbox options by value through the factory members
impact: HIGH
impactDescription: rows keyed by label or index break aria-activedescendant, typeahead, and reorder reuse - and options rendered outside the factory's parts never register
tags: combobox, select, command, listbox
---

## Key listbox options by value through the factory members

`combobox`, `select`, and `command` share one listbox model whose option identity is the VALUE: stable ids derive as `<listId>-opt-<value>`, so `aria-activedescendant`, typeahead, and `keyBy="value"` DOM reuse survive key-ordered list changes. Two registration shapes: data-driven (pass `items` to `combobox`/`command` - the entries array or a reactive accessor; `List` renders the body, non-matches stay mounted hidden) and DOM-order (omit `items`, render `Item` children inside the list - options register from the rendered children, so rows rendered outside the factory's parts or keyed by anything but `value` never join roving, selection, or Enter commits). `select` is DOM-order only; its options scan live from the DOM so dynamic children join per keypress, focus lands on the selected option at open, and focus returns to the trigger on close. `command`'s cursor lands on the first ranked entry and re-lands on list mount and query input.

**Incorrect (what is wrong):**

```tsx
import { combobox } from "@hellajs/headless";

const Fruit = combobox();
// Custom rows instead of List/Item: no registration, so roving skips them,
// Enter commits nothing, and the label-keyed identity breaks typeahead.
const FruitHost = () => (
  <div>
    <Fruit.Input />
    <Fruit.Content>
      <div role="listbox">
        {fruits().map((fruit) => (
          <div key={fruit.label} role="option">
            {fruit.label}
          </div>
        ))}
      </div>
    </Fruit.Content>
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { command, combobox, select } from "@hellajs/headless";

const picked = signal("");
const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
];

const FruitCombo = combobox({
  items: () => fruits, // data-driven: value-keyed ids, hidden non-matches
  value: () => picked(),
  onValueChange: (next) => picked(typeof next === "string" ? next : ""),
});
const FruitSelect = select({ value: () => picked(), onValueChange: (next) => picked(next) });
const Actions = command({
  items: () => [
    { value: "save", label: "Save", group: "File", onSelect: () => undefined },
    { value: "close", label: "Close", group: "File", onSelect: () => undefined },
  ],
});

const PickerHost = () => (
  <div>
    <FruitCombo.Input />
    <FruitCombo.Content>
      <FruitCombo.List items={() => fruits} keyBy="value" />
    </FruitCombo.Content>
    <FruitSelect.Trigger>
      <FruitSelect.Value placeholder="Pick a fruit" />
    </FruitSelect.Trigger>
    <FruitSelect.Content>
      <FruitSelect.Item value="apple">Apple</FruitSelect.Item>
    </FruitSelect.Content>
    <Actions.Input />
    <Actions.List />
  </div>
);
```

Under `multiple`, combobox selections are arrays, the panel stays open on commit, and the input surface renders chips.

Reference: `packages/headless/lib/internal/listbox.ts` and `packages/headless/lib/combobox.tsx` and `packages/headless/tests/combobox.test.ts`
