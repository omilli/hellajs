import { effect, isFunction, signal } from "@hellajs/core";
import { ForEach, Portal } from "@hellajs/dom";
import { menuTypeahead } from "./utils/menuTypeahead";
import { anchoredLayer } from "./internal/anchoredLayer";
import { moveActive, optionIdOf, selectionActive, typeaheadEntries } from "./internal/listbox";
import type { ListboxModel } from "./internal/listbox";
import type {
  ComboboxChipsInputProps,
  ComboboxChipsProps,
  ComboboxChipProps,
  ComboboxClearProps,
  ComboboxContentProps,
  ComboboxEmptyProps,
  ComboboxEntry,
  ComboboxInputProps,
  ComboboxItemProps,
  ComboboxLabelProps,
  ComboboxListProps,
  ComboboxOptions,
  ComboboxPartProps,
  ComboboxComponents,
  ComboboxSeparatorProps,
  ComboboxValueProps,
} from "./types/components";

/** The default case-insensitive substring filter over item labels, shared by the factory's matches and the list's hidden resolution. */
const matchEntries = (
  items: ComboboxEntry[],
  query: string,
  filter: ComboboxOptions["filter"],
): ComboboxEntry[] => {
  if (filter) return filter(items, query);
  const q = query.trim().toLowerCase();
  if (q === "") return items;
  return items.filter((entry) => (entry.label ?? entry.value).toLowerCase().includes(q));
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
    data-slot="combobox-check-icon"
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
    data-slot="combobox-clear-icon"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

/** Open/close state: controlled override, exit-holding `visible` gate so an open→closed flip never unmounts before the exit starts. */
function comboboxOpenState(options: {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const internal = signal(false);
  const isOpen = (): boolean => (options.open !== undefined ? options.open() : internal());
  const setOpen = (next: boolean): void => {
    if (options.open === undefined) internal(next);
    options.onOpenChange?.(next);
  };
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading isOpen() in the template
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
  return {
    isOpen,
    setOpen,
    state: (): "open" | "closed" => (isOpen() ? "open" : "closed"),
    visible,
    finishExit,
  };
}

let comboboxCount = 0;

/**
 * Creates the combobox part set: the `Input` surface (single input-group or
 * the chips composition under `multiple`), the portaled `Content` layer, the
 * `List`/`Item` option rows plus the structural parts (`Empty`, `Group`,
 * `Label`, `Separator`, `Collection`, `Value`, `Clear`, `Chips`, `Chip`,
 * `ChipsInput`), and the `matches`/`open`/`setOpen` composition getters. The
 * closure owns the query, the selection (controlled through a `value` getter
 * when passed, an internal signal when omitted), the active-by-value roving,
 * the typeahead ids, and the exit machine. `Content` portals to
 * `document.body`, anchors to the input wrapper, and holds the input's focus
 * while open. Call in component scope so the state machine's effect disposes
 * with the component.
 *
 * ```tsx
 * const Combobox = combobox({ items, value, onValueChange, multiple, filter });
 *
 * <Combobox.Input placeholder="Search…" />
 * <Combobox.Content side="bottom">
 *   <Combobox.List>
 *     <ForEach each={Combobox.matches} keyBy="value">
 *       {(entry) => <Combobox.Item value={entry.value}>{entry.label ?? entry.value}</Combobox.Item>}
 *     </ForEach>
 *   </Combobox.List>
 *   <Combobox.Empty>No items found.</Combobox.Empty>
 * </Combobox.Content>
 * ```
 * @param options `items` (array or getter), controlled-or-internal `value` + `onValueChange`, `multiple`, and an optional `filter` replacing the default substring match.
 * @returns The part set plus the composition getters, composed as `Combobox.Input`-style members.
 */
export function combobox(options: ComboboxOptions = {}): ComboboxComponents {
  const s = comboboxOpenState(options);
  const multiple = options.multiple ?? false;
  const listId = `hella-combobox-list-${++comboboxCount}`;
  const query = signal("");
  const internal = signal<string | string[]>(multiple ? [] : "");
  const value = options.value;
  const current = (): string | string[] => (value !== undefined ? value() : internal());
  const selectedList = (): string[] => {
    const v = current();
    if (Array.isArray(v)) return v;
    return v !== "" && v !== undefined ? [v] : [];
  };
  const select = (next: string): void => {
    if (multiple) {
      const currentList = selectedList();
      const nextList = currentList.includes(next)
        ? currentList.filter((v) => v !== next)
        : [...currentList, next];
      if (value === undefined) internal(nextList);
      options.onValueChange?.(nextList);
      return;
    }
    if (value === undefined) internal(next);
    options.onValueChange?.(next);
  };
  const items = (): ComboboxEntry[] => {
    const source = options.items;
    if (source === undefined) return [];
    return isFunction(source) ? source() : source;
  };
  const matches = (): ComboboxEntry[] => matchEntries(items(), query(), options.filter);
  // The active option is tracked by value, so highlight survives the
  // items staying mounted while the query hides and shows them.
  const activeValue = signal<string | undefined>(undefined);
  const optionId = (optionValue: string): string => optionIdOf(listId, optionValue);
  const model: ListboxModel = {
    options: () =>
      matches().map((entry) => ({
        value: entry.value,
        node: document.getElementById(optionId(entry.value)) ?? undefined,
        text: entry.label ?? entry.value,
        disabled: entry.disabled === true,
      })),
    active: () => activeValue(),
    isSelected: (optionValue) => selectedList().includes(optionValue),
    highlight: (optionValue) => activeValue(optionValue),
    commit: (optionValue) => commit(optionValue),
    close: () => setOpen(false),
  };
  const commit = (next: string): void => {
    select(next);
    if (!multiple) {
      query("");
      setOpen(false);
    }
  };
  const setOpen = (next: boolean): void => {
    if (next && !s.isOpen()) activeValue(selectionActive(model));
    s.setOpen(next);
  };
  const clear = (): void => {
    select("");
    query("");
  };
  const inputKeydown = (e: KeyboardEvent): void => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!s.isOpen()) {
        setOpen(true);
        return;
      }
      moveActive(model, e.key === "ArrowDown" ? 1 : -1);
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
  // The multi-select chips render from the selected values; each chip's
  // remove toggles its value back out of the selection.
  const chipsThunk = (): JSX.Element[] =>
    selectedList().map((chipValue) => (
      <Chip value={chipValue}>
        {items().find((entry) => entry.value === chipValue)?.label ?? chipValue}
      </Chip>
    ));

  let wrapperNode: HTMLElement | undefined;

  const Input = (props: ComboboxInputProps = {}): JSX.Element => {
    const {
      children,
      class: cls,
      value: valueProp,
      disabled,
      state: stateProp,
      activeDescendant,
      showTrigger: showTriggerProp,
      showClear,
      onToggle,
      onClear,
      "on:input": userInput,
      "on:keydown": userKeydown,
      "on:focus": userFocus,
      ...attrs
    } = props;
    const state = stateProp ?? s.state;
    const shown = (): string => (isFunction(valueProp) ? valueProp() : (valueProp ?? query()));
    const activeId = (): string | undefined =>
      activeDescendant
        ? activeDescendant()
        : s.isOpen() && activeValue() !== undefined
          ? optionId(activeValue()!)
          : undefined;
    const handlers = {
      "on:input": function (this: HTMLElement, e: InputEvent) {
        userInput?.call(this, e);
        query((e.target as HTMLInputElement).value);
      },
      "on:keydown": function (this: HTMLElement, e: KeyboardEvent) {
        userKeydown?.call(this, e);
        inputKeydown(e);
      },
      "on:focus": function (this: HTMLElement, e: FocusEvent) {
        userFocus?.call(this, e);
        setOpen(true);
      },
    };
    let disposeTypeahead: (() => void) | undefined;
    // Typeahead rides the wrapper (printable keystrokes bubble from the
    // input) and walks the visible options' stable value-derived ids.
    const afterMount = (node?: Element): void => {
      if (!(node instanceof HTMLElement)) return;
      wrapperNode = node;
      disposeTypeahead = menuTypeahead(
        node,
        () => typeaheadEntries(model),
        (record) => {
          const optionValue = record.node.dataset.value;
          if (optionValue !== undefined) model.highlight(optionValue);
        },
      );
    };
    const beforeDestroy = (): void => {
      disposeTypeahead?.();
      disposeTypeahead = undefined;
    };
    if (multiple) {
      return (
        <div
          data-slot="combobox-chips"
          data-disabled={disabled ? "true" : undefined}
          class={cls}
          hook:afterMount={afterMount}
          hook:beforeDestroy={beforeDestroy}
          {...attrs}
        >
          {chipsThunk}
          <ChipsInput
            value={shown}
            disabled={disabled}
            state={state}
            activeDescendant={activeId}
            {...handlers}
          />
          {children}
        </div>
      );
    }
    return (
      <div
        data-slot="input-group"
        role="group"
        data-disabled={disabled ? "true" : undefined}
        class={cls}
        hook:afterMount={afterMount}
        hook:beforeDestroy={beforeDestroy}
      >
        <input
          type="text"
          role="combobox"
          data-slot="input-group-control"
          aria-autocomplete="list"
          aria-expanded={() => (state() === "open" ? "true" : "false")}
          aria-activedescendant={activeId}
          aria-controls={listId}
          disabled={disabled}
          value={shown}
          {...handlers}
          {...attrs}
        />
        <div
          data-slot="input-group-addon"
          role="group"
          data-align="inline-end"
          on:click={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("button")) return;
            target.closest('[data-slot="input-group"]')?.querySelector("input")?.focus();
          }}
        >
          {() =>
            (showTriggerProp ?? true) ? (
              <button
                type="button"
                data-slot="combobox-trigger"
                aria-label="Toggle"
                disabled={disabled}
                on:click={() => {
                  if (onToggle) onToggle();
                  else setOpen(!s.isOpen());
                }}
              >
                {chevronDownIcon()}
              </button>
            ) : null
          }
          {() =>
            showClear ? (
              <button
                type="button"
                data-slot="combobox-clear"
                aria-label="Clear"
                disabled={disabled}
                on:click={() => {
                  if (onClear) onClear();
                  else clear();
                }}
              >
                {clearIcon()}
              </button>
            ) : null
          }
        </div>
        {children}
      </div>
    );
  };

  const Content = (props: ComboboxContentProps = {}): JSX.Element => {
    const {
      children,
      class: cls,
      id,
      side: sideProp,
      align: alignProp,
      sideOffset: sideOffsetProp,
      anchor: anchorProp,
      chips: chipsProp,
      empty: emptyProp,
      onExited,
      ...attrs
    } = props;
    const side = sideProp ?? "bottom";
    const align = alignProp ?? "start";
    const sideOffset = sideOffsetProp ?? 6;
    const emptyFlag = (): boolean =>
      emptyProp !== undefined ? emptyProp() : matches().length === 0;
    // The gate is a region OUTSIDE the Portal: portals mount once, so the
    // whole portal must reconstruct per open for the mount walk (and the
    // engine's afterMount wiring) to run against fresh content.
    return (
      <>
        {() =>
          s.visible() && (
            <Portal to="body">
              <div
                id={id}
                data-slot="combobox-content"
                data-state={s.state()}
                data-side={side}
                data-align={align}
                data-chips={(chipsProp ?? multiple) ? "true" : undefined}
                data-empty={() => (emptyFlag() ? "" : undefined)}
                class={cls}
                {...attrs}
                hook:afterMount={(node) => {
                  if (!(node instanceof HTMLElement)) return;
                  anchoredLayer(node, {
                    state: s.state,
                    anchor: () => anchorProp?.() ?? wrapperNode,
                    side,
                    align,
                    sideOffset,
                    matchAnchorWidth: true,
                    // The combobox holds focus in the input while open:
                    // refocusing the active element satisfies the engine's
                    // open-focus contract without stealing the input's focus.
                    focusTarget: (): HTMLElement => document.activeElement as HTMLElement,
                    onDismiss: () => setOpen(false),
                    onExited: () => {
                      s.finishExit();
                      onExited?.();
                    },
                  });
                }}
              >
                {children}
              </div>
            </Portal>
          )
        }
      </>
    );
  };

  const List = (props: ComboboxListProps = {}): JSX.Element => {
    const {
      children,
      class: cls,
      id: idProp,
      items: itemsProp,
      keyBy,
      query: queryProp,
      filter: filterProp,
      selected,
      active,
      onselect,
      empty,
      ...attrs
    } = props;
    const driven = itemsProp !== undefined;
    const branchItems = (): ComboboxEntry[] =>
      driven ? (isFunction(itemsProp) ? itemsProp() : itemsProp!) : [];
    // The composed root hands the factory its own items back, so the hidden
    // resolution follows the closure's query; a foreign list resolves hidden
    // against this part's own query/filter (an absent query shows everything).
    const sameSource =
      driven && (isFunction(itemsProp) ? itemsProp === options.items : itemsProp === options.items);
    const branchMatches = (): ComboboxEntry[] => {
      if (queryProp !== undefined || filterProp !== undefined) {
        return matchEntries(branchItems(), queryProp?.() ?? "", filterProp);
      }
      if (sameSource) return matches();
      return branchItems();
    };
    const idOf = (optionValue: string): string => optionIdOf(idProp ?? listId, optionValue);
    const emptyFlag = (): boolean =>
      empty !== undefined ? empty() : sameSource || !driven ? matches().length === 0 : false;
    return (
      <div
        role="listbox"
        id={idProp ?? listId}
        data-slot="combobox-list"
        data-empty={() => (emptyFlag() ? "" : undefined)}
        class={cls}
        {...attrs}
      >
        {() =>
          driven ? (
            <ForEach
              each={branchItems}
              use={(entry) => (
                <Item
                  key={keyBy ? entry.value : undefined}
                  id={idOf(entry.value)}
                  value={entry.value}
                  label={entry.label}
                  disabled={entry.disabled}
                  selected={selected ? () => selected(entry.value) : undefined}
                  highlighted={active ? () => active() === entry.value : undefined}
                  hidden={() => !branchMatches().includes(entry)}
                  onselect={onselect ? () => onselect(entry.value) : undefined}
                />
              )}
            />
          ) : null
        }
        {children}
      </div>
    );
  };

  const Item = (props: ComboboxItemProps = {}): JSX.Element => {
    const {
      children,
      class: cls,
      value,
      label: labelProp,
      disabled,
      selected: selectedProp,
      highlighted: highlightedProp,
      hidden,
      onselect,
      id: idProp,
      "on:click": userClick,
      ...attrs
    } = props;
    const selected = (): boolean =>
      isFunction(selectedProp)
        ? selectedProp()
        : (selectedProp ?? (value !== undefined && selectedList().includes(value)));
    const highlighted = (): boolean =>
      isFunction(highlightedProp)
        ? highlightedProp()
        : (highlightedProp ?? (value !== undefined && activeValue() === value));
    // Precomputed so the style prop stays a bare reactive accessor (a compound
    // attribute expression would stringify through the transform).
    const hiddenStyle = hidden ? (): string => (hidden() ? "display: none" : "") : undefined;
    return (
      <div
        role="option"
        id={idProp ?? (value !== undefined ? optionId(value) : undefined)}
        data-slot="combobox-item"
        data-value={value}
        aria-selected={selected() ? "true" : "false"}
        data-state={selected() ? "checked" : "unchecked"}
        data-highlighted={() => (highlighted() ? "true" : undefined)}
        data-disabled={disabled ? "true" : undefined}
        aria-disabled={disabled ? "true" : undefined}
        style={hiddenStyle}
        class={cls}
        on:click={function (e) {
          if (disabled) return;
          userClick?.call(this, e);
          if (onselect) onselect();
          else if (value !== undefined) commit(value);
        }}
        {...attrs}
      >
        {() => children ?? labelProp}
        <span data-slot="combobox-item-indicator">{() => (selected() ? checkIcon() : null)}</span>
      </div>
    );
  };

  const Empty = (props: ComboboxEmptyProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="combobox-empty" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Group = (props: ComboboxPartProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="combobox-group" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Label = (props: ComboboxLabelProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="combobox-label" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Separator = (props: ComboboxSeparatorProps = {}): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return <div role="separator" data-slot="combobox-separator" class={cls} {...attrs} />;
  };

  const Collection = (props: ComboboxPartProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="combobox-collection" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Value = (props: ComboboxValueProps = {}): JSX.Element => {
    const { class: cls, value: valueProp, ...attrs } = props;
    const shown = (): string | string[] | undefined =>
      valueProp === undefined ? current() : isFunction(valueProp) ? valueProp() : valueProp;
    return (
      <span data-slot="combobox-value" class={cls} {...attrs}>
        {() => {
          const v = shown();
          return Array.isArray(v) ? v.join(", ") : v;
        }}
      </span>
    );
  };

  const Clear = (props: ComboboxClearProps = {}): JSX.Element => {
    const { children, class: cls, onClear, "on:click": userClick, ...attrs } = props;
    return (
      <button
        type="button"
        data-slot="combobox-clear"
        aria-label="Clear"
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          if (onClear) onClear();
          else clear();
        }}
        {...attrs}
      >
        {clearIcon()}
        {children}
      </button>
    );
  };

  const Chips = (props: ComboboxChipsProps = {}): JSX.Element => {
    const { children, class: cls, chips: chipsSlot, disabled, ...attrs } = props;
    return (
      <div
        data-slot="combobox-chips"
        data-disabled={disabled ? "true" : undefined}
        class={cls}
        {...attrs}
      >
        {chipsSlot ?? chipsThunk}
        {children}
      </div>
    );
  };

  const Chip = (props: ComboboxChipProps = {}): JSX.Element => {
    const { children, class: cls, value, disabled, showRemove, onRemove, ...attrs } = props;
    return (
      <div
        data-slot="combobox-chip"
        data-value={value}
        data-disabled={disabled ? "true" : undefined}
        class={cls}
        {...attrs}
      >
        {children}
        {() =>
          showRemove !== false ? (
            <button
              type="button"
              data-slot="combobox-chip-remove"
              aria-label="Remove"
              disabled={disabled}
              on:click={() => {
                if (onRemove) onRemove();
                else if (value !== undefined) select(value);
              }}
            >
              {clearIcon()}
            </button>
          ) : null
        }
      </div>
    );
  };

  const ChipsInput = (props: ComboboxChipsInputProps = {}): JSX.Element => {
    const {
      class: cls,
      value: valueProp,
      disabled,
      state: stateProp,
      activeDescendant,
      ...attrs
    } = props;
    const state = stateProp ?? s.state;
    const shown = (): string => (isFunction(valueProp) ? valueProp() : (valueProp ?? query()));
    const activeId = (): string | undefined =>
      activeDescendant
        ? activeDescendant()
        : s.isOpen() && activeValue() !== undefined
          ? optionId(activeValue()!)
          : undefined;
    return (
      <input
        type="text"
        role="combobox"
        data-slot="combobox-chip-input"
        aria-autocomplete="list"
        aria-expanded={() => (state() === "open" ? "true" : "false")}
        aria-activedescendant={activeId}
        aria-controls={listId}
        disabled={disabled}
        value={shown}
        class={cls}
        {...attrs}
      />
    );
  };

  return {
    Input,
    Content,
    List,
    Item,
    Empty,
    Group,
    Label,
    Separator,
    Collection,
    Value,
    Clear,
    Chips,
    Chip,
    ChipsInput,
    matches,
    open: s.isOpen,
    setOpen,
  };
}
