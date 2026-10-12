import { effect, signal } from "@hellajs/core";
import { anchorPosition, html, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HellaChild, HellaNode, Placement } from "@hellajs/dom";
import type { AnchorSide, AnchorAlign, ComboboxEntry, ComboboxValueProps, ComboboxTriggerProps, ComboboxClearProps, ComboboxGroupProps, ComboboxLabelProps, ComboboxCollectionProps, ComboboxEmptyProps, ComboboxSeparatorProps, ComboboxItemProps, ComboboxListProps, ComboboxInputProps, ComboboxChipsProps, ComboboxChipProps, ComboboxChipsInputProps, ComboboxContentProps, ComboboxProps } from "./combobox-types.js";

// @hella:styles
declare const addon: string;
declare const base: string;
declare const buttonBase: string;
declare const buttonGhost: string;
declare const buttonSizeIconXs: string;
declare const chip: string;
declare const chipRemoveExtra: string;
declare const chips: string;
declare const chipsInput: string;
declare const content: string;
declare const empty: string;
declare const icon: string;
declare const input: string;
declare const inputControl: string;
declare const inputFocus: string;
declare const inputInvalid: string;
declare const item: string;
declare const itemIndicator: string;
declare const label: string;
declare const list: string;
declare const separator: string;
declare const sizeIconXs: string;
declare const trigger: string;
declare const triggerExtra: string;
declare const triggerIcon: string;
declare const xIcon: string;
// @hella:end

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

/** Open/close state: exit-holding `visible` gate so an open→closed flip never unmounts before the exit starts. */
function comboboxOpenState() {
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
    data-slot="combobox-trigger-icon"
    class="${
      // @hella:compose
      [triggerIcon]
      // @hella:end
    }"
  >
    <path d="m6 9 6 6 6-6" />
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
      [xIcon]
      // @hella:end
    }"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>` as HellaNode;

/** Renders the selected value for compositions that show the selection outside the input. */
export function ComboboxValue({ value, class: cls, ...attrs }: ComboboxValueProps): HellaNode {
  const current = (): string | string[] | undefined =>
    typeof value === "function" ? value() : value;
  return html`
    <span
      data-slot="combobox-value"
      class="${
        // @hella:compose
        [cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => {
      const v = current();
      return Array.isArray(v) ? v.join(", ") : v;
    }}</span>
  ` as HellaNode;
}

/** The manual trigger button; the composed Combobox renders its chevron twin inside the input-group addon. */
export function ComboboxTrigger({ children, class: cls, ...attrs }: ComboboxTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="combobox-trigger"
      class="${
        // @hella:compose
        [trigger, cls]
        // @hella:end
      }"
      ...${attrs}
    >
      ${() => children}${chevronDownIcon()}
    </button>
  ` as HellaNode;
}

/** The clear affordance, styled as the input-group's ghost icon-xs button. */
export function ComboboxClear({ onClear, "on:click": userClick, class: cls, ...attrs }: ComboboxClearProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="combobox-clear"
      aria-label="Clear"
      class="${
        // @hella:compose
        [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, cls]
        // @hella:end
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); onClear?.(); }}"
      ...${attrs}
    >${clearIcon()}</button>
  ` as HellaNode;
}

