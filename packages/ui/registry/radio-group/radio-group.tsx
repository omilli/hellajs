import { signal } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import { rovingTabIndex } from "@hellajs/headless";
import type { RadioGroupProps, RadioGroupItemProps } from "./radio-group-types.js";

// @hella:styles
declare const base: string;
declare const icon: string;
declare const indicator: string;
declare const item: string;
declare const row: string;
// @hella:end

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
    class={
      // @hella:compose
      [icon]
      // @hella:end
    }
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export function RadioGroupItem({
  value,
  checked,
  onSelect,
  disabled,
  name,
  "on:click": userClick,
  class: cls,
  ...attrs
}: RadioGroupItemProps): JSX.Element {
  const isChecked = (): boolean => (typeof checked === "function" ? checked() : (checked ?? false));

  return (
    <button
      type="button"
      role="radio"
      data-slot="radio-group-item"
      value={value}
      name={name}
      aria-checked={isChecked() ? "true" : "false"}
      data-state={isChecked() ? "checked" : "unchecked"}
      disabled={disabled ? true : undefined}
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
      on:click={function (e) {
        userClick?.call(this, e);
        onSelect?.();
      }}
      {...attrs}
    >
      <span
        data-slot="radio-group-indicator"
        class={
          // @hella:compose
          [indicator]
          // @hella:end
        }
      >
        {() => (isChecked() ? circleIcon() : null)}
      </span>
    </button>
  );
}

export function RadioGroup({
  items,
  keyBy,
  value,
  onValueChange,
  orientation,
  name,
  class: cls,
  ...attrs
}: RadioGroupProps): JSX.Element {
  const internal = signal("");
  const current = (): string => (value !== undefined ? value() : internal());
  const wirings: (() => void)[] = [];
  let group: HTMLElement | null = null;

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

  const select = (selected: string): void => {
    if (current() === selected) return;
    if (value === undefined) internal(selected);
    onValueChange?.(selected);
    roveToSelection();
  };

  return (
    <div
      role="radiogroup"
      data-slot="radio-group"
      aria-orientation={orientation}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        group = node;
        wirings.push(
          rovingTabIndex(node, {
            orientation,
            selector: "[role='radio']:not(:disabled)",
          }),
        );
        const onFocusIn = (event: Event) => {
          const radioEl = event.target as HTMLElement;
          if (radioEl.getAttribute("role") !== "radio") return;
          const value = radioEl.getAttribute("value") ?? "";
          if (radioEl.hasAttribute("disabled")) return;
          select(value);
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
      <ForEach
        each={items}
        use={(entry) => (
          <label
            key={keyBy ? entry.value : undefined}
            data-slot="radio-group-row"
            class={
              // @hella:compose
              [row]
              // @hella:end
            }
          >
            <RadioGroupItem
              value={entry.value}
              name={name as string | undefined}
              checked={() => current() === entry.value}
              onSelect={() => {
                if (entry.disabled) return;
                select(entry.value);
              }}
              disabled={entry.disabled}
            />
            <span>{entry.label}</span>
          </label>
        )}
      />
    </div>
  );
}
