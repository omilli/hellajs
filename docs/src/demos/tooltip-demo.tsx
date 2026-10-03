import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Button from "@registry/button/css/button.js";
import Tooltip, { TooltipContent, TooltipTrigger } from "@registry/tooltip/css/tooltip.js";
import { hoverIntent, Portal } from "@hellajs/dom";
import { row } from "./demo-kit";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});



export default function TooltipDemo() {
  return (
    <div class={stack}>
      <div class={row}>
        <Tooltip content="Saves every pending change" delayDuration={100} side="top">
          <Button>Hover: top</Button>
        </Tooltip>
        <Tooltip content="Deploys the current branch" delayDuration={100} side="bottom" align="start">
          <Button variant="outline">Hover: bottom-start</Button>
        </Tooltip>
      </div>
    </div>
  );
}

export function TooltipManualDemo() {
  const open = signal(false);
  const state = (): "open" | "closed" => (open() ? "open" : "closed");
  let trigger: Element | undefined;

  return (
    <div class={stack}>
      <TooltipTrigger
        describedBy="manual-tooltip-content"
        hook:afterMount={(node: Element) => {
          trigger = node;
          hoverIntent(node, {
            onOpen: () => open(true),
            onClose: () => open(false),
            openDelay: 300,
          });
        }}
      >
        <Button>Hover me</Button>
      </TooltipTrigger>
      {() => open() && (
        <Portal to="body">
          <TooltipContent state={state} id="manual-tooltip-content" anchor={() => trigger}>
            <p>Wired by hand: state, anchor, and hover timing are all explicit.</p>
          </TooltipContent>
        </Portal>
      )}
    </div>
  );
}
