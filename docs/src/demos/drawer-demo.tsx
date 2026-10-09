import { signal } from "@hellajs/core";

import Button from "@registry/button/css/button.js";
import Drawer, {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
} from "@registry/drawer/css/drawer.js";
import { Portal } from "@hellajs/dom";

export function DrawerDemo() {
  const open = signal(false);

  return (
    <>
      <Button on:click={() => open(true)}>Open bottom drawer</Button>
      <Drawer open={open} onClose={() => open(false)} title="Notifications" description="Three unread digests. Drag down to dismiss.">
        <p>The whole panel is the drag surface; buttons inside it still click normally.</p>
        <Button variant="outline" on:click={() => open(false)}>Mark all read</Button>
      </Drawer>
    </>
  );
}

export function DrawerManualDemo() {
  const open = signal(false);
  const state = (): "open" | "closed" => (open() ? "open" : "closed");
  const fraction = signal(0);

  return (
    <>
      <Button variant="outline" on:click={() => open(!open())}>Open cart</Button>
      {() => open() && (
        <Portal to="body">
          <DrawerOverlay state={state} fraction={fraction} />
          <DrawerContent state={state} fraction={fraction} aria-labelledby="drawer-manual-title" aria-describedby="drawer-manual-description" onClose={() => open(false)}>
            <DrawerHeader>
              <DrawerTitle id="drawer-manual-title">Cart</DrawerTitle>
              <DrawerDescription id="drawer-manual-description">Three items reserved for you.</DrawerDescription>
            </DrawerHeader>
            <p>Drag it down: both parts read the same fraction signal, the overlay fades with the distance, and the X in the footer is the explicit close.</p>
            <DrawerFooter>
              <DrawerClose onClose={() => open(false)} />
            </DrawerFooter>
          </DrawerContent>
        </Portal>
      )}
    </>
  );
}
