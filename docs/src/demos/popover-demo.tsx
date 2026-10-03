import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Button from "@registry/button/css/button.js";
import Popover, { PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle } from "@registry/popover/css/popover.js";
import { Portal } from "@hellajs/dom";
import { row } from "./demo-kit";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});



function panel(name: string) {
  return (
    <>
      <PopoverHeader>
        <PopoverTitle>{name}</PopoverTitle>
        <PopoverDescription>Escape or an outside press closes the top layer only.</PopoverDescription>
      </PopoverHeader>
      <p>Width 18rem, positioned against the trigger, flipping on viewport collision.</p>
    </>
  );
}

export default function PopoverDemo() {
  return (
    <div class={stack}>
      <div class={row}>
        <Popover content={panel("Width")}><Button>Width</Button></Popover>
        <Popover content={panel("Height")}><Button variant="outline">Height</Button></Popover>
      </div>
    </div>
  );
}

export function PopoverManualDemo() {
  const open = signal(false);
  const state = (): "open" | "closed" => (open() ? "open" : "closed");
  let trigger: Element | undefined;

  return (
    <div class={stack}>
      <Button
        hook:afterMount={(node: Element) => { trigger = node; }}
        onclick={() => open(!open())}
      >Open</Button>
      {() => open() && (
        <Portal to="body">
          <PopoverContent state={state} anchor={() => trigger} onDismiss={() => open(false)}>
            <PopoverHeader>
              <PopoverTitle>Dimensions</PopoverTitle>
              <PopoverDescription>Set the width and height.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Portal>
      )}
    </div>
  );
}
