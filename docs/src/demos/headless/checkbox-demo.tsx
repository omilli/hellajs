import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { checkbox } from "@hellajs/headless";

export function CheckboxDemo() {
  const updates = signal(false);
  const tasks = signal(false);
  const mixed = signal(true);

  const Updates = checkbox({
    checked: () => updates(),
    onCheckedChange: (next) => updates(next),
  });
  const Tasks = checkbox({
    checked: () => tasks(),
    indeterminate: () => mixed(),
    onCheckedChange: (next) => {
      tasks(next);
      mixed(false);
    },
  });

  const checkboxDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    "& .row": {
      alignItems: "center",
      display: "flex",
      gap: "0.625rem",
    },
    '& [data-slot="checkbox"]': {
      alignItems: "center",
      border: "1px solid #3a3a48",
      display: "flex",
      height: "1.125rem",
      justifyContent: "center",
      width: "1.125rem",
    },
    '& [data-slot="checkbox"][data-state="checked"], & [data-slot="checkbox"][data-state="indeterminate"]': {
      backgroundColor: "#e8e8f2",
      borderColor: "#e8e8f2",
      color: "#18181f",
    },
    '& [data-slot="checkbox-indicator"] svg': {
      height: "0.75rem",
      width: "0.75rem",
    },
    "& .state": {
      fontSize: "0.8125rem",
      opacity: 0.7,
    },
  });

  return (
    <div class={checkboxDemo}>
      <div class="row">
        <Updates.Root>
          <Updates.Indicator />
        </Updates.Root>
        <span>Product updates</span>
        <span class="state">{() => (updates() ? "checked" : "unchecked")}</span>
      </div>
      <div class="row">
        <Tasks.Root>
          <Tasks.Indicator />
        </Tasks.Root>
        <span>All tasks</span>
        <span class="state">
          {() => (mixed() ? "mixed" : tasks() ? "checked" : "unchecked")}
        </span>
      </div>
    </div>
  );
}
