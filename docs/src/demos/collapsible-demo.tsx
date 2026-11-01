import { signal } from "@hellajs/core";

import { Collapsible } from "@components/ui/collapsible.js";

export function CollapsibleDemo() {
  const open = signal(false);

  return (
    <>
      <Collapsible
        open={open}
        onOpenChange={(next: boolean) => open(next)}
        trigger="What ships in the box?"
        content={[<p class="demo-muted">One editable file per component, a theme entry, and no runtime dependency.</p>]}
      />
      <p class="demo-muted">{() => `Region ${open() ? "open" : "closed"}`}</p>
    </>
  );
}
