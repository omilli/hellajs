import { signal } from "@hellajs/core";

import { Button } from "@components/ui/button.js";
import { Drawer } from "@components/ui/drawer.js";

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
