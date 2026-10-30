import { isFunction, signal } from "@hellajs/core";
import { rovingTabIndex } from "./rovingTabIndex";
import type {
  TabsContentProps,
  TabsListProps,
  TabsOptions,
  TabsParts,
  TabsTriggerProps,
} from "./types/parts";

/** The trigger id prefix: `hella-tabs-tab-<value>`, mirrored by `aria-controls`. */
const TAB_ID = "hella-tabs-tab-";

/** The panel id prefix: `hella-tabs-panel-<value>`, mirrored by `aria-labelledby`. */
const PANEL_ID = "hella-tabs-panel-";

/**
 * Creates the tabs part set: `List` + `Trigger` + `Content`. The closure owns
 * the active tab value — controlled through a `value` accessor when passed, an
 * internal signal when omitted (`defaultValue` seeds it). `List` renders the
 * roving tablist: arrow keys wrap among the enabled triggers, focusing a
 * trigger selects it, and the selection lands the tabindex walk; the wiring
 * disposes at unmount. `Trigger` defaults its selected state and click action
 * from the factory (`active`/`onActivate` override for manual composition);
 * `Content` mounts the panel for a value, hidden while inactive. Call in
 * component scope so the state signal disposes with the component.
 *
 * ```tsx
 * const Tabs = tabs({ value, onValueChange });
 *
 * <Tabs.List>
 *   <Tabs.Trigger value="account">Account</Tabs.Trigger>
 * </Tabs.List>
 * <Tabs.Content value="account">…</Tabs.Content>
 * ```
 * @param options controlled `value`, `defaultValue` seed, `orientation`, and `onValueChange`; an omitted `value` keeps state internal.
 * @returns The part set, composed as `Tabs.List`-style members.
 */
export function tabs(options: TabsOptions = {}): TabsParts {
  const value = options.value;
  const onValueChange = options.onValueChange;
  const orientation = options.orientation;
  const internal = signal(options.defaultValue ?? "");
  const current = (): string => (value !== undefined ? value() : internal());
  let list: HTMLElement | null = null;
  const wirings: (() => void)[] = [];

  const roveToSelection = (): void => {
    if (!list) return;
    const tabs = list.querySelectorAll<HTMLElement>("[role='tab']");
    let matched = -1;
    let i = 0;
    const len = tabs.length;
    while (i < len) {
      if (tabs[i]!.id === `${TAB_ID}${current()}`) {
        matched = i;
        break;
      }
      i++;
    }
    if (matched === -1) matched = 0;
    let w = 0;
    while (w < len) {
      tabs[w]!.tabIndex = w === matched ? 0 : -1;
      w++;
    }
  };

  const select = (next: string): void => {
    if (current() === next) return;
    if (value === undefined) internal(next);
    onValueChange?.(next);
    roveToSelection();
  };

  const List = (props: TabsListProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div
        role="tablist"
        data-slot="tabs-list"
        data-orientation={orientation}
        aria-orientation={orientation}
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          list = node;
          wirings.push(rovingTabIndex(node, { orientation }));
          const onFocusIn = (event: Event) => {
            const tab = event.target as HTMLElement;
            if (tab.getAttribute("role") !== "tab" || !tab.id.startsWith(TAB_ID)) return;
            select(tab.id.slice(TAB_ID.length));
          };
          node.addEventListener("focusin", onFocusIn);
          wirings.push(() => node.removeEventListener("focusin", onFocusIn));
          roveToSelection();
        }}
        hook:beforeDestroy={() => {
          while (wirings.length) wirings.pop()!();
          list = null;
        }}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  const Trigger = (props: TabsTriggerProps): JSX.Element => {
    const {
      value: tabValue,
      active,
      onActivate,
      disabled,
      children,
      class: cls,
      "on:click": userClick,
      ...attrs
    } = props;
    const keyed = tabValue ?? "";
    const isActive = (): boolean =>
      active !== undefined ? (isFunction(active) ? active() : active) : current() === keyed;

    return (
      <button
        type="button"
        role="tab"
        data-slot="tabs-trigger"
        id={tabValue === undefined ? undefined : `${TAB_ID}${keyed}`}
        aria-selected={isActive() ? "true" : "false"}
        aria-controls={tabValue === undefined ? undefined : `${PANEL_ID}${keyed}`}
        data-state={isActive() ? "active" : "inactive"}
        data-orientation={orientation}
        disabled={disabled ? true : undefined}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          if (onActivate !== undefined) {
            onActivate();
            return;
          }
          if (!disabled) select(keyed);
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const Content = (props: TabsContentProps): JSX.Element => {
    const { value: tabValue, active, children, class: cls, ...attrs } = props;
    const keyed = tabValue ?? "";
    const isActive = (): boolean =>
      active !== undefined ? (isFunction(active) ? active() : active) : current() === keyed;

    return (
      <div
        role="tabpanel"
        data-slot="tabs-content"
        id={tabValue === undefined ? undefined : `${PANEL_ID}${keyed}`}
        aria-labelledby={tabValue === undefined ? undefined : `${TAB_ID}${keyed}`}
        data-state={isActive() ? "active" : "inactive"}
        hidden={!isActive()}
        class={cls}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  return { List, Trigger, Content };
}
