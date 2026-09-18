import { html, rovingTabIndex } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaChild, HellaNode } from "@hellajs/dom";

import { css, style } from "@hellajs/css";

const base = style({
  display: "flex",
  gap: "0.5rem",
  "&[data-orientation='horizontal']": {
    flexDirection: "column",
  },
}, { label: "hella-tabs", layer: "hella" });

const list = style({
  alignItems: "center",
  borderRadius: "var(--radius)",
  color: "var(--muted-foreground)",
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
}, { label: "hella-tabs-list", layer: "hella" });

const variants = {
  default: style({
    backgroundColor: "var(--muted)",
  }, { label: "hella-tabs-list-default", layer: "hella" }),
  line: style({
    background: "transparent",
    gap: "0.25rem",
  }, { label: "hella-tabs-list-line", layer: "hella" }),
};

const trigger = style({
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "color-mix(in oklab, var(--foreground) 60%, transparent)",
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
    color: "var(--foreground)",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    outline: "1px solid var(--ring)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:is(.dark *)": {
    color: "var(--muted-foreground)",
  },
  "&:is(.dark *):hover": {
    color: "var(--foreground)",
  },
  "&[data-state='active']": {
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
  },
  "&:is(.dark *)[data-state='active']": {
    backgroundColor: "color-mix(in oklab, var(--input) 30%, transparent)",
    borderColor: "var(--input)",
    color: "var(--foreground)",
  },
  "&::after": {
    content: "",
    backgroundColor: "var(--foreground)",
    opacity: "0",
    position: "absolute",
    transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
}, { label: "hella-tabs-trigger", layer: "hella" });

const content = style({
  flex: "1",
  outlineStyle: "none",
}, { label: "hella-tabs-content", layer: "hella" });

// Variant/orientation state the trigger carries itself (data-orientation,
// data-variant): class-scoped nesting cannot restate them self-based at
// higher precedence, so these register as raw attribute selectors in the
// same layer, after the part classes.
css({
  "@layer hella": {
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
  },
});

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

const TAB_ID = "hella-tabs-tab-";
const PANEL_ID = "hella-tabs-panel-";

export function TabsList(props: TabsListProps): HellaNode {
  const orientation = props.orientation ?? "horizontal";
  const variant = props.variant ?? "default";
  return html`
    <div
      role="tablist"
      data-slot="tabs-list"
      data-orientation="${orientation}"
      data-variant="${variant}"
      aria-orientation="${orientation}"
      class="${
        [list, variants[variant], props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function TabsTrigger(props: TabsTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      role="tab"
      data-slot="tabs-trigger"
      id="${props.id === undefined ? undefined : `${TAB_ID}${props.id}`}"
      aria-selected="${() => (props.active?.() ? "true" : "false")}"
      aria-controls="${props.id === undefined ? undefined : `${PANEL_ID}${props.id}`}"
      data-state="${() => (props.active?.() ? "active" : "inactive")}"
      data-orientation="${props.orientation ?? "horizontal"}"
      data-variant="${props.listVariant ?? "default"}"
      class="${
        [trigger, props.class]
      }"
      e:click="${() => props.onActivate?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

export function TabsContent(props: TabsContentProps): HellaNode {
  return html`
    <div
      role="tabpanel"
      data-slot="tabs-content"
      id="${props.id === undefined ? undefined : `${PANEL_ID}${props.id}`}"
      aria-labelledby="${props.id === undefined ? undefined : `${TAB_ID}${props.id}`}"
      data-state="${() => (props.active?.() ? "active" : "inactive")}"
      hidden="${() => !props.active?.()}"
      class="${
        [content, props.class]
      }"
    >${props.children}</div>
  ` as HellaNode;
}

export default function Tabs(props: TabsProps): HellaNode {
  const selected = signal(props.initialId ?? props.items[0]!.id);
  const orientation = props.orientation ?? "horizontal";
  const listVariant = props.variant ?? "default";
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
        [base, props.class]
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
    >
      ${TabsList({
        variant: listVariant,
        orientation,
        children: props.items.map((item) => TabsTrigger({
          id: item.id,
          active: () => selected() === item.id,
          onActivate: () => select(item.id),
          orientation,
          listVariant,
          children: item.label,
        })),
      })}
      ${props.items.map((item) => TabsContent({
        id: item.id,
        active: () => selected() === item.id,
        children: item.content,
      }))}
    </div>
  ` as HellaNode;
}
