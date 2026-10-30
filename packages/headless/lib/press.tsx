import { isFunction, signal } from "@hellajs/core";
import {
  checkAriaOf,
  checkStateOf,
  excludeSingle,
  flipMulti,
  pressChannel,
} from "./internal/press";
import { rovingTabIndex } from "./utils/rovingTabIndex";
import type {
  CheckboxIndicatorProps,
  CheckboxOptions,
  CheckboxComponents,
  CheckboxRootProps,
  RadioGroupIndicatorProps,
  RadioGroupItemProps,
  RadioGroupOptions,
  RadioGroupComponents,
  RadioGroupRootProps,
  SwitchIndicatorProps,
  SwitchOptions,
  SwitchComponents,
  SwitchRootProps,
  ToggleGroupItemProps,
  ToggleGroupOptions,
  ToggleGroupComponents,
  ToggleGroupRootProps,
  ToggleOptions,
  ToggleComponents,
  ToggleRootProps,
} from "./types/components";

/** The check icon (refs/icons/check.svg), created per call so reactive swaps never share nodes between clones. */
const checkIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    data-slot="checkbox-check-icon"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** The circle icon (refs/icons/circle.svg), created per call so reactive swaps never share nodes between clones. */
const circleIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    data-slot="radio-group-icon"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

/**
 * Creates the toggle part set: `Root`. The closure owns the pressed state —
 * controlled through a `pressed` accessor when passed, an internal signal
 * when omitted — and reports factory-driven flips through `onPressedChange`.
 * Clicks flip the state; keyboard Space/Enter rides native button activation.
 * Call in component scope so the state signal disposes with the component.
 *
 * ```tsx
 * const Toggle = toggle({ pressed, onPressedChange });
 *
 * <Toggle.Root>Bold</Toggle.Root>
 * ```
 * @param options `pressed` accessor + `onPressedChange`; an omitted `pressed` keeps state internal.
 * @returns The part set, composed as `Toggle.Root`-style members.
 */
