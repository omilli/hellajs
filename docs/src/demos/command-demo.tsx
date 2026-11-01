import { signal } from "@hellajs/core";

import { Button } from "@components/ui/button.js";
import { Command, CommandDialog } from "@components/ui/command.js";

const commands = [
  { value: "theme-light", label: "Light theme", group: "Theme", shortcut: "⌘1" },
  { value: "theme-dark", label: "Dark theme", group: "Theme", shortcut: "⌘2" },
  { value: "deploy", label: "Deploy site", group: "Actions", keywords: ["publish", "ship"] },
  { value: "new-post", label: "New post", group: "Actions", shortcut: "⌘N" },
];

export function CommandDemo() {
  return (
    <>
      <Command items={commands} />
    </>
  );
}

export function CommandPaletteDemo() {
  const paletteOpen = signal(false);
  const closePalette = () => paletteOpen(false);

  return (
    <>
      <div class="demo-row">
        <Button variant="outline" on:click={() => paletteOpen(true)}>Open palette ⌘K</Button>
      </div>
      <CommandDialog
        open={paletteOpen}
        onClose={closePalette}
        title="Command Palette"
        description="Search for a command to run..."
        items={[
          { value: "reload-theme", label: "Reload theme", group: "Actions", shortcut: "⌘R", onSelect: closePalette },
          { value: "open-settings", label: "Open settings", group: "Actions", shortcut: "⌘S", onSelect: closePalette },
        ]}
      />
    </>
  );
}
