import { html, rovingTabIndex } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChild, HellaNode } from "@hellajs/dom";

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

const TAB_ID = "hella-tabs-tab-";
const PANEL_ID = "hella-tabs-panel-";

export function TabsList({ variant = "default", orientation = "horizontal", children, class: cls, ...attrs }: TabsListProps): HellaNode {
  return html`
    <div
      role="tablist"
      data-slot="tabs-list"
      data-orientation="${orientation}"
      data-variant="${variant}"
      aria-orientation="${orientation}"
      class="${
        [list, variants[variant], cls]
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
      id="${id === undefined ? undefined : `${TAB_ID}${id}`}"
      aria-selected="${() => (active?.() ? "true" : "false")}"
      aria-controls="${id === undefined ? undefined : `${PANEL_ID}${id}`}"
      data-state="${() => (active?.() ? "active" : "inactive")}"
      data-orientation="${orientation}"
      data-variant="${listVariant}"
      class="${
        [trigger, cls]
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
      id="${id === undefined ? undefined : `${PANEL_ID}${id}`}"
      aria-labelledby="${id === undefined ? undefined : `${TAB_ID}${id}`}"
      data-state="${() => (active?.() ? "active" : "inactive")}"
      hidden="${() => !active?.()}"
      class="${
        [content, cls]
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
    const current = `${TAB_ID}${selected()}`;
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
        [base, cls]
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
          if (tab.getAttribute("role") === "tab" && tab.id.startsWith(TAB_ID)) {
            select(tab.id.slice(TAB_ID.length));
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
