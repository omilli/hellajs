import { effect, signal } from "@hellajs/core";
import { anchorPosition, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HellaChildren, Placement } from "@hellajs/dom";

// @hella:styles
// @hella:end

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
    data-slot="combobox-trigger-icon"
    class={
      // @hella:compose
      [triggerIcon]
      // @hella:end
    }
  >
    <path d="m6 9 6 6 6-6" />
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
      [xIcon]
      // @hella:end
    }
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

interface ComboboxValueProps {
  /** The displayed selection. A string reads statically; an accessor keeps it reactive; an array joins with ", ". */
  value?: string | string[] | (() => string | string[] | undefined);
  class?: string;
}

/** Renders the selected value for compositions that show the selection outside the input. */
export function ComboboxValue(props: ComboboxValueProps): JSX.Element {
  const current = (): string | string[] | undefined =>
    typeof props.value === "function" ? props.value() : props.value;
  return (
    <span
      data-slot="combobox-value"
      class={
        // @hella:compose
        [value, props.class]
        // @hella:end
      }
    >
      {() => {
        const v = current();
        return Array.isArray(v) ? v.join(", ") : v;
      }}
    </span>
  );
}

interface ComboboxTriggerProps {
  children?: HellaChildren;
  onclick?: () => void;
  disabled?: boolean;
  class?: string;
}

/** The manual trigger button; the composed Combobox renders its chevron twin inside the input-group addon. */
export function ComboboxTrigger(props: ComboboxTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="combobox-trigger"
      disabled={props.disabled}
      class={
        // @hella:compose
        [trigger, props.class]
        // @hella:end
      }
      on:click={() => props.onclick?.()}
    >
      {() => props.children}
      {chevronDownIcon()}
    </button>
  );
}

interface ComboboxClearProps {
  /** Called on click; the composed Combobox wipes the selection. */
  onClear?: () => void;
  disabled?: boolean;
  class?: string;
}

/** The clear affordance, styled as the input-group's ghost icon-xs button. */
export function ComboboxClear(props: ComboboxClearProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="combobox-clear"
      aria-label="Clear"
      disabled={props.disabled}
      class={
        // @hella:compose
        [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, props.class]
        // @hella:end
      }
      on:click={() => props.onClear?.()}
    >
      {clearIcon()}
    </button>
  );
}

