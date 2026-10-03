import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { row } from "./demo-kit";
import Menubar, {
  MenubarCheckboxItem,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarSeparator,
  MenubarSub,
} from "@registry/menubar/css/menubar.js";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});



export default function MenubarDemo() {
  const fileItems = (
    <>
      <MenubarLabel>File</MenubarLabel>
      <MenubarItem shortcut="⌘N">New Window</MenubarItem>
      <MenubarItem>Open Recent</MenubarItem>
      <MenubarSub content={
        <>
          <MenubarItem>Export as PDF</MenubarItem>
          <MenubarItem>Export as HTML</MenubarItem>
        </>
      }>
        Export
      </MenubarSub>
      <MenubarSeparator />
      <MenubarItem destructive={true}>Close</MenubarItem>
    </>
  );
  const editItems = (
    <>
      <MenubarItem shortcut="⌘Z">Undo</MenubarItem>
      <MenubarItem shortcut="⌘C">Copy</MenubarItem>
      <MenubarItem shortcut="⌘V">Paste</MenubarItem>
    </>
  );
  const viewItems = (
    <>
      <MenubarItem>Zoom In</MenubarItem>
      <MenubarItem>Zoom Out</MenubarItem>
    </>
  );

  return (
    <div class={stack}>
      <div class={row}>
        <Menubar>
          <MenubarMenu value="file" content={fileItems}>File</MenubarMenu>
          <MenubarMenu value="edit" content={editItems}>Edit</MenubarMenu>
          <MenubarMenu value="view" content={viewItems}>View</MenubarMenu>
        </Menubar>
      </div>
    </div>
  );
}

export function MenubarSelectionDemo() {
  const bold = signal(false);
  const size = signal("medium");

  const formatItems = (
    <>
      <MenubarCheckboxItem checked={bold} onCheckedChange={(next: boolean) => bold(next)}>Bold</MenubarCheckboxItem>
      <MenubarSeparator />
      <MenubarRadioGroup
        items={[
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" },
        ]}
        value={size}
        onValueChange={(next: string) => size(next)}
      />
    </>
  );

  return (
    <div class={stack}>
      <div class={row}>
        <Menubar>
          <MenubarMenu value="format" content={formatItems}>Format</MenubarMenu>
        </Menubar>
      </div>
    </div>
  );
}
