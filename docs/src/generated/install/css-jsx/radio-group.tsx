import { signal } from "@hellajs/core";
import { rovingTabIndex } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style({
  display: "grid",
  gap: "0.75rem",
}, { label: "hella-radio-group", layer: "hella" });

const item = style({
  aspectRatio: "1 / 1",
  border: "1px solid var(--input)",
  borderRadius: "9999px",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  boxSizing: "border-box",
  color: "var(--primary)",
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)": {
    backgroundColor: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-radio-group-item", layer: "hella" });

const indicator = style({
  alignItems: "center",
  display: "flex",
  justifyContent: "center",
  position: "relative",
}, { label: "hella-radio-group-indicator", layer: "hella" });

const icon = style({
  fill: "var(--primary)",
  height: "0.5rem",
  left: "50%",
  position: "absolute",
  top: "50%",
  translate: "-50% -50%",
  width: "0.5rem",
}, { label: "hella-radio-group-icon", layer: "hella" });

const row = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
}, { label: "hella-radio-group-row", layer: "hella" });

interface RadioGroupItem {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  items: RadioGroupItem[];
  /** Controlled selected value. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  /** Threaded onto every item button. Hidden native inputs for form submission are not rendered (deferred). */
  name?: string;
  orientation?: "horizontal" | "vertical";
  class?: string;
}

interface RadioGroupItemProps {
  value: string;
  /** Checked state. A boolean reads statically; an accessor keeps the manual part reactive. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  disabled?: boolean;
  name?: string;
  class?: string;
}

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
      [icon]
    }
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export function RadioGroupItem(props: RadioGroupItemProps): JSX.Element {
  const checked = (): boolean =>
    typeof props.checked === "function" ? props.checked() : props.checked ?? false;

  return (
    <button
      type="button"
      role="radio"
      data-slot="radio-group-item"
      value={props.value}
      name={props.name}
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      disabled={props.disabled ? true : undefined}
      class={
        [item, props.class]
      }
      on:click={() => props.onSelect?.()}
    >
      <span
        data-slot="radio-group-indicator"
        class={
          [indicator]
        }
      >
        {() => (checked() ? circleIcon() : null)}
      </span>
    </button>
  );
}

export default function RadioGroup(props: RadioGroupProps): JSX.Element {
  const internal = signal("");
  const current = (): string => (props.value !== undefined ? props.value() : internal());
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

  const select = (value: string): void => {
    if (current() === value) return;
    if (props.value === undefined) internal(value);
    props.onValueChange?.(value);
    roveToSelection();
  };

  return (
    <div
      role="radiogroup"
      data-slot="radio-group"
      aria-orientation={props.orientation}
      class={
        [base, props.class]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        group = node;
        wirings.push(rovingTabIndex(node, {
          orientation: props.orientation,
          selector: "[role='radio']:not(:disabled)",
        }));
        const onFocusIn = (event: Event) => {
          const item = event.target as HTMLElement;
          if (item.getAttribute("role") !== "radio") return;
          const value = item.getAttribute("value") ?? "";
          if (item.hasAttribute("disabled")) return;
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
    >
      {props.items.map((entry) => (
        <label
          data-slot="radio-group-row"
          class={
            [row]
          }
        >
          <RadioGroupItem
            value={entry.value}
            name={props.name}
            checked={() => current() === entry.value}
            onSelect={() => {
              if (entry.disabled) return;
              select(entry.value);
            }}
            disabled={entry.disabled}
          />
          <span>{entry.label}</span>
        </label>
      ))}
    </div>
  );
}
