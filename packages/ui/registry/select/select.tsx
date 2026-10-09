import { effect, signal } from "@hellajs/core";
import { anchorPosition, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, Placement } from "@hellajs/dom";

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

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

interface SelectEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

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
    class={
      // @hella:compose
      [icon]
      // @hella:end
    }
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** The chevron-down icon (refs/icons/chevron-down.svg), created per call so reactive swaps never share nodes between clones. */
const chevronDownIcon = (): JSX.Element => (
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
      [chevron]
      // @hella:end
    }
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** The chevron-up icon (refs/icons/chevron-up.svg), created per call so reactive swaps never share nodes between clones. */
const chevronUpIcon = (): JSX.Element => (
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
    <path d="m18 15-6-6-6 6" />
  </svg>
);

/** The clear icon (refs/icons/x.svg), created per call so reactive swaps never share nodes between clones. */
const clearIcon = (): JSX.Element => (
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
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

interface SelectTriggerProps extends HTMLAttributes<"button"> {
  size?: "sm" | "default";
  /** Resolves the open state for `data-state`/`aria-expanded`; the composed Select wires it. */
  state?: () => "open" | "closed";
  /** Called on click and on ArrowDown/ArrowUp to request an open toggle. */
  onOpen?: () => void;
  /** Renders an inline clear affordance while `hasValue` resolves truthy. */
  clearable?: boolean;
  /** Called when the clear affordance activates; the composed Select resets the value. */
  onClear?: () => void;
  /** Resolves whether a value is currently selected (drives the clear affordance). */
  hasValue?: () => boolean;
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; the composed Select renders the same shape wired to state and aria. */
export function SelectTrigger({ id, size, state, onOpen, clearable, onClear, hasValue, disabled, children, class: cls, ...attrs }: SelectTriggerProps): JSX.Element {
  const stateOf = (): "open" | "closed" => state?.() ?? "closed";
  return (
    <button
      type="button"
      data-slot="select-trigger"
      id={id}
      data-size={size ?? "default"}
      data-state={stateOf()}
      aria-haspopup="listbox"
      aria-expanded={stateOf() === "open" ? "true" : "false"}
      disabled={disabled}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      on:click={() => {
        if (disabled) return;
        onOpen?.();
      }}
      on:keydown={(e) => {
        const key = (e as KeyboardEvent).key;
        if (disabled || (key !== "ArrowDown" && key !== "ArrowUp")) return;
        e.preventDefault();
        onOpen?.();
      }}
      {...attrs}
    >
      {children}
      {() => (clearable && hasValue?.() ? (
        <span
          data-slot="select-clear"
          role="button"
          aria-label="Clear"
          on:click={(e) => {
            e.stopPropagation();
            onClear?.();
          }}
        >
          {clearIcon()}
        </span>
      ) : null)}
      {chevronDownIcon()}
    </button>
  );
}

interface SelectValueProps extends HTMLAttributes<"span"> {
  placeholder?: string;
  /** The chosen label. A string reads statically; an accessor keeps it reactive (the composed Select threads one). Manual wiring passes the current label. */
  value?: HellaChildren | (() => HellaChildren | undefined);
  class?: string;
}

/** Renders the chosen label; shows the placeholder (with `data-placeholder`) while empty. */
export function SelectValue({ placeholder, value, class: cls, ...attrs }: SelectValueProps): JSX.Element {
  const current = (): HellaChildren | undefined =>
    typeof value === "function" ? (value as () => HellaChildren | undefined)() : value;
  return (
    <span
      data-slot="select-value"
      data-placeholder={() => {
        const v = current();
        return v === undefined || v === "" ? "" : undefined;
      }}
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {() => {
        const v = current();
        return v === undefined || v === "" ? placeholder : v;
      }}
    </span>
  );
}

interface SelectContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 6. */
  sideOffset?: number;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  /** Called by the listbox keyboard model to close (Tab); the composed Select wires it. */
  onClose?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function SelectContent({ state, id, side: sideProp, align: alignProp, sideOffset, anchor, onDismiss, onExited, onClose, children, class: cls, ...attrs }: SelectContentProps): JSX.Element {
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

  return (
    <div
      role="listbox"
      tabindex="-1"
      id={id}
      data-slot="select-content"
      data-state={stateOf()}
      data-side={side}
      data-align={align}
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
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
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
      {...attrs}
    >
      <div
        data-slot="select-scroll-up-button"
        class={
          // @hella:compose
          [scrollButton]
          // @hella:end
        }
      >
        {chevronUpIcon()}
      </div>
      <div
        data-slot="select-viewport"
        class={
          // @hella:compose
          [viewport]
          // @hella:end
        }
      >
        {children}
      </div>
      <div
        data-slot="select-scroll-down-button"
        class={
          // @hella:compose
          [scrollButton]
          // @hella:end
        }
      >
        {chevronDownIcon()}
      </div>
    </div>
  );
}

interface SelectPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function SelectGroup({ children, class: cls, ...attrs }: SelectPartProps): JSX.Element {
  return (
    <div
      data-slot="select-group"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface SelectItemProps extends HTMLAttributes<"div"> {
  value?: string;
  label?: HellaChildren;
  /** Selected state. A boolean reads statically; an accessor keeps the item reactive against its owning select. */
  selected?: boolean | (() => boolean);
  /** Called on click when the item is enabled; the composed Select commits the value. */
  onselect?: () => void;
  class?: string;
}

export function SelectItem({ value, label: labelSlot, selected: selectedProp, onselect, disabled, class: cls, ...attrs }: SelectItemProps): JSX.Element {
  const selected = (): boolean =>
    typeof selectedProp === "function" ? selectedProp() : selectedProp ?? false;
  return (
    <div
      role="option"
      tabindex="-1"
      data-slot="select-item"
      data-value={value}
      aria-selected={selected() ? "true" : "false"}
      data-state={selected() ? "checked" : "unchecked"}
      data-disabled={disabled ? "true" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
      on:click={() => {
        if (disabled) return;
        onselect?.();
      }}
      {...attrs}
    >
      <span
        data-slot="select-item-indicator"
        class={
          // @hella:compose
          [indicator]
          // @hella:end
        }
      >
        {() => (selected() ? checkIcon() : null)}
      </span>
      {() => labelSlot}
    </div>
  );
}

interface SelectLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function SelectLabel({ children, class: cls, ...attrs }: SelectLabelProps): JSX.Element {
  return (
    <div
      data-slot="select-label"
      class={
        // @hella:compose
        [label, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function SelectSeparator({ class: cls, ...attrs }: SelectPartProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="select-separator"
      class={
        // @hella:compose
        [separator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

interface SelectScrollButtonProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function SelectScrollUpButton({ children, class: cls, ...attrs }: SelectScrollButtonProps): JSX.Element {
  return (
    <div
      data-slot="select-scroll-up-button"
      class={
        // @hella:compose
        [scrollButton, cls]
        // @hella:end
      }
      {...attrs}
    >
      {() => children ?? chevronUpIcon()}
    </div>
  );
}

export function SelectScrollDownButton({ children, class: cls, ...attrs }: SelectScrollButtonProps): JSX.Element {
  return (
    <div
      data-slot="select-scroll-down-button"
      class={
        // @hella:compose
        [scrollButton, cls]
        // @hella:end
      }
      {...attrs}
    >
      {() => children ?? chevronDownIcon()}
    </div>
  );
}

interface SelectProps extends HTMLAttributes<"button"> {
  items?: SelectEntry[];
  /** Controlled selected value. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "default";
  /** Renders the trigger's clear affordance while a value is selected. */
  clearable?: boolean;
  class?: string;
}

let selectCount = 0;

export default function Select({ items, value, onValueChange, placeholder, size, clearable, class: cls, ...attrs }: SelectProps): JSX.Element {
  const s = selectOpenState();
  const contentId = `hella-select-content-${++selectCount}`;
  const internal = signal("");
  const current = (): string => (value !== undefined ? value() : internal());
  const select = (next: string): void => {
    if (value === undefined) internal(next);
    onValueChange?.(next);
  };
  const currentLabel = (): HellaChildren | undefined =>
    (items ?? []).find((entry) => entry.value === current())?.label;
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

  return (
    <button
      type="button"
      data-slot="select-trigger"
      data-size={size ?? "default"}
      data-state={s.state()}
      aria-haspopup="listbox"
      aria-expanded={s.isOpen() ? "true" : "false"}
      aria-controls={contentId}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      on:click={() => s.setOpen(!s.isOpen())}
      on:keydown={(e) => {
        const key = (e as KeyboardEvent).key;
        if (key !== "ArrowDown" && key !== "ArrowUp") return;
        e.preventDefault();
        s.setOpen(true);
      }}
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) triggerNode = node;
      }}
      {...attrs}
    >
      <SelectValue placeholder={placeholder} value={currentLabel} />
      {() => (clearable && current() !== "" ? (
        <span
          data-slot="select-clear"
          role="button"
          aria-label="Clear"
          on:click={(e) => {
            e.stopPropagation();
            select("");
          }}
        >
          {clearIcon()}
        </span>
      ) : null)}
      {chevronDownIcon()}
      {() => s.visible() && (
        <Portal to="body">
          <SelectContent
            state={s.state}
            id={contentId}
            anchor={() => triggerNode}
            onDismiss={() => s.setOpen(false)}
            onExited={s.finishExit}
            onClose={() => s.setOpen(false)}
          >
            {(items ?? []).map((entry) => (
              <SelectItem
                value={entry.value}
                label={entry.label}
                disabled={entry.disabled}
                selected={() => current() === entry.value}
                onselect={() => {
                  select(entry.value);
                  s.setOpen(false);
                }}
              />
            ))}
          </SelectContent>
        </Portal>
      )}
    </button>
  );
}
