import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { combobox } from "@hellajs/headless";

export function ComboboxDemo() {
  const items = [
    { value: "apple", label: "Apple" },
    { value: "blueberry", label: "Blueberry" },
    { value: "canteloupe", label: "Canteloupe" },
  ];

  const picked = signal<string | undefined>(undefined);

  const Combobox = combobox({
    items,
    onValueChange: (value) => picked(value as string),
  });

  const comboboxDemo = style({
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  // The option panel portals into document.body, outside the demo root, so
  // it carries its own style() registration instead of a nested selector.
  const panel = style({
    backgroundColor: "#1c1c26",
    color: "#e8e8f2",
    fontSize: "0.875rem",
    minWidth: "12rem",
    padding: "0.25rem",
    zIndex: 10,
    '& [data-slot="combobox-item"][data-highlighted="true"]': {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
    '& [data-slot="combobox-item-indicator"] svg': {
      height: "0.875rem",
      width: "0.875rem",
    },
    '& [data-slot="combobox-empty"]': {
      display: "none",
      padding: "0.3125rem 0.5rem",
    },
    '&[data-empty] [data-slot="combobox-empty"]': {
      display: "block",
    },
  });

  return (
    <div class={comboboxDemo}>
      <Combobox.Input placeholder="Search..." />
      <Combobox.Content side="bottom" align="start" class={panel}>
        <Combobox.List items={items} keyBy="value" />
        <Combobox.Empty>No items found.</Combobox.Empty>
      </Combobox.Content>
      <p class="note">
        {() => (picked() ? `Selected ${picked()}` : "Type to filter, then pick a fruit.")}
      </p>
    </div>
  );
}