export function ComboboxGroup({ children, class: cls, ...attrs }: ComboboxGroupProps): HellaNode {
  return html`
    <div
      data-slot="combobox-group"
      class="${
        // @hella:compose
        [cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ComboboxLabel({ children, class: cls, ...attrs }: ComboboxLabelProps): HellaNode {
  return html`
    <div
      data-slot="combobox-label"
      class="${
        // @hella:compose
        [label, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

/** Passthrough wrapper grouping items rendered from external data. */
export function ComboboxCollection({ children, class: cls, ...attrs }: ComboboxCollectionProps): HellaNode {
  return html`
    <div
      data-slot="combobox-collection"
      class="${cls}"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

/** Renders when the query matches nothing; the composed Combobox mounts it with its default text. */
export function ComboboxEmpty({ children, class: cls, ...attrs }: ComboboxEmptyProps): HellaNode {
  return html`
    <div
      data-slot="combobox-empty"
      class="${
        // @hella:compose
        [empty, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ComboboxSeparator({ class: cls, ...attrs }: ComboboxSeparatorProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="combobox-separator"
      class="${
        // @hella:compose
        [separator, cls]
        // @hella:end
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

export function ComboboxItem({ value, label: labelProp, disabled, selected: selectedProp, highlighted: highlightedProp, hidden, onselect, "on:click": userClick, children, class: cls, ...attrs }: ComboboxItemProps): HellaNode {
  const selected = (): boolean =>
    typeof selectedProp === "function" ? selectedProp() : selectedProp ?? false;
  const highlighted = (): boolean =>
    typeof highlightedProp === "function" ? highlightedProp() : highlightedProp ?? false;
  // Precomputed so the style prop stays a bare reactive accessor (a compound
  // attribute expression would stringify through the transform).
  const hiddenStyle = hidden
    ? (): string => (hidden as () => boolean)() ? "display: none" : ""
    : undefined;
  return html`
    <div
      role="option"
      data-slot="combobox-item"
      data-value="${value}"
      aria-selected="${() => (selected() ? "true" : "false")}"
      data-state="${() => (selected() ? "checked" : "unchecked")}"
      data-highlighted="${() => (highlighted() ? "true" : undefined)}"
      data-disabled="${disabled ? "true" : undefined}"
      aria-disabled="${disabled ? "true" : undefined}"
      style="${hiddenStyle}"
      class="${
        // @hella:compose
        [item, cls]
        // @hella:end
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) {
        if (disabled) return;
        userClick?.call(this, e);
        onselect?.();
      }}"
      ...${attrs}
    >
      ${() => children ?? labelProp}
      <span
        data-slot="combobox-item-indicator"
        class="${
          // @hella:compose
          [itemIndicator]
          // @hella:end
        }"
      >
        ${() => (selected() ? checkIcon() : null)}
      </span>
    </div>
  ` as HellaNode;
}

export function ComboboxList({ id, items: itemsProp, query, filter, selected, active, onselect, empty: emptyProp, children, class: cls, ...attrs }: ComboboxListProps): HellaNode {
  const items = itemsProp ?? [];
  const matches = (): ComboboxEntry[] => {
    if (filter) return filter(items, query?.() ?? "");
    const q = (query?.() ?? "").trim().toLowerCase();
    if (q === "") return items;
    return items.filter((entry) => (entry.label ?? entry.value).toLowerCase().includes(q));
  };
  return html`
    <div
      role="listbox"
      id="${id}"
      data-slot="combobox-list"
      data-empty="${() => (emptyProp?.() ? "" : undefined)}"
      class="${
        // @hella:compose
        [list, cls]
        // @hella:end
      }"
      ...${attrs}
    >
      ${items.map((entry) =>
        ComboboxItem({
          value: entry.value,
          label: entry.label,
          disabled: entry.disabled,
          id: id + "-opt-" + items.indexOf(entry),
          selected: () => selected?.(entry.value) ?? false,
          highlighted: () => active?.() === entry.value,
          hidden: () => !matches().includes(entry),
          onselect: () => onselect?.(entry.value),
        }) as HellaChild,
      )}${() => children}
    </div>
  ` as HellaNode;
}

export function ComboboxInput({ value, disabled, state: stateProp, activeDescendant, showTrigger, showClear, onToggle, onClear, wire, portal, children, class: cls, ...attrs }: ComboboxInputProps): HellaNode {
  const state = (): "open" | "closed" => stateProp?.() ?? "closed";
  let disposeWire: (() => void) | undefined;
  return html`
    <div
      data-slot="input-group"
      role="group"
      data-disabled="${disabled ? "true" : undefined}"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      hook:afterMount="${(node: Element) => {
        if (node instanceof HTMLElement) disposeWire = wire?.(node);
      }}"
      hook:beforeDestroy="${() => {
        disposeWire?.();
        disposeWire = undefined;
      }}"
    >
      <input
        type="text"
        role="combobox"
        data-slot="input-group-control"
        aria-autocomplete="list"
        aria-expanded="${() => (state() === "open" ? "true" : "false")}"
        aria-activedescendant="${() => activeDescendant?.()}"
        disabled="${disabled}"
        value="${value}"
        class="${
          // @hella:compose
          [input, inputFocus, inputInvalid, inputControl]
          // @hella:end
        }"
        ...${attrs}
      />
      <div
        data-slot="input-group-addon"
        role="group"
        data-align="inline-end"
        class="${
          // @hella:compose
          [addon]
          // @hella:end
        }"
        on:click="${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest("button")) return;
          target.closest('[data-slot="input-group"]')?.querySelector("input")?.focus();
        }}"
      >
        ${() => (showTrigger ? html`<button
          type="button"
          data-slot="combobox-trigger"
          aria-label="Toggle"
          disabled="${disabled}"
          class="${
            // @hella:compose
            [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, triggerExtra]
            // @hella:end
          }"
          on:click="${() => onToggle?.()}"
        >${chevronDownIcon()}</button>` as HellaChild : null)}${() => (showClear ? html`<button
          type="button"
          data-slot="combobox-clear"
          aria-label="Clear"
          disabled="${disabled}"
          class="${
            // @hella:compose
            [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs]
            // @hella:end
          }"
          on:click="${() => onClear?.()}"
        >${clearIcon()}</button>` as HellaChild : null)}
      </div>
      ${() => portal?.()}${() => children}
    </div>
  ` as HellaNode;
}

export function ComboboxChips({ children, chips: chipsSlot, disabled, wire, portal, class: cls, ...attrs }: ComboboxChipsProps): HellaNode {
  let disposeWire: (() => void) | undefined;
  return html`
    <div
      data-slot="combobox-chips"
      data-disabled="${disabled ? "true" : undefined}"
      class="${
        // @hella:compose
        [chips, cls]
        // @hella:end
      }"
      hook:afterMount="${(node: Element) => {
        if (node instanceof HTMLElement) disposeWire = wire?.(node);
      }}"
      hook:beforeDestroy="${() => {
        disposeWire?.();
        disposeWire = undefined;
      }}"
      ...${attrs}
    >
      ${() => chipsSlot?.()}
      ${() => children}
      ${() => portal?.()}
    </div>
  ` as HellaNode;
}

export function ComboboxChip({ value, disabled, showRemove, onRemove, children, class: cls, ...attrs }: ComboboxChipProps): HellaNode {
  return html`
    <div
      data-slot="combobox-chip"
      data-value="${value}"
      data-disabled="${disabled ? "true" : undefined}"
      class="${
        // @hella:compose
        [chip, cls]
        // @hella:end
      }"
      ...${attrs}
    >
      ${() => children}${() => (showRemove !== false ? html`<button
        type="button"
        data-slot="combobox-chip-remove"
        aria-label="Remove"
        disabled="${disabled}"
        class="${
          // @hella:compose
          [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, chipRemoveExtra]
          // @hella:end
        }"
        on:click="${() => onRemove?.()}"
      >${clearIcon()}</button>` as HellaChild : null)}
    </div>
  ` as HellaNode;
}

export function ComboboxChipsInput({ value, disabled, state: stateProp, activeDescendant, class: cls, ...attrs }: ComboboxChipsInputProps): HellaNode {
  const state = (): "open" | "closed" => stateProp?.() ?? "closed";
  return html`
    <input
      type="text"
      role="combobox"
      data-slot="combobox-chip-input"
      aria-autocomplete="list"
      aria-expanded="${() => (state() === "open" ? "true" : "false")}"
      aria-activedescendant="${() => activeDescendant?.()}"
      disabled="${disabled}"
      value="${value}"
      class="${
        // @hella:compose
        [chipsInput, cls]
        // @hella:end
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

export function ComboboxContent({ state: stateProp, side: sideProp, align: alignProp, sideOffset, anchor, chips: chipsProp, empty: emptyProp, onDismiss, onExited, children, class: cls, ...attrs }: ComboboxContentProps): HellaNode {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "start";
  const state = (): "open" | "closed" => stateProp?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  // The exit runs unwired: flipping to "closed" tears the layer down
  // immediately; reopening remounts fresh wirings with the content.
  effect(() => {
    if (state() === "closed") disposeWirings();
  });

  return html`
    <div
      data-slot="combobox-content"
      data-state="${state}"
      data-side="${side}"
      data-align="${align}"
      data-chips="${chipsProp ? "true" : undefined}"
      data-empty="${() => (emptyProp?.() ? "" : undefined)}"
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
        const onAnimationEnd = (): void => {
          if (state() === "closed") onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

let comboboxCount = 0;

export function Combobox({ items: itemsProp, value, onValueChange, multiple, filter, showClear, class: cls, ...attrs }: ComboboxProps): HellaNode {
  const items = itemsProp ?? [];
  const s = comboboxOpenState();
  const listId = `hella-combobox-list-${++comboboxCount}`;
  const query = signal("");
  const internal = signal<string | string[]>(multiple ? [] : "");
  const current = (): string | string[] => (value !== undefined ? value() : internal());
  const selectedList = (): string[] => {
    const v = current();
    if (Array.isArray(v)) return v;
    return v !== "" && v !== undefined ? [v] : [];
  };
  const select = (next: string): void => {
    if (multiple) {
      const currentList = selectedList();
      const nextList = currentList.includes(next) ? currentList.filter((v) => v !== next) : [...currentList, next];
      if (value === undefined) internal(nextList);
      onValueChange?.(nextList);
      return;
    }
    if (value === undefined) internal(next);
    onValueChange?.(next);
  };
  const matches = (): ComboboxEntry[] => {
    if (filter) return filter(items, query());
    const q = query().trim().toLowerCase();
    if (q === "") return items;
    return items.filter((entry) => (entry.label ?? entry.value).toLowerCase().includes(q));
  };
  // The active option is tracked by value, so highlight survives the
  // items staying mounted while the query hides and shows them.
  const activeValue = signal<string | undefined>(undefined);
  const optionIdOf = (optionValue: string): string => {
    const at = items.findIndex((entry) => entry.value === optionValue);
    return listId + "-opt-" + at;
  };
  const move = (delta: number): void => {
    const enabled = matches().filter((entry) => !entry.disabled);
    if (enabled.length === 0) return;
    const at = enabled.findIndex((entry) => entry.value === activeValue());
    const next = at === -1 ? (delta === 1 ? 0 : enabled.length - 1) : (at + delta + enabled.length) % enabled.length;
    activeValue(enabled[next]!.value);
  };
  const openSelection = (): void => {
    const enabled = matches().filter((entry) => !entry.disabled);
    const selected = enabled.find((entry) => selectedList().includes(entry.value));
    activeValue(selected ? selected.value : enabled[0]?.value);
  };
  const setOpen = (next: boolean): void => {
    if (next && !s.isOpen()) openSelection();
    s.setOpen(next);
  };
  const commit = (next: string): void => {
    select(next);
    if (!multiple) {
      query("");
      setOpen(false);
    }
  };
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!s.isOpen()) {
        setOpen(true);
        return;
      }
      move(e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const entry = matches().find((candidate) => candidate.value === activeValue());
      if (!entry || entry.disabled) return;
      commit(entry.value);
      return;
    }
    if (e.key === "Escape") {
      if (query() !== "") query("");
      setOpen(false);
    }
  };
  const inputProps = {
    value: () => query(),
    "on:input": (e: Event) => query((e.target as HTMLInputElement).value),
    "on:keydown": onKeydown,
    "on:focus": () => setOpen(true),
    state: s.state,
    "aria-controls": listId,
    activeDescendant: (): string | undefined =>
      s.isOpen() && activeValue() !== undefined ? optionIdOf(activeValue()!) : undefined,
  };
  const wire = (node: HTMLElement): (() => void) => {
    // Typeahead rides the wrapper (printable keystrokes bubble from the
    // input) and walks the visible options' stable ids.
    return menuTypeahead(node, () => {
      const entries: { node: HTMLElement; text: string }[] = [];
      const matched = matches();
      let i = 0;
      while (i < matched.length) {
        const el = document.getElementById(optionIdOf(matched[i]!.value));
        if (el) entries.push({ node: el, text: matched[i]!.label ?? matched[i]!.value });
        i++;
      }
      return entries;
    }, (record) => {
      const entry = items.find((e) => optionIdOf(e.value) === record.node.id);
      if (entry) activeValue(entry.value);
    });
  };
  let wrapperNode: HTMLElement | undefined;
  const portal = (): HellaChild | null => s.visible() ? (Portal({
    to: "body",
    children: [
      ComboboxContent({
        state: s.state,
        chips: multiple,
        anchor: () => wrapperNode,
        empty: () => matches().length === 0,
        onDismiss: () => setOpen(false),
        onExited: s.finishExit,
        children: [
          ComboboxList({
            id: listId,
            items,
            query,
            filter,
            selected: (v: string) => selectedList().includes(v),
            active: () => activeValue(),
            empty: () => matches().length === 0,
            onselect: (v: string) => commit(v),
            children: [
              ComboboxEmpty({ children: "No items found." }) as HellaChild,
            ],
          }) as HellaChild,
        ],
      }) as HellaChild,
    ],
  }) as HellaChild) : null;
  if (multiple) {
    return ComboboxChips({
      class: cls,
      ...attrs,
      chips: () => selectedList().map((v) =>
        ComboboxChip({
          value: v,
          onRemove: () => select(v),
          children: items.find((entry) => entry.value === v)?.label ?? v,
        }) as HellaChild,
      ),
      wire: (node: HTMLElement) => {
        wrapperNode = node;
        return wire(node);
      },
      portal,
      children: [
        ComboboxChipsInput(inputProps) as HellaChild,
      ],
    });
  }
  return ComboboxInput({
    ...inputProps,
    class: cls,
    ...attrs,
    showTrigger: true,
    showClear,
    onToggle: () => setOpen(!s.isOpen()),
    onClear: () => {
      select("");
      query("");
    },
    hasValue: () => selectedList().length > 0,
    wire: (node: HTMLElement) => {
      wrapperNode = node;
      return wire(node);
    },
    portal,
  });
}

