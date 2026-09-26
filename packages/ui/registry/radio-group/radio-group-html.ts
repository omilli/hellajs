import { html, rovingTabIndex } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const icon: string;
declare const indicator: string;
declare const item: string;
declare const row: string;
// @hella:end

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
      // @hella:compose
      [icon]
      // @hella:end
    }"
  ><circle cx="12" cy="12" r="10" /></svg>` as HellaNode;

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
        // @hella:compose
        [item, props.class]
        // @hella:end
      }"
      e:click="${() => props.onSelect?.()}"
    ><span
        data-slot="radio-group-indicator"
        class="${
          // @hella:compose
          [indicator]
          // @hella:end
        }"
      >${() => (checked() ? circleIcon() : null)}</span></button>
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
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
      hook:afterMount="${(node: Element) => {
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
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
        group = null;
      }}"
    >
      ${props.items.map((entry) => html`<label
          data-slot="radio-group-row"
          class="${
            // @hella:compose
            [row]
            // @hella:end
          }"
        >${RadioGroupItem({
          value: entry.value,
          name: props.name,
          checked: () => current() === entry.value,
          onSelect: () => {
            if (entry.disabled) return;
            select(entry.value);
          },
          disabled: entry.disabled,
        })}<span>${entry.label}</span></label>`)}
    </div>
  ` as HellaNode;
}
