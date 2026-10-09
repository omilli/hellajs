import { signal } from "@hellajs/core";

import Collapsible, { CollapsibleContent, CollapsibleTrigger } from "@registry/collapsible/css/collapsible.js";

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

export function CollapsibleManualDemo() {
  const open = signal(true);

  return (
    <>
      <CollapsibleTrigger active={open} onToggle={() => open(!open())} aria-controls="manual-region">Can I edit the copied source?</CollapsibleTrigger>
      <CollapsibleContent id="manual-region" active={open}>
        <p class="demo-muted">Yes. The file lands in your project and the style declarations ride inside it.</p>
      </CollapsibleContent>
    </>
  );
}
