import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { navigationMenu, NavRows } from "@hellajs/headless";

export function NavigationMenuDemo() {
  const value = signal("");

  const NavigationMenu = navigationMenu({
    value: () => value(),
    onValueChange: (next) => value(next),
  });

  const navigationMenuDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    "& .bar": {
      display: "inline-flex",
      position: "relative",
    },
    "& .bar ul": {
      display: "flex",
      gap: "0.25rem",
      listStyle: "none",
      margin: 0,
      padding: 0,
    },
    '& .bar [data-slot="navigation-menu-trigger"][aria-expanded="true"]': {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
    // The shared viewport slot sits inside the bar; the panel publishes its
    // measured size through the viewport var, so the slot sizes itself.
    '& [data-slot="navigation-menu-viewport"]': {
      backgroundColor: "#1c1c26",
      color: "#e8e8f2",
      display: "none",
      height: "var(--radix-navigation-menu-viewport-height)",
      left: 0,
      marginTop: "0.375rem",
      overflow: "hidden",
      position: "absolute",
      right: 0,
      top: "100%",
      zIndex: 10,

      '&[data-state="open"]': {
        display: "flex",
      },
    },
    '& [data-slot="navigation-menu-content"]': {
      padding: "0.5rem",
      width: "16rem",
    },
    '& [data-slot="navigation-menu-link"]': {
      display: "block",
      padding: "0.5rem 0.625rem",
      textDecoration: "none",

      "&:hover": {
        backgroundColor: "#e8e8f2",
        color: "#18181f",
      },
    },
  });

  return (
    <div class={navigationMenuDemo}>
      <NavigationMenu.Root class="bar">
        <NavRows.List>
          <NavRows.Item>
            <NavigationMenu.Trigger value="learn">Learn</NavigationMenu.Trigger>
            <NavigationMenu.Content value="learn">
              <NavRows.Link href="#learn">Intro</NavRows.Link>
              <NavRows.Link href="#start">Getting started</NavRows.Link>
            </NavigationMenu.Content>
          </NavRows.Item>
          <NavRows.Item>
            <NavigationMenu.Trigger value="reference">Reference</NavigationMenu.Trigger>
            <NavigationMenu.Content value="reference">
              <NavRows.Link href="#reference">API</NavRows.Link>
            </NavigationMenu.Content>
          </NavRows.Item>
        </NavRows.List>
      </NavigationMenu.Root>
      <p class="note">
        {() => (value() ? `Panel open: ${value()}` : "Click or hover a trigger.")}
      </p>
    </div>
  );
}
