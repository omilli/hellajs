import { effect, signal } from "@hellajs/core";
import { anchorPosition, ForEach, html, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode, Placement } from "@hellajs/dom";
import type { AnchorSide, AnchorAlign, SelectEntry, SelectTriggerProps, SelectValueProps, SelectContentProps, SelectPartProps, SelectItemProps, SelectLabelProps, SelectScrollButtonProps, SelectProps } from "./select-types.js";

// @hella:styles
declare const base: string;
declare const chevron: string;
declare const content: string;
declare const icon: string;
declare const indicator: string;
declare const item: string;
declare const label: string;
declare const scrollButton: string;
declare const separator: string;
declare const viewport: string;
// @hella:end

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

/** Open/close state shared by the composed root and manual compositions: controlled override, exit-holding `visible` gate. */
function selectOpenState() {
  const internal = signal(false);
  const isOpen = (): boolean => internal();
  const setOpen = (next: boolean): void => {
    internal(next);
  };
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading open() in the template
  // would flash the subtree away one evaluation early).
  const visible = signal(false);
  let wasOpen = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  const finishExit = (): void => {
    if (fallback !== undefined) {
      clearTimeout(fallback);
      fallback = undefined;
    }
    visible(false);
  };
  // Flip to open renders immediately; flip to closed starts the exit - the
  // content stays mounted under data-state="closed" until its animationend
  // (or the copied duration budget) unmounts it.
  effect(() => {
    if (isOpen()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 250);
    }
  });
  return { isOpen, setOpen, state: (): "open" | "closed" => (isOpen() ? "open" : "closed"), visible, finishExit };
}

/** The listbox's selectable options in DOM order, disabled entries excluded (roving, typeahead, and focus-first share this). */
const optionItems = (node: ParentNode): HTMLElement[] => {
  const found = node.querySelectorAll("[role='option']");
  const items: HTMLElement[] = [];
  let i = 0;
  while (i < found.length) {
    const el = found[i] as HTMLElement;
    if (!el.hasAttribute("data-disabled")) items.push(el);
    i++;
  }
  return items;
};

/** The same options shaped for `menuTypeahead`'s text matching. */
const optionEntries = (node: ParentNode): { node: HTMLElement; text: string }[] => {
  const items = optionItems(node);
  const entries: { node: HTMLElement; text: string }[] = [];
  let i = 0;
  while (i < items.length) {
    entries.push({ node: items[i]!, text: items[i]!.textContent ?? "" });
    i++;
  }
  return entries;
};

/** Moves the highlight ring to one option: focus follows (the ref styles the ring through `focus:`), `data-highlighted` mirrors it for the combobox-shared vocabulary. */
const highlightOption = (node: ParentNode, target: HTMLElement): void => {
  const previous = node.querySelectorAll("[data-highlighted]");
  let i = 0;
  while (i < previous.length) {
    (previous[i] as HTMLElement).removeAttribute("data-highlighted");
    i++;
  }
  target.setAttribute("data-highlighted", "true");
  target.focus();
};

