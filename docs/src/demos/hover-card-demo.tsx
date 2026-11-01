import { style } from "@hellajs/css";
import { HoverCard } from "@components/ui/hover-card.js";

const cardBody = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
}, { label: "demo-card-body" });

export function HoverCardDemo() {
  return (
    <>
      <HoverCard content={
        <div class={cardBody}>
          <strong>@hella</strong>
          <p>Reactive UI primitives for the web: signals, surgical DOM updates, and a copy-paste component registry.</p>
        </div>
      }>
        <a href="#profile" on:click={(e: Event) => e.preventDefault()}>@hella</a>
      </HoverCard>
    </>
  );
}
