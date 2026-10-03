import { signal } from "@hellajs/core";

import Button from "@registry/button/css/button.js";
import Command, { CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandShortcut } from "@registry/command/css/command.js";
import { row, stack } from "./demo-kit";

const commands = [
  { value: "theme-light", label: "Light theme", group: "Theme", shortcut: "⌘1" },
  { value: "theme-dark", label: "Dark theme", group: "Theme", shortcut: "⌘2" },
  { value: "deploy", label: "Deploy site", group: "Actions", keywords: ["publish", "ship"] },
  { value: "new-post", label: "New post", group: "Actions", shortcut: "⌘N" },
];

export default function CommandDemo() {
  return (
    <div class={stack}>
      <Command items={commands} />
    </div>
  );
}

export function CommandPaletteDemo() {
  const paletteOpen = signal(false);
  const closePalette = () => paletteOpen(false);

  return (
    <div class={stack}>
      <div class={row}>
        <Button variant="outline" onclick={() => paletteOpen(true)}>Open palette ⌘K</Button>
      </div>
      <CommandDialog open={paletteOpen} onClose={closePalette} title="Command Palette" description="Search for a command to run...">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={closePalette}>Reload theme<CommandShortcut>⌘R</CommandShortcut></CommandItem>
            <CommandItem onSelect={closePalette}>Open settings<CommandShortcut>⌘S</CommandShortcut></CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
