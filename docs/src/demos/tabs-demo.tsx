
import { Tabs } from "@components/ui/tabs.js";
import { signal } from "@hellajs/core";

const account = [
  { id: "account", label: "Account", content: [<p>Change your name, email, and profile details.</p>] },
  { id: "password", label: "Password", content: [<p>Set a new password. Minimum eight characters.</p>] },
  { id: "notifications", label: "Notifications", content: [<p>Choose which alerts you receive by email.</p>] },
];

const line = [
  { id: "overview", label: "Overview", content: [<p>A summary of your workspace activity this week.</p>] },
  { id: "activity", label: "Activity", content: [<p>Recent edits, comments, and mentions.</p>] },
];

export function TabsDemo() {
  return (
    <>
      <Tabs items={account} />
    </>
  );
}

export function TabsLineDemo() {
  return (
    <>
      <Tabs items={line} variant="line" initialId="activity" />
    </>
  );
}

export function TabsControlledDemo() {
  const active = signal("notifications");

  return (
    <>
      <Tabs
        items={account}
        value={() => active()}
        onValueChange={(v) => active(v)}
      />
      <p class="demo-muted">{() => `Active tab: ${active()}`}</p>
    </>
  );
}
