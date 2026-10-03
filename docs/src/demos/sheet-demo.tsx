import { signal } from "@hellajs/core";

import Button from "@registry/button/css/button.js";
import Sheet, { SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetTitle } from "@registry/sheet/css/sheet.js";
import { Portal } from "@hellajs/dom";
import { stack } from "./demo-kit";

export default function SheetDemo() {
  const open = signal(false);

  return (
    <div class={stack}>
      <Button variant="outline" onclick={() => open(true)}>Open right sheet</Button>
      <Sheet open={open} onClose={() => open(false)} side="right" title="Edit profile" description="Make changes to your profile here. Click save when you're done.">
        <p>This panel slides in from the right edge with its geometry and slide variant from the side table.</p>
        <Button onclick={() => open(false)}>Save changes</Button>
      </Sheet>
    </div>
  );
}

export function SheetManualDemo() {
  const open = signal(false);
  const state = (): "open" | "closed" => (open() ? "open" : "closed");

  return (
    <div class={stack}>
      <Button variant="outline" onclick={() => open(!open())}>Open cart</Button>
      {() => open() && (
        <Portal to="body">
          <SheetOverlay state={state} />
          <SheetContent state={state} side="bottom" labelledBy="sheet-manual-title" describedBy="sheet-manual-description" onClose={() => open(false)}>
            <SheetHeader>
              <SheetTitle id="sheet-manual-title">Cart</SheetTitle>
              <SheetDescription id="sheet-manual-description">Three items reserved for you.</SheetDescription>
            </SheetHeader>
            <p>The bottom side from the manual composition: the panel carries its own exit animation, and the X close in the footer calls your onClose.</p>
            <SheetFooter>
              <SheetClose onClose={() => open(false)} />
            </SheetFooter>
          </SheetContent>
        </Portal>
      )}
    </div>
  );
}
