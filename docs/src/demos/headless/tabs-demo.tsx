import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { tabs } from "@hellajs/headless";

export function TabsDemo() {
  const value = signal("account");

  const Tabs = tabs({
    value: () => value(),
    onValueChange: (next) => value(next),
  });

  const tabsDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    width: "300px",
    '& [role="tablist"]': {
      display: "flex",
      gap: "0.25rem",
    },
    '& [role="tab"][data-state="active"]': {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
    '& [role="tabpanel"]': {
      fontSize: "0.875rem",
      opacity: 0.7,
    },
  });

  return (
    <div class={tabsDemo}>
      <Tabs.List>
        <Tabs.Trigger value="account">Account</Tabs.Trigger>
        <Tabs.Trigger value="password">Password</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="account">Update your profile details here.</Tabs.Content>
      <Tabs.Content value="password">Change your password here.</Tabs.Content>
    </div>
  );
}
