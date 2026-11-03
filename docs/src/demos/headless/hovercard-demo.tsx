import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { hoverCard } from "@hellajs/headless";

export function HoverCardDemo() {
  const open = signal(false);

  const HoverCard = hoverCard({
    openDelay: 200,
    closeDelay: 300,
    onOpenChange: (next) => open(next),
  });

  const hoverCardDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  // The panel portals into document.body, outside the demo root, so it
  // carries its own style() registration instead of a nested selector.
  const panel = style({
    backgroundColor: "#1c1c26",
    color: "#e8e8f2",
    fontSize: "0.875rem",
    padding: "1rem",
    width: "16rem",
    zIndex: 10,
  });

  return (
    <div class={hoverCardDemo}>
      <HoverCard.Trigger class="trigger">@hellajs</HoverCard.Trigger>
      <HoverCard.Content side="bottom" class={panel}>
        <span class="name">HellaJS</span>
        <p class="bio">Surgical DOM updates over fine-grained signals.</p>
      </HoverCard.Content>
      <p class="note">
        {() => (open() ? "Open - cross into the panel to keep it; leave both to close." : "Hover the handle for the profile card.")}
      </p>
    </div>
  );
}
