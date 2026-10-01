import { signal } from "@hellajs/core";
import { rovingTabIndex } from "@hellajs/dom";
import type { HellaChild } from "@hellajs/dom";
import { cn } from "./cn.js";

const variants = {
  default: "bg-muted",
  line: "gap-1 bg-transparent",
};

export interface TabsItem {
  id: string;
  label: string;
  content: HellaChild | (() => HellaChild);
}

interface TabsProps {
  items: TabsItem[];
  initialId?: string;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
  class?: string;
}

interface TabsListProps {
  variant?: "default" | "line";
  orientation?: "horizontal" | "vertical";
  children?: HellaChild | HellaChild[];
  class?: string;
}

interface TabsTriggerProps {
  /** The raw TabsItem id - the DOM id is `${TAB_ID}${id}`. */
  id?: string;
  active?: () => boolean;
  onActivate?: () => void;
  orientation?: "horizontal" | "vertical";
  listVariant?: "default" | "line";
  children?: HellaChild;
  class?: string;
}

interface TabsContentProps {
  /** The raw TabsItem id - the DOM id is `${PANEL_ID}${id}`. */
  id?: string;
  active?: () => boolean;
  children?: HellaChild | (() => HellaChild);
  class?: string;
}

export function TabsList(props: TabsListProps): JSX.Element {
  const orientation = props.orientation ?? "horizontal";
  const variant = props.variant ?? "default";
  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      data-orientation={orientation}
      data-variant={variant}
      aria-orientation={orientation}
      class={
        cn("group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none", variants[variant], props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function TabsTrigger(props: TabsTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      data-slot="tabs-trigger"
      id={props.id === undefined ? undefined : `${"hella-tabs-tab-"}${props.id}`}
      aria-selected={props.active?.() ? "true" : "false"}
      aria-controls={props.id === undefined ? undefined : `${"hella-tabs-panel-"}${props.id}`}
      data-state={props.active?.() ? "active" : "inactive"}
      data-orientation={props.orientation ?? "horizontal"}
      data-variant={props.listVariant ?? "default"}
      class={
        cn("relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100", props.class)
      }
      on:click={() => props.onActivate?.()}
    >
      {props.children}
    </button>
  );
}

export function TabsContent(props: TabsContentProps): JSX.Element {
  return (
    <div
      role="tabpanel"
      data-slot="tabs-content"
      id={props.id === undefined ? undefined : `${"hella-tabs-panel-"}${props.id}`}
      aria-labelledby={props.id === undefined ? undefined : `${"hella-tabs-tab-"}${props.id}`}
      data-state={props.active?.() ? "active" : "inactive"}
      hidden={!props.active?.()}
      class={
        cn("flex-1 outline-none", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export default function Tabs(props: TabsProps): JSX.Element {
  const selected = signal(props.initialId ?? props.items[0]!.id);
  const orientation = props.orientation ?? "horizontal";
  const listVariant = props.variant ?? "default";
  const wirings: (() => void)[] = [];
  let tablist: HTMLElement | null = null;

  const roveToSelection = (): void => {
    if (!tablist) return;
    const current = `${"hella-tabs-tab-"}${selected()}`;
    let i = 0;
    const len = tablist.children.length;
    while (i < len) {
      const tab = tablist.children[i] as HTMLElement;
      tab.tabIndex = tab.id === current ? 0 : -1;
      i++;
    }
  };

  const select = (id: string): void => {
    if (selected() === id) return;
    selected(id);
    roveToSelection();
  };

  return (
    <div
      data-slot="tabs"
      data-orientation={orientation}
      class={
        cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", props.class)
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        let i = 0;
        const len = node.children.length;
        while (i < len) {
          const child = node.children[i++] as HTMLElement;
          if (child.getAttribute("role") === "tablist") {
            tablist = child;
            break;
          }
        }
        if (!tablist) return;
        wirings.push(rovingTabIndex(tablist, { orientation }));
        const onFocusIn = (event: Event) => {
          const tab = event.target as HTMLElement;
          if (tab.getAttribute("role") === "tab" && tab.id.startsWith("hella-tabs-tab-")) {
            select(tab.id.slice("hella-tabs-tab-".length));
          }
        };
        node.addEventListener("focusin", onFocusIn);
        wirings.push(() => node.removeEventListener("focusin", onFocusIn));
        roveToSelection();
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
        tablist = null;
      }}
    >
      <TabsList
        variant={listVariant}
        orientation={orientation}
        children={props.items.map((item) => (
          <TabsTrigger
            id={item.id}
            active={() => selected() === item.id}
            onActivate={() => select(item.id)}
            orientation={orientation}
            listVariant={listVariant}
          >
            {item.label}
          </TabsTrigger>
        ))}
      />
      {props.items.map((item) => (
        <TabsContent id={item.id} active={() => selected() === item.id}>
          {item.content}
        </TabsContent>
      ))}
    </div>
  );
}
