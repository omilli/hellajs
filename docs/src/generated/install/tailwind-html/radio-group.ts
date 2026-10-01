import { html, rovingTabIndex } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

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
const circleIcon = (): HellaNode =>
  html`<svg
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
    class="${
      cn("absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary")
    }"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>` as HellaNode;

export function RadioGroupItem(props: RadioGroupItemProps): HellaNode {
  const checked = (): boolean =>
    typeof props.checked === "function" ? props.checked() : props.checked ?? false;

  return html`
    <button
      type="button"
      role="radio"
      data-slot="radio-group-item"
      value="${props.value}"
      name="${props.name}"
      aria-checked="${() => (checked() ? "true" : "false")}"
      data-state="${() => (checked() ? "checked" : "unchecked")}"
      disabled="${props.disabled ? true : undefined}"
      class="${
        cn("aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40", props.class)
      }"
      e:click="${() => props.onSelect?.()}"
    >
      <span
        data-slot="radio-group-indicator"
        class="${
          cn("relative flex items-center justify-center")
        }"
      >
        ${() => (checked() ? circleIcon() : null)}
      </span>
    </button>
  ` as HellaNode;
}

export default function RadioGroup(props: RadioGroupProps): HellaNode {
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

  return html`
    <div
      role="radiogroup"
      data-slot="radio-group"
      aria-orientation="${props.orientation}"
      class="${
        cn("grid gap-3", props.class)
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        group = node;
        wirings.push(rovingTabIndex(node, {
          orientation: props.orientation,
          selector: "[role='radio']:not(:disabled)",
        }));
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
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
        group = null;
      }}"
    >
      ${props.items.map((entry) => html`
        <label
          data-slot="radio-group-row"
          class="${
            cn("flex items-center gap-2")
          }"
        >
          ${RadioGroupItem({
            value: entry.value,
            name: props.name,
            checked: () => current() === entry.value,
            onSelect: () => {
              if (entry.disabled) return;
              select(entry.value);
            },
            disabled: entry.disabled,
          })}
          <span>
            ${entry.label}
          </span>
        </label>
      `)}
    </div>
  ` as HellaNode;
}
