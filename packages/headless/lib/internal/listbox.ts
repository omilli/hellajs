/**
 * One registered listbox option: value-keyed so highlight and selection
 * survive key-ordered list changes, with the DOM node when the registration
 * shape provides one, the typeahead text, and the disabled flag.
 * @internal
 */
export interface ListboxOption {
  /** The option value — roving, ids, and commits are keyed on it. */
  value: string;
  /** The option's node, when the registration shape resolved one (DOM-order registration always does; data-array registration looks option ids up on demand). */
  node: HTMLElement | undefined;
  /** The typeahead text (label or value for data arrays, textContent for DOM order). */
  text: string;
  /** Disabled options stay registered but are skipped by roving and blocked from activation. */
  disabled: boolean;
}

/**
 * The listbox behavior model both registration shapes resolve into: the
 * engine owns the roving math, activation, Tab close, typeahead shaping, and
 * stable id derivation, while the consumer supplies the option source and the
 * highlight/commit/close sinks.
 * @internal
 */
export interface ListboxModel {
  /** Resolves the registered options in roving order, re-read per call so dynamic lists join live. */
  options: () => ListboxOption[];
  /** Resolves the currently active option value (a tracked value or the focused node's), or undefined when nothing is active. */
  active: () => string | undefined;
  /** Resolves whether a value is selected — the selection-or-first active landing reads it. */
  isSelected: (value: string) => boolean;
  /** Moves the highlight to the option of `value` (combobox: sets the tracked value; select: focuses the node and mirrors `data-highlighted`). */
  highlight: (value: string) => void;
  /** Commits the option of `value` (selection write + close semantics owned by the consumer). */
  commit: (value: string) => void;
  /** Closes the listbox (the Tab arm). */
  close: () => void;
}

/**
 * Derives an option's stable id from the list id: `<listId>-opt-<value>`.
 * Value-derived so `aria-activedescendant` and the typeahead's node lookup
 * survive key-ordered list changes.
 * @internal
 * @param listId The listbox's id.
 * @param value The option value.
 * @returns The stable option id.
 */
export function optionIdOf(listId: string, value: string): string {
  return `${listId}-opt-${value}`;
}

/**
 * Filters a registered option list to the enabled entries — the roving,
 * Home/End, and selection-or-first landing all move over this set.
 * @internal
 * @param options The registered options.
 * @returns The enabled options in registration order.
 */
export function enabledOptions(options: ListboxOption[]): ListboxOption[] {
  const enabled: ListboxOption[] = [];
  let i = 0;
  const len = options.length;
  while (i < len) {
    const option = options[i++]!;
    if (!option.disabled) enabled.push(option);
  }
  return enabled;
}

/**
 * Reads a listbox's options in DOM order from `[role='option']` children,
 * disabled entries excluded — the select factory's DOM-order registration
 * shape (the DOM is the source; disabled options drop out at registration).
 * @internal
 * @param node The listbox container.
 * @returns The enabled options in DOM order, each carrying its node.
 */
export function domOptions(node: ParentNode): ListboxOption[] {
  const found = node.querySelectorAll("[role='option']");
  const options: ListboxOption[] = [];
  let i = 0;
  const len = found.length;
  while (i < len) {
    const el = found[i] as HTMLElement;
    i++;
    if (el.hasAttribute("data-disabled")) continue;
    options.push({
      value: el.dataset.value ?? "",
      node: el,
      text: el.textContent ?? "",
      disabled: false,
    });
  }
  return options;
}

/**
 * Roves the active value over the enabled options with wrap-around: `delta`
 * steps forward (+1) or backward (-1), entering from no active selection
 * lands on the first (forward) or last (backward) option.
 * @internal
 * @param model The listbox behavior model.
 * @param delta 1 for the next option, -1 for the previous.
 */
export function moveActive(model: ListboxModel, delta: number): void {
  const enabled = enabledOptions(model.options());
  if (enabled.length === 0) return;
  const at = enabled.findIndex((option) => option.value === model.active());
  const next =
    at === -1
      ? delta === 1
        ? 0
        : enabled.length - 1
      : (at + delta + enabled.length) % enabled.length;
  model.highlight(enabled[next]!.value);
}

/**
 * Resolves the selection-or-first active value — the open landing highlights
 * the selected enabled option when one exists, else the first enabled option.
 * @internal
 * @param model The listbox behavior model.
 * @returns The landing value, or undefined when no enabled option exists.
 */
export function selectionActive(model: ListboxModel): string | undefined {
  const enabled = enabledOptions(model.options());
  const selected = enabled.find((option) => model.isSelected(option.value));
  return selected !== undefined ? selected.value : enabled[0]?.value;
}

/**
 * Shapes the registered options for `menuTypeahead`'s text matching: every
 * option with a resolved node becomes a `{ node, text }` entry.
 * @internal
 * @param model The listbox behavior model.
 * @returns The typeahead entries in registration order.
 */
export function typeaheadEntries(model: ListboxModel): { node: HTMLElement; text: string }[] {
  const entries: { node: HTMLElement; text: string }[] = [];
  const options = model.options();
  let i = 0;
  const len = options.length;
  while (i < len) {
    const option = options[i++]!;
    if (option.node) entries.push({ node: option.node, text: option.text });
  }
  return entries;
}

/**
 * The listbox keyboard model shared by every content-hosted list surface:
 * Tab closes, Enter/Space activate the current option, ArrowDown/ArrowUp
 * rove with wrap, Home/End jump to the ends. Arrows only act on the model's
 * active resolution (a focused option for DOM-order registration); keys
 * outside the model fall through untouched.
 * @internal
 * @param model The listbox behavior model.
 * @returns The keydown listener to attach to the listbox container.
 */
export function listboxKeydown(model: ListboxModel): (event: Event) => void {
  return (event: Event) => {
    const e = event as KeyboardEvent;
    if (e.key === "Tab") {
      model.close();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      const current = model.active();
      if (current === undefined) return;
      e.preventDefault();
      model.commit(current);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    const enabled = enabledOptions(model.options());
    if (enabled.length === 0) return;
    e.preventDefault();
    if (e.key === "Home") {
      model.highlight(enabled[0]!.value);
      return;
    }
    if (e.key === "End") {
      model.highlight(enabled[enabled.length - 1]!.value);
      return;
    }
    moveActive(model, e.key === "ArrowDown" ? 1 : -1);
  };
}
