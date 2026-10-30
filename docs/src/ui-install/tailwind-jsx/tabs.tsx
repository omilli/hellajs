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
import { cn } from "./cn.js";

export type { TabsItem };

const variants = {
  default: "bg-muted",
  line: "gap-1 bg-transparent",
};

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
        cn("group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none", variants[variant], cls)
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
        cn("relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100", cls)
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
        cn("flex-1 outline-none", cls)
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
        cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", cls)
      }
      {...attrs}
    >
      <List
        data-variant={variant}
        class={
          cn("group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none", variants[variant])
        }
      >
        <ForEach
          each={items}
          use={(item) => (
            <Trigger
              value={item.id}
              data-variant={variant}
              class={
                cn("relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100")
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
