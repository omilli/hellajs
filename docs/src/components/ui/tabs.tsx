import { ForEach } from "@hellajs/dom";
import { tabs } from "@hellajs/headless";
import type { HTMLAttributes, HellaChild } from "@hellajs/dom";

interface TabsItem {
  id: string;
  label: string;
  content: HellaChild | (() => HellaChild);
}

interface TabsProps extends HTMLAttributes<"div"> {
  class?: string;
  /** The rendered tabs. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. Items auto-key by `id`, so reorders preserve trigger and panel identity. */
  items: TabsItem[] | (() => TabsItem[]);
  initialId?: string;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
}

interface TabsListProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChild | HellaChild[];
  variant?: "default" | "line";
  orientation?: "horizontal" | "vertical";
}

interface TabsTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  /** The raw TabsItem id - the DOM id is `${TAB_ID}${id}`. */
  id?: string;
  /** The tab's value key; wins over `id` when both are given. */
  value?: string;
  children?: HellaChild;
  active?: () => boolean;
  onActivate?: () => void;
  orientation?: "horizontal" | "vertical";
  listVariant?: "default" | "line";
}

interface TabsContentProps extends HTMLAttributes<"div"> {
  class?: string;
  /** The raw TabsItem id - the DOM id is `${PANEL_ID}${id}`. */
  id?: string;
  /** The panel's value key; wins over `id` when both are given. */
  value?: string;
  children?: HellaChild | (() => HellaChild);
  active?: () => boolean;
}

export type { TabsItem };

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("tabs", {
  display: "flex",
  gap: "0.5rem",
  "&[data-orientation='horizontal']": {
    flexDirection: "column",
  },
});

const list = style("tabs-list", {
  alignItems: "center",
  borderRadius: tokens.radius,
  color: tokens.mutedForeground,
  display: "inline-flex",
  height: "2.25rem",
  justifyContent: "center",
  padding: "3px",
  width: "fit-content",
  "&[data-orientation='vertical']": {
    flexDirection: "column",
    height: "fit-content",
  },
  "&[data-variant='line']": {
    borderRadius: "0",
  },
});

const variants = {
  default: style("tabs-list-default", {
    backgroundColor: tokens.muted,
  }),
  line: style("tabs-list-line", {
    background: "transparent",
    gap: "0.25rem",
  }),
};

const trigger = style("tabs-trigger", {
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: `color-mix(in oklab, ${tokens.foreground} 60%, transparent)`,
  display: "inline-flex",
  flex: "1",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.375rem",
  height: "calc(100% - 1px)",
  justifyContent: "center",
  lineHeight: "1.25rem",
  paddingBlock: "0.25rem",
  paddingInline: "0.5rem",
  position: "relative",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:hover": {
    color: tokens.foreground,
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    outline: `1px solid ${tokens.ring}`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:is(.dark *)": {
    color: tokens.mutedForeground,
  },
  "&:is(.dark *):hover": {
    color: tokens.foreground,
  },
  "&[data-state='active']": {
    backgroundColor: tokens.background,
    color: tokens.foreground,
  },
  "&:is(.dark *)[data-state='active']": {
    backgroundColor: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
    borderColor: tokens.input,
    color: tokens.foreground,
  },
  "&::after": {
    content: "",
    backgroundColor: tokens.foreground,
    opacity: "0",
    position: "absolute",
    transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
});

const content = style("tabs-content", {
  flex: "1",
  outlineStyle: "none",
});

css({
  "[data-slot='tabs-trigger'][data-orientation='vertical']": {
    justifyContent: "flex-start",
    width: "100%",
  },
  "[data-slot='tabs-trigger'][data-orientation='horizontal']::after": {
    bottom: "-5px",
    height: "2px",
    left: "0",
    right: "0",
  },
  "[data-slot='tabs-trigger'][data-orientation='vertical']::after": {
    bottom: "0",
    right: "-0.25rem",
    top: "0",
    width: "2px",
  },
  "[data-slot='tabs-trigger'][data-variant='default'][data-state='active']": {
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  },
  "[data-slot='tabs-trigger'][data-variant='line']": {
    backgroundColor: "transparent",
  },
  "[data-slot='tabs-trigger'][data-variant='line'][data-state='active']": {
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  ".dark [data-slot='tabs-trigger'][data-variant='line'][data-state='active']": {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  "[data-slot='tabs-trigger'][data-variant='line'][data-state='active']::after": {
    opacity: "1",
  },
});

export function TabsList({
  variant = "default",
  orientation = "horizontal",
  children,
  class: cls,
  ...attrs
}: TabsListProps): JSX.Element {
  const { List } = tabs({ orientation });
  return (
    <List
      data-variant={variant}
      class={
        [list, variants[variant], cls]
      }
      {...attrs}
    >
      {children}
    </List>
  );
}

export function TabsTrigger({
  id,
  value,
  active,
  onActivate,
  orientation = "horizontal",
  listVariant = "default",
  children,
  class: cls,
  ...attrs
}: TabsTriggerProps): JSX.Element {
  const { Trigger } = tabs({ orientation });
  return (
    <Trigger
      value={value ?? id}
      active={active}
      onActivate={onActivate}
      data-variant={listVariant}
      class={
        [trigger, cls]
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

export function TabsContent({
  id,
  value,
  active,
  children,
  class: cls,
  ...attrs
}: TabsContentProps): JSX.Element {
  const { Content } = tabs();
  return (
    <Content
      value={value ?? id}
      active={active}
      class={
        [content, cls]
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

export function Tabs({
  items,
  initialId,
  orientation = "horizontal",
  variant = "default",
  class: cls,
  ...attrs
}: TabsProps): JSX.Element {
  const { List, Trigger, Content } = tabs({
    orientation,
    defaultValue: initialId ?? (typeof items === "function" ? items()[0] : items[0])!.id,
  });

  return (
    <div
      data-slot="tabs"
      data-orientation={orientation}
      class={
        [base, cls]
      }
      {...attrs}
    >
      <List
        data-variant={variant}
        class={
          [list, variants[variant]]
        }
      >
        <ForEach
          each={items}
          use={(item) => (
            <Trigger
              value={item.id}
              data-variant={variant}
              class={
                [trigger]
              }
            >
              {item.label}
            </Trigger>
          )}
        />
      </List>
      <ForEach each={items} use={(item) => <Content value={item.id}>{item.content}</Content>} />
    </div>
  );
}
