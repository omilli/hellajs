import { signal } from "@hellajs/core";

import { Button } from "@components/ui/button.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@components/ui/alert-dialog.js";

export function AlertDialogDemo() {
  const open = signal(false);

  return (
    <>
      <Button variant="destructive" on:click={() => open(true)}>Delete project</Button>
      <AlertDialog open={open} onClose={() => open(false)} title="Delete project" description="This removes every deployment attached to it. This action cannot be undone.">
        <AlertDialogFooter>
          <AlertDialogCancel onClose={() => open(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClose={() => open(false)}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
  );
}
