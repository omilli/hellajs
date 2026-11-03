import { style } from "@hellajs/css";
import { tooltip } from "@hellajs/headless";

export function TooltipDemo() {
  const Tooltip = tooltip({ delay: 300 });

  // The label portals into document.body, outside the demo root, so it
  // carries its own style() registration instead of a nested selector.
  const label = style({
    backgroundColor: "#1c1c26",
    color: "#e8e8f2",
    fontSize: "0.75rem",
    padding: "0.25rem 0.5rem",
    zIndex: 10,
  });

  return (
    <div>
      <Tooltip.Trigger>Hover me</Tooltip.Trigger>
      <Tooltip.Content side="top" sideOffset={6} class={label}>
        Anchors to the trigger after the delay.
      </Tooltip.Content>
    </div>
  );
}
