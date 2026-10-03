import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import ContextMenu, {
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
} from "@registry/context-menu/css/context-menu.js";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});

function zone(label: string) {
  return (
    <div style="padding: 2rem 3rem; border: 1px dashed var(--border); border-radius: 0.5rem; cursor: context-menu;">{label}</div>
  );
}

const canvasItems = (
  <>
    <ContextMenuItem onclick={() => console.log("cut")}>Cut</ContextMenuItem>
    <ContextMenuItem shortcut="⌘C">Copy</ContextMenuItem>
  </>
);

export default function ContextMenuDemo() {
  return (
    <div class={stack}>
      <ContextMenu content={canvasItems}>{zone("Right-click this zone")}</ContextMenu>
    </div>
  );
}

export function ContextMenuSubsetDemo() {
  const locked = signal(false);

  const fileItems = (
    <>
      <ContextMenuItem>Rename</ContextMenuItem>
      <ContextMenuCheckboxItem checked={locked} onCheckedChange={(next: boolean) => locked(next)}>Locked</ContextMenuCheckboxItem>
      <ContextMenuSeparator />
      <ContextMenuSub content={<ContextMenuItem>Compress</ContextMenuItem>}>
        Archive
      </ContextMenuSub>
      <ContextMenuItem destructive={true}>Delete</ContextMenuItem>
    </>
  );

  return (
    <div class={stack}>
      <ContextMenu content={fileItems}>{zone("Right-click file-card")}</ContextMenu>
    </div>
  );
}
