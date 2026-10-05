import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { hoverIntent, Portal } from "@hellajs/dom";
import HoverCard, { HoverCardContent, HoverCardTrigger } from "@registry/hover-card/css/hover-card.js";



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

export function HoverCardManualDemo() {
  const open = signal(false);
  const state = (): "open" | "closed" => (open() ? "open" : "closed");
  let trigger: Element | undefined;

  return (
    <>
      <HoverCardTrigger
        hook:afterMount={(node: Element) => {
          trigger = node;
          hoverIntent(node, {
            onOpen: () => open(true),
            onClose: () => open(false),
            openDelay: 200,
            closeDelay: 300,
          });
        }}
      >
        <a href="#release" on:click={(e: Event) => e.preventDefault()}>Release notes</a>
      </HoverCardTrigger>
      {() => open() && (
        <Portal to="body">
          <HoverCardContent
            state={state}
            anchor={() => trigger}
            onOpen={() => open(true)}
            onClose={() => open(false)}
          >
            <p>Moving into the card re-arms the open state, so it stays open under the pointer.</p>
          </HoverCardContent>
        </Portal>
      )}
    </>
  );
}
