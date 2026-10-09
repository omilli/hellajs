import { signal } from "@hellajs/core";

import Button from "@registry/button/css/button.js";
import Dialog from "@registry/dialog/css/dialog.js";

export function DialogDemo() {
  const open = signal(false);

  return (
    <>
      <Button variant="destructive" on:click={() => open(true)}>Delete account</Button>
      <Dialog open={open} onClose={() => open(false)} title="Delete account" description="This permanently removes your account and all of its data.">
        <p>This action cannot be undone. All of your projects will be lost.</p>
        <div class="demo-row">
          <Button variant="outline" on:click={() => open(false)}>Cancel</Button>
          <Button variant="destructive" on:click={() => open(false)}>Delete</Button>
        </div>
      </Dialog>
    </>
  );
}

export function DialogLockedDemo() {
  const locked = signal(false);

  return (
    <>
      <Button variant="outline" on:click={() => locked(true)}>Confirm shipment</Button>
      <Dialog open={locked} onClose={() => locked(false)} title="Confirm shipment" description="Escape and outside presses are ignored; choose an action." closeOnEscape={false} closeOnOutside={false} showCloseButton={false}>
        <p>Only the buttons in this panel can close it.</p>
        <div class="demo-row">
          <Button variant="outline" on:click={() => locked(false)}>Cancel</Button>
          <Button on:click={() => locked(false)}>Confirm</Button>
        </div>
      </Dialog>
    </>
  );
}