/** The listbox keyboard model: roving arrows with wrap, Home/End, Enter/Space activation, Tab close. */
const listKeyDown = (node: HTMLElement, onClose?: () => void) => (event: Event): void => {
  const e = event as KeyboardEvent;
  const items = optionItems(node);
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (e.key === "Tab") {
    onClose?.();
    return;
  }
  if (e.key === "Enter" || e.key === " ") {
    if (current === -1) return;
    e.preventDefault();
    items[current]!.dispatchEvent(new Event("click", { bubbles: true }));
    return;
  }
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
  if (items.length === 0) return;
  e.preventDefault();
  let target: number;
  if (e.key === "Home") target = 0;
  else if (e.key === "End") target = items.length - 1;
  else if (current === -1) target = e.key === "ArrowDown" ? 0 : items.length - 1;
  else target = (current + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
  highlightOption(node, items[target]!);
};

/** The check icon (refs/icons/check.svg), created per call so reactive swaps never share nodes between clones. */
const checkIcon = (): HellaNode =>
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
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>` as HellaNode;

/** The chevron-down icon (refs/icons/chevron-down.svg), created per call so reactive swaps never share nodes between clones. */
const chevronDownIcon = (): HellaNode =>
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
      [chevron]
      // @hella:end
    }"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>` as HellaNode;

/** The chevron-up icon (refs/icons/chevron-up.svg), created per call so reactive swaps never share nodes between clones. */
const chevronUpIcon = (): HellaNode =>
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
  >
    <path d="m18 15-6-6-6 6" />
  </svg>` as HellaNode;

/** The clear icon (refs/icons/x.svg), created per call so reactive swaps never share nodes between clones. */
const clearIcon = (): HellaNode =>
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
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>` as HellaNode;

/** The manual trigger button; the composed Select renders the same shape wired to state and aria. */
export function SelectTrigger({ id, size, state, onOpen, clearable, onClear, hasValue, disabled, children, class: cls, ...attrs }: SelectTriggerProps): HellaNode {
  const stateOf = (): "open" | "closed" => state?.() ?? "closed";
  return html`
    <button
      type="button"
      data-slot="select-trigger"
      id="${id}"
      data-size="${size ?? "default"}"
      data-state="${stateOf}"
      aria-haspopup="listbox"
      aria-expanded="${() => (stateOf() === "open" ? "true" : "false")}"
      disabled="${disabled}"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      on:click="${() => {
        if (disabled) return;
        onOpen?.();
      }}"
      on:keydown="${(e: Event) => {
        const key = (e as KeyboardEvent).key;
        if (disabled || (key !== "ArrowDown" && key !== "ArrowUp")) return;
        e.preventDefault();
        onOpen?.();
      }}"
      ...${attrs}
    >
      ${() => children}${() => (clearable && hasValue?.() ? html`<span
        data-slot="select-clear"
        role="button"
        aria-label="Clear"
        on:click="${(e: Event) => {
          e.stopPropagation();
          onClear?.();
        }}"
      >${clearIcon()}</span>` as HellaChild : null)}${chevronDownIcon()}
    </button>
  ` as HellaNode;
}

/** Renders the chosen label; shows the placeholder (with `data-placeholder`) while empty. */
export function SelectValue({ placeholder, value, class: cls, ...attrs }: SelectValueProps): HellaNode {
  const current = (): HellaChildren | undefined =>
    typeof value === "function" ? (value as () => HellaChildren | undefined)() : value;
  return html`
    <span
      data-slot="select-value"
      data-placeholder="${() => {
        const v = current();
        return v === undefined || v === "" ? "" : undefined;
      }}"
      class="${
        // @hella:compose
        [cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => {
      const v = current();
      return v === undefined || v === "" ? placeholder : v;
    }}</span>
  ` as HellaNode;
}

