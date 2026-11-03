import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { menubar, MenuRows } from "@hellajs/headless";

export function MenubarDemo() {
  const openMenu = signal("");
  const note = signal("Click a title to open its menu.");

  const Menubar = menubar({
    value: () => openMenu(),
    onValueChange: (next) => {
      openMenu(next);
      note(next ? `Menu open: ${next}` : "Menu closed.");
    },
  });

  const File = Menubar.menu({ value: "file" });
  const Edit = Menubar.menu({ value: "edit" });

  const menubarDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    "& .bar": {
      display: "flex",
      gap: "0.25rem",
    },
    '& .bar .trigger[aria-expanded="true"]': {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  // Each menu panel portals into document.body, outside the demo root, so it
  // carries its own style() registration instead of a nested selector.
  const panel = style({
    backgroundColor: "#1c1c26",
    color: "#e8e8f2",
    fontSize: "0.875rem",
    minWidth: "12rem",
    padding: "0.25rem",
    zIndex: 10,
    '& [role="menuitem"]': {
      padding: "0.3125rem 0.5rem",
      "&:focus": {
        backgroundColor: "#e8e8f2",
        color: "#18181f",
      },
    },
  });

  return (
    <div class={menubarDemo}>
      <Menubar.Bar class="bar">
        <File.Trigger class="trigger">File</File.Trigger>
        <File.Content side="bottom" align="start" class={panel}>
          <MenuRows.Item
            onSelect={() => note("Opened a file")}
            shortcut="⌘O"
          >
            Open
          </MenuRows.Item>
          <MenuRows.Item onSelect={() => note("Saved a copy")}>
            Save As
          </MenuRows.Item>
        </File.Content>
        <Edit.Trigger class="trigger">Edit</Edit.Trigger>
        <Edit.Content side="bottom" align="start" class={panel}>
          <MenuRows.Item onSelect={() => note("Copied")}>Copy</MenuRows.Item>
          <MenuRows.Item onSelect={() => note("Pasted")}>Paste</MenuRows.Item>
        </Edit.Content>
      </Menubar.Bar>
      <p class="note">{() => note()}</p>
    </div>
  );
}
