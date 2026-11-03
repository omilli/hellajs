import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { select } from "@hellajs/headless";

export function SelectDemo() {
  const value = signal("");

  const Select = select({
    value: () => value(),
    onValueChange: (next) => value(next),
  });

  const selectDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  // The listbox portals into document.body, outside the demo root, so it
  // carries its own style() registration instead of a nested selector.
  const listbox = style({
    backgroundColor: "#1c1c26",
    color: "#e8e8f2",
    fontSize: "0.875rem",
    minWidth: "12rem",
    padding: "0.25rem",
    zIndex: 10,
    '& [role="option"]': {
      padding: "0.3125rem 0.5rem",
    },
    '& [role="option"][aria-selected="true"]': {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
  });

  return (
    <div class={selectDemo}>
      <Select.Trigger>
        <Select.Value placeholder="Choose a fruit" />
      </Select.Trigger>
      <Select.Content side="bottom" sideOffset={6} class={listbox}>
        <Select.Item value="apple">Apple</Select.Item>
        <Select.Item value="banana">Banana</Select.Item>
        <Select.Item value="cherry">Cherry</Select.Item>
      </Select.Content>
      <p class="note">
        {() => (value() ? `Selected: ${value()}` : "Open the list and pick a fruit.")}
      </p>
    </div>
  );
}
