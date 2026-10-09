import { effect, signal } from "@hellajs/core";
import { anchorPosition, html, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode, Placement } from "@hellajs/dom";
import { cn } from "./cn.js";

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

interface ComboboxEntry {
  value: string;
  label?: string;
  disabled?: boolean;
}

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
      cn("pointer-events-none size-4 pointer-coarse:size-5")
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
      cn("pointer-events-none size-4 text-muted-foreground")
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
      cn("pointer-events-none")
    }"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>` as HellaNode;

interface ComboboxValueProps extends HTMLAttributes<"span"> {
  /** The displayed selection. A string reads statically; an accessor keeps it reactive; an array joins with ", ". */
  value?: string | string[] | (() => string | string[] | undefined);
  class?: string;
}

/** Renders the selected value for compositions that show the selection outside the input. */
export function ComboboxValue({ value, class: cls, ...attrs }: ComboboxValueProps): HellaNode {
  const current = (): string | string[] | undefined =>
    typeof value === "function" ? value() : value;
  return html`
    <span
      data-slot="combobox-value"
      class="${
        cn(cls)
      }"
      ...${attrs}
    >${() => {
      const v = current();
      return Array.isArray(v) ? v.join(", ") : v;
    }}</span>
  ` as HellaNode;
}

interface ComboboxTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; the composed Combobox renders its chevron twin inside the input-group addon. */
export function ComboboxTrigger({ children, class: cls, ...attrs }: ComboboxTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="combobox-trigger"
      class="${
        cn("[&_svg:not([class*='size-'])]:size-4", cls)
      }"
      ...${attrs}
    >
      ${() => children}${chevronDownIcon()}
    </button>
  ` as HellaNode;
}

interface ComboboxClearProps extends HTMLAttributes<"button"> {
  /** Called on click; the composed Combobox wipes the selection. */
  onClear?: () => void;
  class?: string;
}

/** The clear affordance, styled as the input-group's ghost icon-xs button. */
export function ComboboxClear({ onClear, "on:click": userClick, class: cls, ...attrs }: ComboboxClearProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="combobox-clear"
      aria-label="Clear"
      class="${
        cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50", "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3", "flex items-center gap-2 text-sm shadow-none size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0", cls)
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); onClear?.(); }}"
      ...${attrs}
    >${clearIcon()}</button>
  ` as HellaNode;
}

interface ComboboxGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function ComboboxGroup({ children, class: cls, ...attrs }: ComboboxGroupProps): HellaNode {
  return html`
    <div
      data-slot="combobox-group"
      class="${
        cn(cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ComboboxLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function ComboboxLabel({ children, class: cls, ...attrs }: ComboboxLabelProps): HellaNode {
  return html`
    <div
      data-slot="combobox-label"
      class="${
        cn("px-2 py-1.5 text-xs text-muted-foreground pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ComboboxCollectionProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
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

interface ComboboxEmptyProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

/** Renders when the query matches nothing; the composed Combobox mounts it with its default text. */
export function ComboboxEmpty({ children, class: cls, ...attrs }: ComboboxEmptyProps): HellaNode {
  return html`
    <div
      data-slot="combobox-empty"
      class="${
        cn("hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ComboboxSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

export function ComboboxSeparator({ class: cls, ...attrs }: ComboboxSeparatorProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="combobox-separator"
      class="${
        cn("-mx-1 my-1 h-px bg-border", cls)
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

interface ComboboxItemProps extends HTMLAttributes<"div"> {
  value?: string;
  label?: string;
  /** Selected state. A boolean reads statically; an accessor keeps the item reactive against its owning combobox. */
  selected?: boolean | (() => boolean);
  /** Highlighted state (the ref's data-highlighted ring); an accessor follows the active option. */
  highlighted?: boolean | (() => boolean);
  /** Hides the item (filtered out); a reactive accessor keeps it live against the query. */
  hidden?: () => boolean;
  /** Called on click when the item is enabled; the composed Combobox commits the selection. */
  onselect?: () => void;
  children?: HellaChildren;
  class?: string;
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
        cn("relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", cls)
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
          cn("pointer-events-none absolute right-2 flex size-4 items-center justify-center")
        }"
      >
        ${() => (selected() ? checkIcon() : null)}
      </span>
    </div>
  ` as HellaNode;
}

interface ComboboxListProps extends HTMLAttributes<"div"> {
  /** Data-driven items; rendered once and hidden (never remounted) as the query filters them. */
  items?: ComboboxEntry[];
  /** Resolves the live query driving the filter. */
  query?: () => string;
  /** Replaces the default case-insensitive substring filter. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Resolves whether a value is selected (aria-selected, data-state, check icon). */
  selected?: (value: string) => boolean;
  /** Resolves the highlighted value (data-highlighted, the aria-activedescendant target). */
  active?: () => string | undefined;
  /** Called on item click with the item value; the composed Combobox commits the selection. */
  onselect?: (value: string) => void;
  /** Zero-match flag; drives data-empty styling. */
  empty?: () => boolean;
  children?: HellaChildren;
  class?: string;
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
        cn("max-h-[min(calc(--spacing(96)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0", cls)
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

interface ComboboxInputProps extends HTMLAttributes<"input"> {
  value?: string | (() => string);
  disabled?: boolean;
  /** Resolves open state for aria-expanded; the composed Combobox wires it. */
  state?: () => "open" | "closed";
  /** Resolves the active option id for aria-activedescendant. */
  activeDescendant?: () => string | undefined;
  showTrigger?: boolean;
  showClear?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  hasValue?: () => boolean;
  /** Wires the wrapper on mount and returns its dispose; the composed Combobox anchors the panel here and attaches typeahead. */
  wire?: (node: HTMLElement) => () => void;
  /** The portaled panel, mounted while open; rendered as a reactive child inside the wrapper. */
  portal?: () => HellaChildren;
  children?: HellaChildren;
  class?: string;
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
        cn("group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30 h-9 min-w-0 has-[>textarea]:h-auto has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40", cls)
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
          cn("h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30", "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50", "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40", "flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent")
        }"
        ...${attrs}
      />
      <div
        data-slot="input-group-addon"
        role="group"
        data-align="inline-end"
        class="${
          cn("flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4 order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]")
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
            cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50", "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3", "flex items-center gap-2 text-sm shadow-none size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0", "group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent")
          }"
          on:click="${() => onToggle?.()}"
        >${chevronDownIcon()}</button>` as HellaChild : null)}${() => (showClear ? html`<button
          type="button"
          data-slot="combobox-clear"
          aria-label="Clear"
          disabled="${disabled}"
          class="${
            cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50", "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3", "flex items-center gap-2 text-sm shadow-none size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0")
          }"
          on:click="${() => onClear?.()}"
        >${clearIcon()}</button>` as HellaChild : null)}
      </div>
      ${() => portal?.()}${() => children}
    </div>
  ` as HellaNode;
}

