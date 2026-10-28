import { signal } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import { rovingTabIndex } from "@hellajs/headless";
import type {
  TabsItem,
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
} from "./tabs-types.js";

export type { TabsItem };

// @hella:styles
declare const base: string;
declare const content: string;
declare const list: string;
declare const trigger: string;
declare const variants: Record<string, string>;
// @hella:end

const TAB_ID = "hella-tabs-tab-";
const PANEL_ID = "hella-tabs-panel-";

export function TabsList({
  variant = "default",
  orientation = "horizontal",
  children,
  class: cls,
  ...attrs
}: TabsListProps): JSX.Element {
  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      data-orientation={orientation}
      data-variant={variant}
      aria-orientation={orientation}
      class={
        // @hella:compose
        [list, variants[variant], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  id,
  active,
  onActivate,
  orientation = "horizontal",
  listVariant = "default",
  "on:click": userClick,
  children,
  class: cls,
  ...attrs
}: TabsTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      data-slot="tabs-trigger"
      id={id === undefined ? undefined : `${TAB_ID}${id}`}
      aria-selected={active?.() ? "true" : "false"}
      aria-controls={id === undefined ? undefined : `${PANEL_ID}${id}`}
      data-state={active?.() ? "active" : "inactive"}
      data-orientation={orientation}
      data-variant={listVariant}
      class={
        // @hella:compose
        [trigger, cls]
        // @hella:end
      }
      on:click={function (e) {
        userClick?.call(this, e);
        onActivate?.();
      }}
      {...attrs}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  id,
  active,
  children,
  class: cls,
  ...attrs
}: TabsContentProps): JSX.Element {
  return (
    <div
      role="tabpanel"
      data-slot="tabs-content"
      id={id === undefined ? undefined : `${PANEL_ID}${id}`}
      aria-labelledby={id === undefined ? undefined : `${TAB_ID}${id}`}
      data-state={active?.() ? "active" : "inactive"}
      hidden={!active?.()}
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
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
  const selected = signal(initialId ?? (typeof items === "function" ? items()[0] : items[0])!.id);
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

  return (
    <div
      data-slot="tabs"
      data-orientation={orientation}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
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
          if (tab.getAttribute("role") === "tab" && tab.id.startsWith(TAB_ID)) {
            select(tab.id.slice(TAB_ID.length));
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
      {...attrs}
    >
      <TabsList
        variant={variant}
        orientation={orientation}
        children={
          <ForEach
            each={items}
            use={(item) => (
              <TabsTrigger
                id={item.id}
                active={() => selected() === item.id}
                onActivate={() => select(item.id)}
                orientation={orientation}
                listVariant={variant}
              >
                {item.label}
              </TabsTrigger>
            )}
          />
        }
      />
      <ForEach
        each={items}
        use={(item) => (
          <TabsContent id={item.id} active={() => selected() === item.id}>
            {item.content}
          </TabsContent>
        )}
      />
    </div>
  );
}
