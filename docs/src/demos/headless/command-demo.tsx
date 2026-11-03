import { style } from "@hellajs/css";
import { command } from "@hellajs/headless";

export function CommandDemo() {
  const items = [
    { value: "theme-light", label: "Light theme", group: "Theme", shortcut: "Cmd+1" },
    { value: "theme-dark", label: "Dark theme", group: "Theme", shortcut: "Cmd+2" },
    { value: "deploy", label: "Deploy site", group: "Actions", keywords: ["publish", "ship"] },
  ];

  const Command = command({ items });

  const commandDemo = style({
    width: "300px",
    '& [data-slot="command-list"]': {
      marginTop: "0.5rem",
      maxHeight: "14rem",
      overflowY: "auto",
    },
    '& [data-slot="command-item"][data-selected="true"]': {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={commandDemo}>
      <Command.Input placeholder="Type a command..." />
      <Command.List />
      <p class="note">Typing ranks matches across labels, values, and keywords.</p>
    </div>
  );
}
