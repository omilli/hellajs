import { html, rovingTabIndex } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaChild, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

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
        // @hella:compose
        [list, variants[variant], props.class]
        // @hella:end
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
        // @hella:compose
        [trigger, props.class]
        // @hella:end
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
        // @hella:compose
        [content, props.class]
        // @hella:end
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
        // @hella:compose
        [base, props.class]
        // @hella:end
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
