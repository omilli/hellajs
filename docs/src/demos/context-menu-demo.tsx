import { signal } from "@hellajs/core";
import ContextMenu, {
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
} from "@registry/context-menu/css/context-menu.js";

function zone(label: string) {
  return (
    <div style="padding: 2rem 3rem; border: 1px dashed var(--border); border-radius: 0.5rem; cursor: context-menu;">{label}</div>
  );
}

const canvasItems = (
  <>
    <ContextMenuItem on:click={() => console.log("cut")}>Cut</ContextMenuItem>
    <ContextMenuItem shortcut="⌘C">Copy</ContextMenuItem>
  </>
);

export function ContextMenuDemo() {
  return (
    <>
      <ContextMenu content={canvasItems}>{zone("Right-click this zone")}</ContextMenu>
    </>
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
    <>
      <ContextMenu content={fileItems}>{zone("Right-click file-card")}</ContextMenu>
    </>
  );
}
