import { isFunction, isString, signalSet } from "@hellajs/core";
import { rovingTabIndex } from "./utils/rovingTabIndex";
import type {
  AccordionComponents,
  AccordionContentProps,
  AccordionItemProps,
  AccordionOptions,
  AccordionRootProps,
  AccordionTriggerProps,
} from "./types/components";

/** The trigger id prefix: `hella-accordion-trigger-<value>`, mirrored by `aria-controls`. */
const TRIGGER_ID = "hella-accordion-trigger-";

/** The content id prefix: `hella-accordion-content-<value>`, mirrored by `aria-labelledby`. */
const CONTENT_ID = "hella-accordion-content-";

/**
 * Creates the accordion parts: `Root` + `Item` + `Trigger` + `Content`. The closure
 * owns the open values — controlled through a `value` accessor when passed, an
 * internal `signalSet` when omitted (`defaultValue` seeds it; a multi-value seed
 * clamps to the first in single mode). Single mode keeps at most one item open and
 * refuses the last close unless `collapsible`; multiple mode toggles freely.
 * `Root` arms rovingTabIndex over the natively focusable trigger buttons — arrows
 * and Home/End move focus only (focus never toggles), draining at unmount.
 * `Item`/`Trigger`/`Content` are value-keyed: ids and the aria cycle derive from
 * the value, and `active`/`onToggle` override for manual composition. Call in
 * component scope so the state signals dispose with the component.
 *
 * ```tsx
 * const { Root, Item, Trigger, Content } = accordion({
 *   type: "single",
 *   collapsible: true,
 *   defaultValue: "a",
 *   onValueChange: setValue,
 * });
 *
 * <Root>
 *   <Item value="a">
 *     <Trigger value="a">Title</Trigger>
 *     <Content value="a">Body</Content>
 *   </Item>
 * </Root>
 * ```
 * @param options `type` (default `"single"`), `collapsible`, controlled `value`, `defaultValue` seed, and `onValueChange`; an omitted `value` keeps state internal.
 * @returns The part set, plus the `isOpen` reader keyed by value for manual composition.
 */
export function accordion(options: AccordionOptions = {}): AccordionComponents {
  const mode = options.type ?? "single";
  const collapsible = options.collapsible;
  const value = options.value;
  const onValueChange = options.onValueChange;
  // A single open string wraps to a one-value list, a list passes through, absent starts closed.
  const seed = isString(options.defaultValue)
    ? [options.defaultValue]
    : (options.defaultValue ?? []);
  // Single mode keeps at most one value open: a multi-value seed clamps to the first.
  // signalSet gives each item's isOpen reader its own membership signal, so a toggle
  // wakes only the affected items' state effects.
  const internal = signalSet<string>(mode === "single" ? seed.slice(0, 1) : seed);

  const current = (): string[] => {
    if (value === undefined) return Array.from(internal());
    const v = value();
    return isString(v) ? [v] : v;
  };

  const isOpen = (key: string): boolean =>
    value === undefined ? internal().has(key) : current().includes(key);

  const toggle = (key: string, disabled?: boolean): void => {
    if (disabled) return;
    if (isOpen(key)) {
      if (mode === "single" && collapsible !== true) return;
      if (value === undefined) internal.delete(key);
      const rest = current().filter((open) => open !== key);
      onValueChange?.(mode === "single" ? "" : rest);
    } else if (mode === "single") {
      // The reconcile setter swaps the open item in one pass: closes the previous value, opens this one.
      if (value === undefined) internal(new Set([key]));
      onValueChange?.(key);
    } else {
      if (value === undefined) internal.add(key);
      onValueChange?.([...current(), key]);
    }
  };

  const Root = (props: AccordionRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    const wirings: (() => void)[] = [];
    return (
      <div
        data-slot="accordion"
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          wirings.push(rovingTabIndex(node));
        }}
        hook:beforeDestroy={() => {
          while (wirings.length) wirings.pop()!();
        }}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  const Item = (props: AccordionItemProps): JSX.Element => {
    const { value: itemValue, active, children, class: cls, ...attrs } = props;
    const keyed = itemValue ?? "";
    const isActive = (): boolean =>
      active !== undefined ? (isFunction(active) ? active() : active) : isOpen(keyed);

    return (
      <div
        data-slot="accordion-item"
        data-value={keyed}
        data-state={isActive() ? "open" : "closed"}
        class={cls}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  const Trigger = (props: AccordionTriggerProps): JSX.Element => {
    const {
      value: itemValue,
      active,
      onToggle,
      disabled,
      children,
      class: cls,
      "on:click": userClick,
      ...attrs
    } = props;
    const keyed = itemValue ?? "";
    const isActive = (): boolean =>
      active !== undefined ? (isFunction(active) ? active() : active) : isOpen(keyed);

    return (
      <button
        type="button"
        data-slot="accordion-trigger"
        id={itemValue === undefined ? undefined : `${TRIGGER_ID}${keyed}`}
        aria-expanded={isActive() ? "true" : "false"}
        aria-controls={itemValue === undefined ? undefined : `${CONTENT_ID}${keyed}`}
        aria-disabled={disabled ? "true" : undefined}
        disabled={disabled ? true : undefined}
        data-state={isActive() ? "open" : "closed"}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          if (onToggle !== undefined) {
            onToggle();
            return;
          }
          toggle(keyed, disabled ? true : undefined);
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const Content = (props: AccordionContentProps): JSX.Element => {
    const { value: itemValue, active, children, class: cls, ...attrs } = props;
    const keyed = itemValue ?? "";
    const isActive = (): boolean =>
      active !== undefined ? (isFunction(active) ? active() : active) : isOpen(keyed);

    return (
      <div
        role="region"
        data-slot="accordion-content"
        id={itemValue === undefined ? undefined : `${CONTENT_ID}${keyed}`}
        aria-labelledby={itemValue === undefined ? undefined : `${TRIGGER_ID}${keyed}`}
        data-state={isActive() ? "open" : "closed"}
        class={cls}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  return { Root, Item, Trigger, Content, isOpen };
}
