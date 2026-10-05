import { signal } from "@hellajs/core";

import Button from "@registry/button/css/button.js";
import AlertDialog, {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogTitle,
} from "@registry/alert-dialog/css/alert-dialog.js";
import { Portal } from "@hellajs/dom";

export function AlertDialogDemo() {
  const open = signal(false);

  return (
    <>
      <Button variant="destructive" onclick={() => open(true)}>Delete project</Button>
      <AlertDialog open={open} onClose={() => open(false)} title="Delete project" description="This removes every deployment attached to it. This action cannot be undone.">
        <AlertDialogFooter>
          <AlertDialogCancel onClose={() => open(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClose={() => open(false)}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
  );
}

export function AlertDialogManualDemo() {
  const open = signal(false);
  const state = (): "open" | "closed" => (open() ? "open" : "closed");

  return (
    <>
      <Button variant="outline" onclick={() => open(!open())}>Delete</Button>
      {() => open() && (
        <Portal to="body">
          <AlertDialogOverlay state={state} />
          <AlertDialogContent state={state} labelledBy="alert-manual-title" describedBy="alert-manual-description" onClose={() => open(false)}>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
              </AlertDialogMedia>
              <AlertDialogTitle id="alert-manual-title">Remove this project?</AlertDialogTitle>
              <AlertDialogDescription id="alert-manual-description">Deployments attached to it stop immediately.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClose={() => open(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClose={() => open(false)}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </Portal>
      )}
    </>
  );
}