interface ComboboxGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function ComboboxGroup(props: ComboboxGroupProps): JSX.Element {
  return (
    <div
      data-slot="combobox-group"
      class={
        // @hella:compose
        [group, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

interface ComboboxLabelProps {
  children?: HellaChildren;
  class?: string;
}

export function ComboboxLabel(props: ComboboxLabelProps): JSX.Element {
  return (
    <div
      data-slot="combobox-label"
      class={
        // @hella:compose
        [label, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

interface ComboboxCollectionProps {
  children?: HellaChildren;
  class?: string;
}

/** Passthrough wrapper grouping items rendered from external data. */
export function ComboboxCollection(props: ComboboxCollectionProps): JSX.Element {
  return (
    <div
      data-slot="combobox-collection"
      class={props.class}
    >
      {() => props.children}
    </div>
  );
}

interface ComboboxEmptyProps {
  children?: HellaChildren;
  class?: string;
}

/** Renders when the query matches nothing; the composed Combobox mounts it with its default text. */
export function ComboboxEmpty(props: ComboboxEmptyProps): JSX.Element {
  return (
    <div
      data-slot="combobox-empty"
      class={
        // @hella:compose
        [empty, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

interface ComboboxSeparatorProps {
  class?: string;
}

export function ComboboxSeparator(props: ComboboxSeparatorProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="combobox-separator"
      class={
        // @hella:compose
        [separator, props.class]
        // @hella:end
      }
    />
  );
}

interface ComboboxItemProps {
  value?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
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

export function ComboboxItem(props: ComboboxItemProps): JSX.Element {
  const selected = (): boolean =>
    typeof props.selected === "function" ? props.selected() : props.selected ?? false;
  const highlighted = (): boolean =>
    typeof props.highlighted === "function" ? props.highlighted() : props.highlighted ?? false;
  // Precomputed so the style prop stays a bare reactive accessor (a compound
  // attribute expression would stringify through the transform).
  const hiddenStyle = props.hidden
    ? (): string => (props.hidden as () => boolean)() ? "display: none" : ""
    : undefined;
  return (
    <div
      role="option"
      id={props.id}
      data-slot="combobox-item"
      data-value={props.value}
      aria-selected={selected() ? "true" : "false"}
      data-state={selected() ? "checked" : "unchecked"}
      data-highlighted={() => (highlighted() ? "true" : undefined)}
      data-disabled={props.disabled ? "true" : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      style={hiddenStyle}
      class={
        // @hella:compose
        [item, props.class]
        // @hella:end
      }
      on:click={() => {
        if (props.disabled) return;
        props.onselect?.();
      }}
    >
      {() => props.children ?? props.label}
      <span
        data-slot="combobox-item-indicator"
        class={
          // @hella:compose
          [itemIndicator]
          // @hella:end
        }
      >
        {() => (selected() ? checkIcon() : null)}
      </span>
    </div>
  );
}

interface ComboboxListProps {
  id?: string;
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

export function ComboboxList(props: ComboboxListProps): JSX.Element {
  const matches = (): ComboboxEntry[] => {
    const items = props.items ?? [];
    if (props.filter) return props.filter(items, props.query?.() ?? "");
    const q = (props.query?.() ?? "").trim().toLowerCase();
    if (q === "") return items;
    return items.filter((entry) => (entry.label ?? entry.value).toLowerCase().includes(q));
  };
  return (
    <div
      role="listbox"
      id={props.id}
      data-slot="combobox-list"
      data-empty={() => (props.empty?.() ? "" : undefined)}
      class={
        // @hella:compose
        [list, props.class]
        // @hella:end
      }
    >
      {(props.items ?? []).map((entry) => (
        <ComboboxItem
          value={entry.value}
          label={entry.label}
          disabled={entry.disabled}
          id={`${props.id}-opt-${(props.items ?? []).indexOf(entry)}`}
          selected={() => props.selected?.(entry.value) ?? false}
          highlighted={() => props.active?.() === entry.value}
          hidden={() => !matches().includes(entry)}
          onselect={() => props.onselect?.(entry.value)}
        />
      ))}
      {() => props.children}
    </div>
  );
}

interface ComboboxInputProps {
  id?: string;
  value?: string | (() => string);
  placeholder?: string;
  disabled?: boolean;
  /** Query change callback (delegated input event, e.target.value). */
  onInput?: (value: string) => void;
  /** Keydown handler owning the combobox keyboard model. */
  onKeydown?: (e: KeyboardEvent) => void;
  /** Focus handler; the composed Combobox opens on focus. */
  onFocus?: () => void;
  /** Resolves open state for aria-expanded; the composed Combobox wires it. */
  state?: () => "open" | "closed";
  /** Id of the listbox the input controls; lands in aria-controls. */
  ariaControls?: string;
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

export function ComboboxInput(props: ComboboxInputProps): JSX.Element {
  const state = (): "open" | "closed" => props.state?.() ?? "closed";
  let disposeWire: (() => void) | undefined;
  return (
    <div
      data-slot="input-group"
      role="group"
      data-disabled={props.disabled ? "true" : undefined}
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) disposeWire = props.wire?.(node);
      }}
      hook:beforeDestroy={() => {
        disposeWire?.();
        disposeWire = undefined;
      }}
    >
      <input
        type="text"
        role="combobox"
        data-slot="input-group-control"
        aria-autocomplete="list"
        aria-expanded={state() === "open" ? "true" : "false"}
        aria-controls={props.ariaControls}
        aria-activedescendant={() => props.activeDescendant?.()}
        placeholder={props.placeholder}
        disabled={props.disabled}
        value={props.value}
        class={
          // @hella:compose
          [input, inputFocus, inputInvalid, inputControl]
          // @hella:end
        }
        on:input={(e) => props.onInput?.((e.target as HTMLInputElement).value)}
        on:keydown={(e) => props.onKeydown?.(e as KeyboardEvent)}
        on:focus={() => props.onFocus?.()}
      />
      <div
        data-slot="input-group-addon"
        role="group"
        data-align="inline-end"
        class={
          // @hella:compose
          [addon]
          // @hella:end
        }
        on:click={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button")) return;
          target.closest('[data-slot="input-group"]')?.querySelector("input")?.focus();
        }}
      >
        {() => (props.showTrigger ? (
          <button
            type="button"
            data-slot="combobox-trigger"
            aria-label="Toggle"
            disabled={props.disabled}
            class={
              // @hella:compose
              [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, triggerExtra]
              // @hella:end
            }
            on:click={() => props.onToggle?.()}
          >
            {chevronDownIcon()}
          </button>
        ) : null)}
        {() => (props.showClear ? (
          <button
            type="button"
            data-slot="combobox-clear"
            aria-label="Clear"
            disabled={props.disabled}
            class={
              // @hella:compose
              [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs]
              // @hella:end
            }
            on:click={() => props.onClear?.()}
          >
            {clearIcon()}
          </button>
        ) : null)}
      </div>
      {() => props.portal?.()}
      {() => props.children}
    </div>
  );
}

interface ComboboxChipsProps {
  children?: HellaChildren;
  /** Reactive chips; a thunk so the selected-values map stays a single reactive child (nested function children stringify). */
  chips?: () => HellaChildren;
  disabled?: boolean;
  /** Wires the chips wrapper on mount and returns its dispose; the composed Combobox anchors the panel here. */
  wire?: (node: HTMLElement) => () => void;
  /** The portaled panel, mounted while open; rendered as a reactive child inside the wrapper. */
  portal?: () => HellaChildren;
  class?: string;
}

export function ComboboxChips(props: ComboboxChipsProps): JSX.Element {
  let disposeWire: (() => void) | undefined;
  return (
    <div
      data-slot="combobox-chips"
      data-disabled={props.disabled ? "true" : undefined}
      class={
        // @hella:compose
        [chips, props.class]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) disposeWire = props.wire?.(node);
      }}
      hook:beforeDestroy={() => {
        disposeWire?.();
        disposeWire = undefined;
      }}
    >
      {() => props.chips?.()}
      {() => props.children}
      {() => props.portal?.()}
    </div>
  );
}

interface ComboboxChipProps {
  value?: string;
  disabled?: boolean;
  /** Renders the remove button; defaults to true. */
  showRemove?: boolean;
  onRemove?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function ComboboxChip(props: ComboboxChipProps): JSX.Element {
  return (
    <div
      data-slot="combobox-chip"
      data-value={props.value}
      data-disabled={props.disabled ? "true" : undefined}
      class={
        // @hella:compose
        [chip, props.class]
        // @hella:end
      }
    >
      {() => props.children}
      {() => (props.showRemove !== false ? (
        <button
          type="button"
          data-slot="combobox-chip-remove"
          aria-label="Remove"
          disabled={props.disabled}
          class={
            // @hella:compose
            [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, chipRemoveExtra]
            // @hella:end
          }
          on:click={() => props.onRemove?.()}
        >
          {clearIcon()}
        </button>
      ) : null)}
    </div>
  );
}

interface ComboboxChipsInputProps {
  id?: string;
  value?: string | (() => string);
  placeholder?: string;
  disabled?: boolean;
  onInput?: (value: string) => void;
  onKeydown?: (e: KeyboardEvent) => void;
  onFocus?: () => void;
  state?: () => "open" | "closed";
  ariaControls?: string;
  activeDescendant?: () => string | undefined;
  class?: string;
}

export function ComboboxChipsInput(props: ComboboxChipsInputProps): JSX.Element {
  const state = (): "open" | "closed" => props.state?.() ?? "closed";
  return (
    <input
      type="text"
      role="combobox"
      data-slot="combobox-chip-input"
      aria-autocomplete="list"
      aria-expanded={state() === "open" ? "true" : "false"}
      aria-controls={props.ariaControls}
      aria-activedescendant={() => props.activeDescendant?.()}
      placeholder={props.placeholder}
      disabled={props.disabled}
      value={props.value}
      class={
        // @hella:compose
        [chipsInput, props.class]
        // @hella:end
      }
      on:input={(e) => props.onInput?.((e.target as HTMLInputElement).value)}
      on:keydown={(e) => props.onKeydown?.(e as KeyboardEvent)}
      on:focus={() => props.onFocus?.()}
    />
  );
}

interface ComboboxContentProps {
  state?: () => "open" | "closed";
  id?: string;
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

export function ComboboxContent(props: ComboboxContentProps): JSX.Element {
  const side = props.side ?? "bottom";
  const align = props.align ?? "start";
  const state = (): "open" | "closed" => props.state?.() ?? "open";
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

  return (
    <div
      data-slot="combobox-content"
      data-state={state()}
      data-side={side}
      data-align={align}
      data-chips={props.chips ? "true" : undefined}
      data-empty={() => (props.empty?.() ? "" : undefined)}
      class={
        // @hella:compose
        [content, props.class]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = props.anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: props.sideOffset ?? 6, matchAnchorWidth: true }));
        if (props.onDismiss) {
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], props.onDismiss));
        }
        const onAnimationEnd = (): void => {
          if (state() === "closed") props.onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
    >
      {() => props.children}
    </div>
  );
}

interface ComboboxProps {
  items?: ComboboxEntry[];
  /** Controlled selection. Single mode holds one value; multiple mode holds an array. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  /** Replaces the default case-insensitive substring filter over item labels. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Renders the input's clear affordance while a value is selected. */
  showClear?: boolean;
  class?: string;
}

let comboboxCount = 0;

export default function Combobox(props: ComboboxProps): JSX.Element {
  const s = comboboxOpenState();
  const listId = `hella-combobox-list-${++comboboxCount}`;
  const query = signal("");
  const internal = signal<string | string[]>(props.multiple ? [] : "");
  const current = (): string | string[] => (props.value !== undefined ? props.value() : internal());
  const selectedList = (): string[] => {
    const v = current();
    if (Array.isArray(v)) return v;
    return v !== "" && v !== undefined ? [v] : [];
  };
  const select = (next: string): void => {
    if (props.multiple) {
      const list = selectedList();
      const nextList = list.includes(next) ? list.filter((v) => v !== next) : [...list, next];
      if (props.value === undefined) internal(nextList);
      props.onValueChange?.(nextList);
      return;
    }
    if (props.value === undefined) internal(next);
    props.onValueChange?.(next);
  };
  const matches = (): ComboboxEntry[] => {
    const items = props.items ?? [];
    if (props.filter) return props.filter(items, query());
    const q = query().trim().toLowerCase();
    if (q === "") return items;
    return items.filter((entry) => (entry.label ?? entry.value).toLowerCase().includes(q));
  };
  // The active option is tracked by value, so highlight survives the
  // items staying mounted while the query hides and shows them.
  const activeValue = signal<string | undefined>(undefined);
  const optionIdOf = (value: string): string => {
    const at = (props.items ?? []).findIndex((entry) => entry.value === value);
    return `${listId}-opt-${at}`;
  };
  const move = (delta: number): void => {
    const list = matches().filter((entry) => !entry.disabled);
    if (list.length === 0) return;
    const at = list.findIndex((entry) => entry.value === activeValue());
    const next = at === -1 ? (delta === 1 ? 0 : list.length - 1) : (at + delta + list.length) % list.length;
    activeValue(list[next]!.value);
  };
  const openSelection = (): void => {
    const list = matches().filter((entry) => !entry.disabled);
    const selected = list.find((entry) => selectedList().includes(entry.value));
    activeValue(selected ? selected.value : list[0]?.value);
  };
  const setOpen = (next: boolean): void => {
    if (next && !s.isOpen()) openSelection();
    s.setOpen(next);
  };
  const commit = (value: string): void => {
    select(value);
    if (!props.multiple) {
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
      const entry = matches().find((item) => item.value === activeValue());
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
    onInput: (v: string) => query(v),
    onKeydown,
    onFocus: () => setOpen(true),
    state: s.state,
    ariaControls: listId,
    activeDescendant: (): string | undefined =>
      s.isOpen() && activeValue() !== undefined ? optionIdOf(activeValue()!) : undefined,
  };
  const wire = (node: HTMLElement): (() => void) => {
    // Typeahead rides the wrapper (printable keystrokes bubble from the
    // input) and walks the visible options' stable ids.
    return menuTypeahead(node, () => {
      const entries: { node: HTMLElement; text: string }[] = [];
      const list = matches();
      let i = 0;
      while (i < list.length) {
        const el = document.getElementById(optionIdOf(list[i]!.value));
        if (el) entries.push({ node: el, text: list[i]!.label ?? list[i]!.value });
        i++;
      }
      return entries;
    }, (item) => {
      const entry = (props.items ?? []).find((e) => optionIdOf(e.value) === item.node.id);
      if (entry) activeValue(entry.value);
    });
  };
  let wrapperNode: HTMLElement | undefined;
  const portal = (): JSX.Element | null => s.visible() ? (
    <Portal to="body">
      <ComboboxContent
        state={s.state}
        chips={props.multiple}
        anchor={() => wrapperNode}
        empty={() => matches().length === 0}
        onDismiss={() => setOpen(false)}
        onExited={s.finishExit}
      >
        <ComboboxList
          id={listId}
          items={props.items}
          query={query}
          filter={props.filter}
          selected={(v) => selectedList().includes(v)}
          active={() => activeValue()}
          empty={() => matches().length === 0}
          onselect={(v) => commit(v)}
        >
          <ComboboxEmpty>No items found.</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Portal>
  ) : null;
  if (props.multiple) {
    return (
      <ComboboxChips
        chips={() => selectedList().map((v) => (
          <ComboboxChip value={v} onRemove={() => select(v)}>
            {(props.items ?? []).find((entry) => entry.value === v)?.label ?? v}
          </ComboboxChip>
        ))}
        wire={(node) => {
          wrapperNode = node;
          return wire(node);
        }}
        portal={portal}
      >
        <ComboboxChipsInput {...inputProps} />
      </ComboboxChips>
    );
  }
  return (
    <ComboboxInput
      {...inputProps}
      showTrigger={true}
      showClear={props.showClear}
      onToggle={() => setOpen(!s.isOpen())}
      onClear={() => {
        select("");
        query("");
      }}
      hasValue={() => selectedList().length > 0}
      wire={(node) => {
        wrapperNode = node;
        return wire(node);
      }}
      portal={portal}
    />
  );
}

export { Combobox };
