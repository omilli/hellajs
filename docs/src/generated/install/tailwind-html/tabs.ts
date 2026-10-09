import { html, rovingTabIndex } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChild, HellaNode } from "@hellajs/dom";
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

interface TabsProps extends HTMLAttributes<"div"> {
  class?: string;
  items: TabsItem[];
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
  children?: HellaChild | (() => HellaChild);
  active?: () => boolean;
}

export function TabsList({ variant = "default", orientation = "horizontal", children, class: cls, ...attrs }: TabsListProps): HellaNode {
  return html`
    <div
      role="tablist"
      data-slot="tabs-list"
      data-orientation="${orientation}"
      data-variant="${variant}"
      aria-orientation="${orientation}"
      class="${
        cn("group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none", variants[variant], cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function TabsTrigger({ id, active, onActivate, orientation = "horizontal", listVariant = "default", "on:click": userClick, children, class: cls, ...attrs }: TabsTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      role="tab"
      data-slot="tabs-trigger"
      id="${id === undefined ? undefined : `${"hella-tabs-tab-"}${id}`}"
      aria-selected="${() => (active?.() ? "true" : "false")}"
      aria-controls="${id === undefined ? undefined : `${"hella-tabs-panel-"}${id}`}"
      data-state="${() => (active?.() ? "active" : "inactive")}"
      data-orientation="${orientation}"
      data-variant="${listVariant}"
      class="${
        cn("relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100", cls)
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); onActivate?.(); }}"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

export function TabsContent({ id, active, children, class: cls, ...attrs }: TabsContentProps): HellaNode {
  return html`
    <div
      role="tabpanel"
      data-slot="tabs-content"
      id="${id === undefined ? undefined : `${"hella-tabs-panel-"}${id}`}"
      aria-labelledby="${id === undefined ? undefined : `${"hella-tabs-tab-"}${id}`}"
      data-state="${() => (active?.() ? "active" : "inactive")}"
      hidden="${() => !active?.()}"
      class="${
        cn("flex-1 outline-none", cls)
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export default function Tabs({ items, initialId, orientation = "horizontal", variant = "default", class: cls, ...attrs }: TabsProps): HellaNode {
  const selected = signal(initialId ?? items[0]!.id);
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

  return html`
    <div
      data-slot="tabs"
      data-orientation="${orientation}"
      class="${
        cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", cls)
      }"
      hook:afterMount="${(node: Element) => {
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
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
        tablist = null;
      }}"
      ...${attrs}
    >
      ${TabsList({
        variant,
        orientation,
        children: items.map((item) => TabsTrigger({
          id: item.id,
          active: () => selected() === item.id,
          onActivate: () => select(item.id),
          orientation,
          listVariant: variant,
          children: item.label,
        })),
      })}
      ${items.map((item) => TabsContent({
        id: item.id,
        active: () => selected() === item.id,
        children: item.content,
      }))}
    </div>
  ` as HellaNode;
}