interface ComboboxChipsProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Reactive chips; a thunk so the selected-values map stays a single reactive child (nested function children stringify). */
  chips?: () => HellaChildren;
  /** Wired, not spread: renders data-disabled and gates the chip remove buttons. */
  disabled?: boolean;
  /** Wires the chips wrapper on mount and returns its dispose; the composed Combobox anchors the panel here. */
  wire?: (node: HTMLElement) => () => void;
  /** The portaled panel, mounted while open; rendered as a reactive child inside the wrapper. */
  portal?: () => HellaChildren;
  class?: string;
}

export function ComboboxChips({ children, chips: chipsSlot, disabled, wire, portal, class: cls, ...attrs }: ComboboxChipsProps): HellaNode {
  let disposeWire: (() => void) | undefined;
  return html`
    <div
      data-slot="combobox-chips"
      data-disabled="${disabled ? "true" : undefined}"
      class="${
        cn("flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent bg-clip-padding px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-[3px] has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1.5 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40", cls)
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

interface ComboboxChipProps extends HTMLAttributes<"div"> {
  value?: string;
  /** Wired, not spread: renders data-disabled and gates the remove button. */
  disabled?: boolean;
  /** Renders the remove button; defaults to true. */
  showRemove?: boolean;
  onRemove?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function ComboboxChip({ value, disabled, showRemove, onRemove, children, class: cls, ...attrs }: ComboboxChipProps): HellaNode {
  return html`
    <div
      data-slot="combobox-chip"
      data-value="${value}"
      data-disabled="${disabled ? "true" : undefined}"
      class="${
        cn("flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0", cls)
      }"
      ...${attrs}
    >
      ${() => children}${() => (showRemove !== false ? html`<button
        type="button"
        data-slot="combobox-chip-remove"
        aria-label="Remove"
        disabled="${disabled}"
        class="${
          cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50", "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3", "flex items-center gap-2 text-sm shadow-none size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0", "-ml-1 opacity-50 hover:opacity-100")
        }"
        on:click="${() => onRemove?.()}"
      >${clearIcon()}</button>` as HellaChild : null)}
    </div>
  ` as HellaNode;
}

interface ComboboxChipsInputProps extends HTMLAttributes<"input"> {
  value?: string | (() => string);
  disabled?: boolean;
  /** Resolves open state for aria-expanded; the composed Combobox wires it. */
  state?: () => "open" | "closed";
  /** Resolves the active option id for aria-activedescendant. */
  activeDescendant?: () => string | undefined;
  class?: string;
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
        cn("min-w-16 flex-1 outline-none", cls)
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

interface ComboboxContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 6. */
  sideOffset?: number;
  /** Resolves the element the content anchors to (the input wrapper); positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** Sets data-chips="true" (chips-composition width styling). */
  chips?: boolean;
  /** Zero-match flag; drives data-empty styling. */
  empty?: () => boolean;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
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
        cn("group/combobox-content relative max-h-96 w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", cls)
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

interface ComboboxProps extends HTMLAttributes<"div"> {
  items?: ComboboxEntry[];
  /** Controlled selection. Single mode holds one value; multiple mode holds an array. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  /** Replaces the default case-insensitive substring filter over item labels. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Renders the input's clear affordance while a value is selected. */
  showClear?: boolean;
  class?: string;
}

let comboboxCount = 0;

export default function Combobox({ items: itemsProp, value, onValueChange, multiple, filter, showClear, class: cls, ...attrs }: ComboboxProps): HellaNode {
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

export { Combobox };
