
import Tabs from "@registry/tabs/css/tabs.js";
import { stack } from "./demo-kit";

const account = [
  { id: "account", label: "Account", content: [<p>Change your name, email, and profile details.</p>] },
  { id: "password", label: "Password", content: [<p>Set a new password. Minimum eight characters.</p>] },
  { id: "notifications", label: "Notifications", content: [<p>Choose which alerts you receive by email.</p>] },
];

const line = [
  { id: "overview", label: "Overview", content: [<p>A summary of your workspace activity this week.</p>] },
  { id: "activity", label: "Activity", content: [<p>Recent edits, comments, and mentions.</p>] },
];

export default function TabsDemo() {
  return (
    <div class={stack}>
      <Tabs items={account} />
    </div>
  );
}

export function TabsLineDemo() {
  return (
    <div class={stack}>
      <Tabs items={line} variant="line" initialId="activity" />
    </div>
  );
}
