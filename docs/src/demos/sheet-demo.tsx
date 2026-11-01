import { signal } from "@hellajs/core";

import { Button } from "@components/ui/button.js";
import { Sheet } from "@components/ui/sheet.js";

export function SheetDemo() {
  const open = signal(false);

  return (
    <>
      <Button variant="outline" on:click={() => open(true)}>Open right sheet</Button>
      <Sheet open={open} onClose={() => open(false)} side="right" title="Edit profile" description="Make changes to your profile here. Click save when you're done.">
        <p>This panel slides in from the right edge with its geometry and slide variant from the side table.</p>
        <Button on:click={() => open(false)}>Save changes</Button>
      </Sheet>
    </>
  );
}
