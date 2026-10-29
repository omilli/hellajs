import { signal } from "@hellajs/core";
import { Button } from "@components/ui/button.js";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle } from "@components/ui/popover.js";

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

export function PopoverDemo() {
  return (
    <>
      <div class="demo-row">
        <Popover content={panel("Width")}><Button>Width</Button></Popover>
        <Popover content={panel("Height")}><Button variant="outline">Height</Button></Popover>
      </div>
    </>
  );
}

export function PopoverManualDemo() {
  const open = signal(false);
  const state = (): "open" | "closed" => (open() ? "open" : "closed");
  let trigger: Element | undefined;

  return (
    <>
      <Button
        hook:afterMount={(node: Element) => { trigger = node; }}
        on:click={() => open(!open())}
      >Open</Button>
      <PopoverContent state={state} anchor={() => trigger} onDismiss={() => open(false)}>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>Set the width and height.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </>
  );
}
