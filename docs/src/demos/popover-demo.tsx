import { Popover, PopoverDescription, PopoverHeader, PopoverTitle } from "@components/ui/popover.js";

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
        <Popover content={panel("Width")}>Width</Popover>
        <Popover content={panel("Height")}>Height</Popover>
      </div>
    </>
  );
}
