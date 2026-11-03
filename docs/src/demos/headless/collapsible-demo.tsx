import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { collapsible } from "@hellajs/headless";

export function CollapsibleDemo() {
  const open = signal(false);

  const Collapsible = collapsible({
    open: () => open(),
    onOpenChange: (next) => open(next),
  });

  const collapsibleDemo = style({
    width: "300px",
    "& .content": {
      fontSize: "0.875rem",
      opacity: 0.7,

      '&[data-state="closed"]': {
        display: "none",
      },
    },
  });

  return (
    <div class={collapsibleDemo}>
      <Collapsible.Trigger class="trigger">Show details</Collapsible.Trigger>
      <Collapsible.Content class="content">
        The region stays mounted under its data-state attribute, so plain CSS
        can animate the collapse.
      </Collapsible.Content>
    </div>
  );
}
