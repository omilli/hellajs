import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { popover, PopoverRows } from "@hellajs/headless";

export function PopoverDemo() {
  const open = signal(false);

  const Popover = popover({
    open: () => open(),
    onOpenChange: (next) => open(next),
  });

  const popoverDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  // The content panel portals into document.body, outside the demo root, so
  // it carries its own style() registration instead of a nested selector.
  const panel = style({
    backgroundColor: "#1c1c26",
    color: "#e8e8f2",
    fontSize: "0.875rem",
    padding: "1rem",
    width: "16rem",
    zIndex: 10,
  });

  return (
    <div class={popoverDemo}>
      <Popover.Trigger class="trigger">Settings</Popover.Trigger>
      <Popover.Content side="bottom" align="start" sideOffset={6} class={panel}>
        <PopoverRows.Header>
          <PopoverRows.Title>Dimensions</PopoverRows.Title>
          <PopoverRows.Description>Set the layer size.</PopoverRows.Description>
        </PopoverRows.Header>
      </Popover.Content>
      <p class="note">
        {() => (open() ? "Open - click outside or press Escape to close." : "Open the settings panel.")}
      </p>
    </div>
  );
}