export function SelectContent({ state, id, side: sideProp, align: alignProp, sideOffset, anchor, onDismiss, onExited, onClose, children, class: cls, ...attrs }: SelectContentProps): HellaNode {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "start";
  const stateOf = (): "open" | "closed" => state?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  // The exit runs unwired: flipping to "closed" tears the layer down
  // immediately; reopening remounts fresh wirings with the content.
  effect(() => {
    if (stateOf() === "closed") disposeWirings();
  });

  return html`
    <div
      role="listbox"
      tabindex="-1"
      id="${id}"
      data-slot="select-content"
      data-state="${stateOf}"
      data-side="${side}"
      data-align="${align}"
      class="${
        // @hella:compose
        [content, cls]
        // @hella:end
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: sideOffset ?? 6, matchAnchorWidth: true }));
        if (onDismiss) {
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
        }
        wirings.push(menuTypeahead(node, () => optionEntries(node), (entry) => highlightOption(node, entry.node)));
        const onKey = listKeyDown(node, onClose);
        node.addEventListener("keydown", onKey);
        wirings.push(() => node.removeEventListener("keydown", onKey));
        // Focus lands on the selected option (first option otherwise) and the
        // selected option scrolls to the visible edge of the listbox.
        const items = optionItems(node);
        const selected = node.querySelector("[aria-selected='true']");
        const target = (selected instanceof HTMLElement && !selected.hasAttribute("data-disabled") ? selected : items[0]) ?? node;
        highlightOption(node, target);
        if (target !== node) target.scrollIntoView?.({ block: "nearest" });
        // Scroll buttons repeat-scroll the listbox while hovered and hide at
        // their scroll edges (the ref keeps both mounted, Radix style).
        const up = node.querySelector("[data-slot='select-scroll-up-button']");
        const down = node.querySelector("[data-slot='select-scroll-down-button']");
        const syncEdges = (): void => {
          if (up instanceof HTMLElement) up.style.visibility = node.scrollTop <= 0 ? "hidden" : "visible";
          if (down instanceof HTMLElement) down.style.visibility = node.scrollTop + node.clientHeight >= node.scrollHeight ? "hidden" : "visible";
        };
        const wireStep = (el: Element | null, delta: number): void => {
          if (!(el instanceof HTMLElement)) return;
          let timer: ReturnType<typeof setInterval> | null = null;
          const start = (): void => {
            if (timer !== null) return;
            node.scrollTop = node.scrollTop + delta;
            timer = setInterval(() => {
              node.scrollTop = node.scrollTop + delta;
            }, 50);
          };
          const stop = (): void => {
            if (timer === null) return;
            clearInterval(timer);
            timer = null;
          };
          el.addEventListener("pointerenter", start);
          el.addEventListener("pointerleave", stop);
          teardown.push(() => {
            el.removeEventListener("pointerenter", start);
            el.removeEventListener("pointerleave", stop);
            stop();
          });
        };
        wireStep(up, -32);
        wireStep(down, 32);
        node.addEventListener("scroll", syncEdges);
        teardown.push(() => node.removeEventListener("scroll", syncEdges));
        syncEdges();
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (stateOf() === "closed") onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
      ...${attrs}
    >
      <div
        data-slot="select-scroll-up-button"
        class="${
          // @hella:compose
          [scrollButton]
          // @hella:end
        }"
      >
        ${chevronUpIcon()}
      </div>
      <div
        data-slot="select-viewport"
        class="${
          // @hella:compose
          [viewport]
          // @hella:end
        }"
      >
        ${() => children}
      </div>
      <div
        data-slot="select-scroll-down-button"
        class="${
          // @hella:compose
          [scrollButton]
          // @hella:end
        }"
      >
        ${chevronDownIcon()}
      </div>
    </div>
  ` as HellaNode;
}

