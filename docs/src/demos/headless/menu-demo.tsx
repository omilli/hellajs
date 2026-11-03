import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { menu, MenuRows } from "@hellajs/headless";

export function MenuDemo() {
  const open = signal(false);
  const grid = signal(true);
  const theme = signal("light");
  const note = signal("Open the menu, then pick an item.");

  const Menu = menu({
    open: () => open(),
    onOpenChange: (next) => open(next),
  });

  const menuDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  // The content panel portals into document.body, outside the demo root, so
  // it carries its own style() registration instead of a nested selector.
  const panel = style({
    backgroundColor: "#1c1c26",
    color: "#e8e8f2",
    fontSize: "0.875rem",
    minWidth: "12rem",
    padding: "0.25rem",
    zIndex: 10,
    '& [role="menuitem"], & [role="menuitemcheckbox"], & [role="menuitemradio"]': {
      padding: "0.3125rem 0.5rem",
      "&:focus": {
        backgroundColor: "#e8e8f2",
        color: "#18181f",
      },
    },
    '& [role="separator"]': {
      backgroundColor: "#3a3a48",
      height: "1px",
      margin: "0.25rem 0.5rem",
    },
  });

  return (
    <div class={menuDemo}>
      <Menu.Trigger class="trigger">Actions</Menu.Trigger>
      <Menu.Content side="bottom" align="start" class={panel}>
        <MenuRows.Item
          onSelect={() => note("Saved")}
          shortcut="⌘S"
        >
          Save
        </MenuRows.Item>
        <MenuRows.CheckboxItem
          checked={() => grid()}
          onCheckedChange={(next) => {
            grid(next);
            note(next ? "Grid on" : "Grid off");
          }}
        >
          Grid
        </MenuRows.CheckboxItem>
        <MenuRows.Separator />
        <MenuRows.RadioGroup
          items={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={() => theme()}
          onValueChange={(next) => {
            theme(next);
            note(`Theme: ${next}`);
          }}
        />
      </Menu.Content>
      <p class="note">{() => note()}</p>
    </div>
  );
}
