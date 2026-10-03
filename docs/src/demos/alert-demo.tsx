
import Alert, { AlertDescription, AlertTitle } from "@registry/alert/css/alert.js";
import { stack } from "./demo-kit";

const infoIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 16v-4"></path>
    <path d="M12 8h.01"></path>
  </svg>
);

const alertIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 8v4"></path>
    <path d="M12 16h.01"></path>
  </svg>
);

export default function AlertDemo() {
  return (
    <div class={stack}>
      <Alert>
        {infoIcon}
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can copy this alert into any project with one add command.</AlertDescription>
      </Alert>
    </div>
  );
}

export function AlertDestructiveDemo() {
  return (
    <div class={stack}>
      <Alert variant="destructive">
        {alertIcon}
        <AlertTitle>Deployment failed</AlertTitle>
        <AlertDescription>The edge function timed out after 30 seconds. Check the logs, then retry.</AlertDescription>
      </Alert>
    </div>
  );
}