export function SelectGroup({ children, class: cls, ...attrs }: SelectPartProps): HellaNode {
  return html`
    <div
      data-slot="select-group"
      class="${
        // @hella:compose
        [cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function SelectItem({ value, label: labelSlot, selected: selectedProp, onselect, disabled, class: cls, ...attrs }: SelectItemProps): HellaNode {
  const selected = (): boolean =>
    typeof selectedProp === "function" ? selectedProp() : selectedProp ?? false;
  return html`
    <div
      role="option"
      tabindex="-1"
      data-slot="select-item"
      data-value="${value}"
      aria-selected="${() => (selected() ? "true" : "false")}"
      data-state="${() => (selected() ? "checked" : "unchecked")}"
      data-disabled="${disabled ? "true" : undefined}"
      aria-disabled="${disabled ? "true" : undefined}"
      class="${
        // @hella:compose
        [item, cls]
        // @hella:end
      }"
      on:click="${() => {
        if (disabled) return;
        onselect?.();
      }}"
      ...${attrs}
    >
      <span
        data-slot="select-item-indicator"
        class="${
          // @hella:compose
          [indicator]
          // @hella:end
        }"
      >
        ${() => (selected() ? checkIcon() : null)}
      </span>
      ${() => labelSlot}
    </div>
  ` as HellaNode;
}

export function SelectLabel({ children, class: cls, ...attrs }: SelectLabelProps): HellaNode {
  return html`
    <div
      data-slot="select-label"
      class="${
        // @hella:compose
        [label, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function SelectSeparator({ class: cls, ...attrs }: SelectPartProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="select-separator"
      class="${
        // @hella:compose
        [separator, cls]
        // @hella:end
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

export function SelectScrollUpButton({ children, class: cls, ...attrs }: SelectScrollButtonProps): HellaNode {
  return html`
    <div
      data-slot="select-scroll-up-button"
      class="${
        // @hella:compose
        [scrollButton, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children ?? chevronUpIcon()}</div>
  ` as HellaNode;
}

export function SelectScrollDownButton({ children, class: cls, ...attrs }: SelectScrollButtonProps): HellaNode {
  return html`
    <div
      data-slot="select-scroll-down-button"
      class="${
        // @hella:compose
        [scrollButton, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children ?? chevronDownIcon()}</div>
  ` as HellaNode;
}

let selectCount = 0;

export function Select({ items, keyBy, value, onValueChange, placeholder, size, clearable, class: cls, ...attrs }: SelectProps): HellaNode {
  const s = selectOpenState();
  const contentId = `hella-select-content-${++selectCount}`;
  const internal = signal("");
  const current = (): string => (value !== undefined ? value() : internal());
  const select = (next: string): void => {
    if (value === undefined) internal(next);
    onValueChange?.(next);
  };
  const resolveItems = (): SelectEntry[] =>
    typeof items === "function" ? (items as () => SelectEntry[])() : items ?? [];
  const currentLabel = (): HellaChildren | undefined =>
    resolveItems().find((entry) => entry.value === current())?.label;
  let triggerNode: HTMLElement | undefined;

  // Focus returns to the trigger when the listbox closes (one open→closed
  // flip only, so the initial closed state never steals focus at mount).
  let wasOpenForFocus = false;
  effect(() => {
    if (s.isOpen()) wasOpenForFocus = true;
    else if (wasOpenForFocus) {
      wasOpenForFocus = false;
      triggerNode?.focus();
    }
  });

  return html`
    <button
      type="button"
      data-slot="select-trigger"
      data-size="${size ?? "default"}"
      data-state="${() => s.state()}"
      aria-haspopup="listbox"
      aria-expanded="${() => (s.isOpen() ? "true" : "false")}"
      aria-controls="${contentId}"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      on:click="${() => s.setOpen(!s.isOpen())}"
      on:keydown="${(e: Event) => {
        const key = (e as KeyboardEvent).key;
        if (key !== "ArrowDown" && key !== "ArrowUp") return;
        e.preventDefault();
        s.setOpen(true);
      }}"
      hook:afterMount="${(node: Element) => {
        if (node instanceof HTMLElement) triggerNode = node;
      }}"
      ...${attrs}
    >
      ${SelectValue({ placeholder, value: () => currentLabel() }) as HellaChild}${() => (clearable && current() !== "" ? html`<span
        data-slot="select-clear"
        role="button"
        aria-label="Clear"
        on:click="${(e: Event) => {
          e.stopPropagation();
          select("");
        }}"
      >${clearIcon()}</span>` as HellaChild : null)}${chevronDownIcon()}${() => s.visible() && Portal({
        to: "body",
        children: [
          SelectContent({
            state: s.state,
            id: contentId,
            anchor: () => triggerNode,
            onDismiss: () => s.setOpen(false),
            onExited: s.finishExit,
            onClose: () => s.setOpen(false),
            children: ForEach({
              each: resolveItems,
              use: (entry) =>
                SelectItem({
                  key: keyBy ? entry.value : undefined,
                  value: entry.value,
                  label: entry.label,
                  disabled: entry.disabled,
                  selected: () => current() === entry.value,
                  onselect: () => {
                    select(entry.value);
                    s.setOpen(false);
                  },
                }) as HellaChild,
            }),
          }) as HellaChild,
        ],
    })}
    </button>
  ` as HellaNode;
}
