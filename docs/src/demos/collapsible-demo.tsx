import { signal } from "@hellajs/core";

import Collapsible, { CollapsibleContent, CollapsibleTrigger } from "@registry/collapsible/css/collapsible.js";
import { muted, stack } from "./demo-kit";

export default function CollapsibleDemo() {
  const open = signal(false);

  return (
    <div class={stack}>
      <Collapsible
        open={open}
        onOpenChange={(next: boolean) => open(next)}
        trigger="What ships in the box?"
        content={[<p class={muted}>One editable file per component, a theme entry, and no runtime dependency.</p>]}
      />
      <p class={muted}>{() => `Region ${open() ? "open" : "closed"}`}</p>
    </div>
  );
}

export function CollapsibleManualDemo() {
  const open = signal(true);

  return (
    <div class={stack}>
      <CollapsibleTrigger active={open} onToggle={() => open(!open())} controls="manual-region">Can I edit the copied source?</CollapsibleTrigger>
      <CollapsibleContent id="manual-region" active={open}>
        <p class={muted}>Yes. The file lands in your project and the style declarations ride inside it.</p>
      </CollapsibleContent>
    </div>
  );
}