export function toggle(options: ToggleOptions = {}): ToggleComponents {
  const pressed = pressChannel(options.pressed);
  const onPressedChange = options.onPressedChange;

  const press = (): void => {
    const next = !pressed.read();
    pressed.write(next);
    onPressedChange?.(next);
  };

  const Root = (props: ToggleRootProps): JSX.Element => {
    const { children, disabled, class: cls, "on:click": userClick, ...attrs } = props;
    return (
      <button
        type="button"
        data-slot="toggle"
        aria-pressed={pressed.read() ? "true" : "false"}
        data-state={pressed.read() ? "on" : "off"}
        disabled={disabled ? true : undefined}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          if (!disabled) press();
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  return { Root };
}

/**
 * Creates the checkbox part set: `Root` + `Indicator`. The closure owns the
 * checked and mixed states — each controlled through an accessor (`checked`,
 * `indeterminate`) when passed, internal signals when omitted; the mixed flag
 * wins for rendering, and an uncontrolled one clears on toggle. `Indicator`
 * renders the check icon by default; pass children to replace it. Call in
 * component scope so the state signals dispose with the component.
 *
 * ```tsx
 * const Check = checkbox({ checked, onCheckedChange });
 *
 * <Check.Root>
 *   <Check.Indicator />
 * </Check.Root>
 * ```
 * @param options `checked`/`indeterminate` accessors + `onCheckedChange`; omitted accessors keep state internal.
 * @returns The part set, composed as `Check.Root`-style members.
 */
export function checkbox(options: CheckboxOptions = {}): CheckboxComponents {
  const checked = pressChannel(options.checked);
  const indeterminate = pressChannel(options.indeterminate);
  const onCheckedChange = options.onCheckedChange;

  const state = (): "checked" | "unchecked" | "indeterminate" =>
    checkStateOf(checked.read(), indeterminate.read());
  const ariaChecked = (): "true" | "false" | "mixed" =>
    checkAriaOf(checked.read(), indeterminate.read());

  const toggle = (): void => {
    const next = !checked.read();
    checked.write(next);
    indeterminate.write(false);
    onCheckedChange?.(next);
  };

  const Root = (props: CheckboxRootProps): JSX.Element => {
    const { children, disabled, class: cls, "on:click": userClick, ...attrs } = props;
    return (
      <button
        type="button"
        role="checkbox"
        data-slot="checkbox"
        aria-checked={ariaChecked()}
        data-state={state()}
        disabled={disabled ? true : undefined}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          if (!disabled) toggle();
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const Indicator = (props: CheckboxIndicatorProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <span data-slot="checkbox-indicator" class={cls} {...attrs}>
        {() => (state() === "unchecked" ? null : (children ?? checkIcon()))}
      </span>
    );
  };

  return { Root, Indicator };
}

/**
 * Creates the switch part set: `Root` + `Indicator`. The closure owns the
 * checked state — controlled through a `checked` accessor when passed, an
 * internal signal when omitted. `Indicator` is the moving thumb span. Call
 * in component scope so the state signal disposes with the component.
 *
 * ```tsx
 * const Switch = toggleSwitch({ checked, onCheckedChange });
 *
 * <Switch.Root>
 *   <Switch.Indicator />
 * </Switch.Root>
 * ```
 * @param options `checked` accessor + `onCheckedChange`; an omitted `checked` keeps state internal.
 * @returns The part set, composed as `Switch.Root`-style members.
 */
export function toggleSwitch(options: SwitchOptions = {}): SwitchComponents {
  const checked = pressChannel(options.checked);
  const onCheckedChange = options.onCheckedChange;

  const toggle = (): void => {
    const next = !checked.read();
    checked.write(next);
    onCheckedChange?.(next);
  };

  const Root = (props: SwitchRootProps): JSX.Element => {
    const { children, disabled, class: cls, "on:click": userClick, ...attrs } = props;
    return (
      <button
        type="button"
        role="switch"
        data-slot="switch"
        aria-checked={checked.read() ? "true" : "false"}
        data-state={checked.read() ? "checked" : "unchecked"}
        disabled={disabled ? true : undefined}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          if (!disabled) toggle();
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const Indicator = (props: SwitchIndicatorProps): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return (
      <span
        data-slot="switch-thumb"
        data-state={checked.read() ? "checked" : "unchecked"}
        class={cls}
        {...attrs}
      />
    );
  };

  return { Root, Indicator };
}

/**
 * Creates the toggle-group part set: `Root` + `Item`. The closure owns the
 * group state — single mode keeps one value active (activating the active
 * value deselects it); `multiple` toggles membership independently. Each
 * `Item` defaults its pressed state and click action from the group;
 * `pressed`/`onSelect` props override for manual composition. `Root` arms
 * arrow-key roving over the items and disposes it on unmount. Call in
 * component scope so the state signals dispose with the component.
 *
 * ```tsx
 * const Group = toggleGroup({ value, onValueChange, multiple });
 *
 * <Group.Root>
 *   <Group.Item value="bold">Bold</Group.Item>
 * </Group.Root>
 * ```
 * @param options `multiple` mode, controlled `value`/`values`, uncontrolled `defaultValue`/`defaultValues` seeds, and `onValueChange`; omitted control keeps state internal.
 * @returns The part set, composed as `Group.Root`-style members.
 */
export function toggleGroup(options: ToggleGroupOptions = {}): ToggleGroupComponents {
  const multiple = options.multiple === true;
  const onValueChange = options.onValueChange;
  const internalSingle = signal(options.defaultValue ?? "");
  const internalMulti = signal<Set<string>>(new Set(options.defaultValues));
  const wirings: (() => void)[] = [];

  const pressedOf = (itemValue: string): boolean =>
    multiple
      ? (options.values !== undefined ? options.values() : [...internalMulti()]).includes(itemValue)
      : (options.value !== undefined ? options.value() : internalSingle()) === itemValue;

  const selectValue = (itemValue: string): void => {
    if (multiple) {
      const current = options.values !== undefined ? options.values() : [...internalMulti()];
      const next = flipMulti(current, itemValue);
      if (options.values === undefined) internalMulti(new Set(next));
      onValueChange?.(next);
      return;
    }
    const current = options.value !== undefined ? options.value() : internalSingle();
    const next = excludeSingle(current, itemValue);
    if (options.value === undefined) internalSingle(next);
    onValueChange?.(next);
  };

  const Root = (props: ToggleGroupRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div
        role="group"
        data-slot="toggle-group"
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          wirings.push(
            rovingTabIndex(node, {
              selector: "[data-slot='toggle-group-item']:not(:disabled)",
            }),
          );
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

  const Item = (props: ToggleGroupItemProps): JSX.Element => {
    const {
      value: itemValue,
      pressed,
      onSelect,
      disabled,
      children,
      class: cls,
      "on:click": userClick,
      ...attrs
    } = props;
    const keyed = itemValue ?? "";
    const isPressed = (): boolean =>
      pressed !== undefined ? (isFunction(pressed) ? pressed() : pressed) : pressedOf(keyed);

    return (
      <button
        type="button"
        data-slot="toggle-group-item"
        value={itemValue}
        aria-pressed={isPressed() ? "true" : "false"}
        data-state={isPressed() ? "on" : "off"}
        disabled={disabled ? true : undefined}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          if (onSelect !== undefined) {
            onSelect();
            return;
          }
          if (!disabled) selectValue(keyed);
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  return { Root, Item };
}

/**
 * Creates the radio-group part set: `Root` + `Item` + `Indicator`. The
 * closure owns the selection — controlled through a `value` accessor when
 * passed, an internal signal when omitted; radios never unset, so activating
 * the active value is a no-op. Each `Item` defaults its checked state and
 * click action from the group (`checked`/`onSelect` override for manual
 * composition) and `Indicator` renders the selection dot inside it. `Root`
 * arms arrow-key roving (arrows move and select), threads the selection onto
 * the tabindex walk at mount, and disposes on unmount. Call in component
 * scope so the state signal disposes with the component.
 *
 * ```tsx
 * const Radio = radioGroup({ value, onValueChange });
 *
 * <Radio.Root>
 *   <Radio.Item value="a">
 *     <Radio.Indicator value="a" />
 *   </Radio.Item>
 * </Radio.Root>
 * ```
 * @param options controlled `value`, `orientation` (renders `aria-orientation` and scopes the arrow axis), `name`, and `onValueChange`; an omitted `value` keeps state internal.
 * @returns The part set, composed as `Radio.Root`-style members.
 */
export function radioGroup(options: RadioGroupOptions = {}): RadioGroupComponents {
  const value = options.value;
  const onValueChange = options.onValueChange;
  const internal = signal("");
  const current = (): string => (value !== undefined ? value() : internal());
  let group: HTMLElement | null = null;
  const wirings: (() => void)[] = [];

  const checkedOf = (itemValue: string): boolean => current() === itemValue;

  const roveToSelection = (): void => {
    if (!group) return;
    const items = group.querySelectorAll<HTMLElement>("[role='radio']");
    let matched = -1;
    let i = 0;
    const len = items.length;
    while (i < len) {
      if (items[i]!.getAttribute("value") === current()) {
        matched = i;
        break;
      }
      i++;
    }
    if (matched === -1) matched = 0;
    let w = 0;
    while (w < len) {
      items[w]!.tabIndex = w === matched ? 0 : -1;
      w++;
    }
  };

  const selectValue = (selected: string): void => {
    if (current() === selected) return;
    if (value === undefined) internal(selected);
    onValueChange?.(selected);
    roveToSelection();
  };

  const Root = (props: RadioGroupRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div
        role="radiogroup"
        data-slot="radio-group"
        aria-orientation={options.orientation}
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          group = node;
          wirings.push(
            rovingTabIndex(node, {
              orientation: options.orientation,
              selector: "[role='radio']:not(:disabled)",
            }),
          );
          const onFocusIn = (event: Event) => {
            const radioEl = event.target as HTMLElement;
            if (radioEl.getAttribute("role") !== "radio") return;
            const radioValue = radioEl.getAttribute("value") ?? "";
            if (radioEl.hasAttribute("disabled")) return;
            selectValue(radioValue);
          };
          node.addEventListener("focusin", onFocusIn);
          wirings.push(() => node.removeEventListener("focusin", onFocusIn));
          roveToSelection();
        }}
        hook:beforeDestroy={() => {
          while (wirings.length) wirings.pop()!();
          group = null;
        }}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  const Item = (props: RadioGroupItemProps): JSX.Element => {
    const {
      value: itemValue,
      name,
      checked,
      onSelect,
      disabled,
      children,
      class: cls,
      "on:click": userClick,
      ...attrs
    } = props;
    const keyed = itemValue ?? "";
    const isChecked = (): boolean =>
      checked !== undefined ? (isFunction(checked) ? checked() : checked) : checkedOf(keyed);

    return (
      <button
        type="button"
        role="radio"
        data-slot="radio-group-item"
        value={itemValue}
        name={name}
        aria-checked={isChecked() ? "true" : "false"}
        data-state={isChecked() ? "checked" : "unchecked"}
        disabled={disabled ? true : undefined}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          if (onSelect !== undefined) {
            onSelect();
            return;
          }
          if (!disabled) selectValue(keyed);
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const Indicator = (props: RadioGroupIndicatorProps): JSX.Element => {
    const { value: itemValue, checked, children, class: cls, ...attrs } = props;
    const keyed = itemValue ?? "";
    const isChecked = (): boolean =>
      checked !== undefined ? (isFunction(checked) ? checked() : checked) : checkedOf(keyed);
    return (
      <span data-slot="radio-group-indicator" class={cls} {...attrs}>
        {() => (isChecked() ? (children ?? circleIcon()) : null)}
      </span>
    );
  };

  return { Root, Item, Indicator };
}
