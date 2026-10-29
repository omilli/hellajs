import { effect, isFunction, signal } from "@hellajs/core";
import { Portal } from "@hellajs/dom";
import type { HellaChild } from "@hellajs/dom";
import { modal } from "./modal";
import { domOptions, optionIdOf } from "./internal/listbox";
import type {
  CommandDialogProps,
  CommandEmptyProps,
  CommandEntry,
  CommandGroupProps,
  CommandInputProps,
  CommandItemProps,
  CommandListProps,
  CommandOptions,
  CommandParts,
  CommandSeparatorProps,
  CommandShortcutProps,
} from "./types/parts";

const MATCH_BASE = 1000;
const BOUNDARY_BONUS = 500;
const KEYWORD_BONUS = 100;
const BOUNDARY_CHARS = " -_/.(";

const boundaryStart = (haystack: string, at: number): boolean =>
  at === 0 || BOUNDARY_CHARS.includes(haystack.charAt(at - 1));

const scoreCandidate = (haystack: string, needle: string): number => {
  const at = haystack.indexOf(needle);
  if (at === -1) return 0;
  return MATCH_BASE - at + (boundaryStart(haystack, at) ? BOUNDARY_BONUS : 0);
};

const scoreItem = (candidate: CommandEntry, needle: string): number => {
  let best = Math.max(
    scoreCandidate(candidate.label.toLowerCase(), needle),
    scoreCandidate(candidate.value.toLowerCase(), needle),
  );
  let hits = 0;
  const keywords = candidate.keywords ?? [];
  let i = 0;
  while (i < keywords.length) {
    const score = scoreCandidate(keywords[i]!.toLowerCase(), needle);
    if (score > 0) {
      hits++;
      if (score > best) best = score;
    }
    i++;
  }
  if (best === 0) return 0;
  return best + hits * KEYWORD_BONUS;
};

/** Ranks items for the query: earlier matches, word-boundary starts, and keyword hits score higher; zero scores drop out. */
const defaultFilter = (items: CommandEntry[], query: string): CommandEntry[] => {
  if (query === "") return items;
  const needle = query.toLowerCase();
  const ranked: { item: CommandEntry; score: number }[] = [];
  let i = 0;
  while (i < items.length) {
    const score = scoreItem(items[i]!, needle);
    if (score > 0) ranked.push({ item: items[i]!, score });
    i++;
  }
  return ranked.sort((a, b) => b.score - a.score).map((entry) => entry.item);
};

/** The search icon (refs/icons/search.svg), created per call so reactive swaps never share nodes between clones. */
const searchIcon = (): JSX.Element => (
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
  >
    <path d="m21 21-4.34-4.34" />
    <circle cx="11" cy="11" r="8" />
  </svg>
);

/** The close icon (refs/icons/x.svg), created per call so reactive swaps never share nodes between clones. */
const closeIcon = (): JSX.Element => (
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
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

/** Group keys in first-appearance order over the original items; "" holds the ungrouped items. */
function orderedGroups(items: CommandEntry[]): string[] {
  const keys: string[] = [];
  let i = 0;
  while (i < items.length) {
    const key = items[i]!.group ?? "";
    if (!keys.includes(key)) keys.push(key);
    i++;
  }
  return keys;
}

let commandCount = 0;
let commandDialogCount = 0;

/**
 * Creates the command part set: the `Input` search row (query signal + keyboard
 * model), the `List` ranked body, the `Item`/`Group`/`Empty`/`Separator`/
 * `Shortcut` rows, and the `Dialog` palette composition riding `modal()`. With
 * `items` the factory registers the ranked entries data-driven (stable
 * value-derived option ids, `List` re-rendering the ranked order per query);
 * without `items` it registers the rendered `Item` children in DOM order (the
 * listbox engine's DOM scan) and the ranked filter hides non-matches in place.
 * The closure owns the query, the active-by-value cursor (controlled through a
 * `value` getter when passed), the commit registration, and the scroll-follow.
 * Call in component scope so the state machinery's effects dispose with the
 * component.
 *
 * ```tsx
 * const Command = command({ filter });
 *
 * <Command.Input placeholder="Type a command…" />
 * <Command.List>
 *   <Command.Group heading="Suggestions">
 *     <Command.Item value="calendar" onSelect={runCalendar}>
 *       Calendar <Command.Shortcut>⌘C</Command.Shortcut>
 *     </Command.Item>
 *   </Command.Group>
 *   <Command.Empty>No results.</Command.Empty>
 * </Command.List>
 * ```
 * @param options `items` (array or getter) switching the registration shape, an optional `filter` replacing the default ranking, `loop`, and controlled-or-internal `value` + `onValueChange`.
 * @returns The part set, composed as `Command.Input`-style members.
 */
export function command(options: CommandOptions = {}): CommandParts {
  const listId = `hella-command-list-${++commandCount}`;
  const dataMode = options.items !== undefined;
  const loop = options.loop ?? false;
  const value = options.value;
  const query = signal("");
  const internal = signal<string | undefined>(undefined);
  // Bumped when the DOM-order roster may have changed (list mount, query-driven
  // re-render) so the landing resolution re-reads through tracked reactive
  // accessors; imperative reads always scan fresh.
  const landingTick = signal(0);
  let listNode: HTMLElement | undefined;
  // Value-keyed commit registry, populated when the parts render (not on DOM
  // mount: afterMount never fires for nodes a region re-render inserts). The
  // commit reads it only through the roster gate, so an entry for a value no
  // longer rendered is unreachable; the next render of that value replaces it.
  const rendered = new Map<string, () => void>();

  const items = (): CommandEntry[] => {
    const source = options.items;
    if (source === undefined) return [];
    return isFunction(source) ? source() : source;
  };
  const ranked = (): CommandEntry[] => (options.filter ?? defaultFilter)(items(), query());

  /** The active resolution: the controlled accessor when given, else the internal cursor, else the landing value (the first ranked entry data-driven, the first enabled DOM option in DOM-order mode). */
  const activeValue = (): string | undefined => {
    if (value !== undefined) return value();
    const cursor = internal();
    if (cursor !== undefined) return cursor;
    landingTick();
    if (dataMode) return ranked()[0]?.value;
    return visibleDomOptions()[0]?.value;
  };

  /** The rendered options in DOM order, disabled and query-hidden entries dropped - the roving and landing surface in DOM-order mode. */
  const visibleDomOptions = () =>
    (listNode ? domOptions(listNode) : []).filter(
      (option) => option.node !== undefined && option.node.style.display !== "none",
    );

  /** The registered options in roving order: the ranked entries data-driven (nodes resolved by option id), the visible `Item` children in DOM order otherwise. */
  const roster = (): { value: string; disabled: boolean }[] => {
    if (dataMode) {
      return ranked().map((entry) => ({ value: entry.value, disabled: entry.disabled === true }));
    }
    return visibleDomOptions().map((option) => ({
      value: option.value,
      disabled: option.disabled,
    }));
  };

  /** The DOM-order entries exactly as rendered (disabled included) — the filter's input when `Item` children resolve their visibility. */
  const scanEntries = (): CommandEntry[] => {
    if (!listNode) return [];
    const found = listNode.querySelectorAll("[role='option']");
    const entries: CommandEntry[] = [];
    let i = 0;
    while (i < found.length) {
      const el = found[i] as HTMLElement;
      i++;
      entries.push({
        value: el.dataset.value ?? "",
        label: el.textContent ?? "",
        disabled: el.hasAttribute("data-disabled"),
      });
    }
    return entries;
  };

  /** Runs one item's commit: its own callback plus the value report. Click and Enter both land here exactly once. */
  const commitItem = (entry: CommandEntry): void => {
    entry.onSelect?.();
    options.onValueChange?.(entry.value);
  };

  const select = (next: number): void => {
    const entry = roster()[next];
    if (entry === undefined) return;
    if (value !== undefined) options.onValueChange?.(entry.value);
    else internal(entry.value);
  };

  const step = (delta: number): void => {
    const entries = roster();
    const len = entries.length;
    if (len === 0) return;
    const current = activeValue();
    let at = current === undefined ? -1 : entries.findIndex((entry) => entry.value === current);
    if (at === -1 && delta === -1) at = len;
    let hops = 0;
    let next = at;
    while (hops < len) {
      if (loop) next = (next + delta + len) % len;
      else {
        next = next + delta;
        if (next < 0 || next >= len) return;
      }
      hops++;
      if (!entries[next]!.disabled) {
        select(next);
        return;
      }
    }
  };

  const jump = (edge: "first" | "last"): void => {
    const entries = roster();
    let i = edge === "first" ? 0 : entries.length - 1;
    while (i >= 0 && i < entries.length) {
      if (!entries[i]!.disabled) {
        select(i);
        return;
      }
      i = edge === "first" ? i + 1 : i - 1;
    }
  };

  const commit = (): void => {
    const current = activeValue();
    const entry = roster().find((candidate) => candidate.value === current);
    if (entry === undefined || entry.disabled) return;
    rendered.get(entry.value)?.();
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      if (query() !== "") {
        e.stopPropagation();
        query("");
        if (value === undefined) internal(undefined);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      jump("first");
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      jump("last");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  // The active item scrolls to the visible edge of the list whenever the
  // cursor lands on a new value.
  let previous: string | undefined;
  effect(() => {
    const current = activeValue();
    if (current === previous || listNode === undefined) return;
    previous = current;
    if (current === undefined) return;
    const nodes = listNode.querySelectorAll("[data-slot='command-item']");
    let i = 0;
    while (i < nodes.length) {
      const el = nodes[i] as HTMLElement;
      if (el.getAttribute("data-value") === current) {
        el.scrollIntoView?.({ block: "nearest" });
        return;
      }
      i++;
    }
  });

  const Input = (props: CommandInputProps = {}): JSX.Element => {
    const {
      children,
      class: cls,
      "on:input": userInput,
      "on:keydown": userKeydown,
      ...attrs
    } = props;
    return (
      <div data-slot="command-input-wrapper" class={cls}>
        {searchIcon()}
        <input
          type="text"
          data-slot="command-input"
          autocomplete="off"
          spellcheck="false"
          value={query}
          on:input={function (this: HTMLElement, e: InputEvent) {
            userInput?.call(this, e);
            query((e.target as HTMLInputElement).value);
            if (value === undefined) {
              internal(undefined);
              landingTick(landingTick() + 1);
            }
          }}
          on:keydown={function (this: HTMLElement, e: KeyboardEvent) {
            userKeydown?.call(this, e);
            onKeydown(e);
          }}
          {...attrs}
        />
        {children}
      </div>
    );
  };

  const renderItem = (entry: CommandEntry): JSX.Element => {
    rendered.set(entry.value, () => commitItem(entry));
    return (
      <Item
        id={optionIdOf(listId, entry.value)}
        value={entry.value}
        disabled={entry.disabled}
        active={() => activeValue() === entry.value}
        onSelect={() => rendered.get(entry.value)?.()}
      >
        {entry.label}
        {entry.shortcut !== undefined && <Shortcut>{entry.shortcut}</Shortcut>}
      </Item>
    );
  };

  const renderBody = (): HellaChild | HellaChild[] => {
    const rankedList = ranked();
    if (rankedList.length === 0) return <Empty>No results found.</Empty>;
    const nodes: HellaChild[] = [];
    const groups = orderedGroups(items());
    let g = 0;
    const gLen = groups.length;
    while (g < gLen) {
      const key = groups[g]!;
      const members = rankedList.filter((entry) => (entry.group ?? "") === key);
      if (key === "") {
        nodes.push(...members.map((entry) => renderItem(entry)));
      } else {
        nodes.push(
          <Group heading={key} hidden={members.length === 0}>
            {members.map((entry) => renderItem(entry))}
          </Group>,
        );
      }
      g++;
    }
    return nodes;
  };

  const List = (props: CommandListProps = {}): JSX.Element => {
    const { children, class: cls, id, ...attrs } = props;
    return (
      <div
        role="listbox"
        aria-label="Suggestions"
        id={id ?? listId}
        data-slot="command-list"
        class={cls}
        hook:afterMount={(node) => {
          if (node instanceof HTMLElement) {
            listNode = node;
            landingTick(landingTick() + 1);
          }
        }}
        hook:beforeDestroy={() => {
          listNode = undefined;
        }}
        {...attrs}
      >
        {() => (dataMode ? renderBody() : null)}
        {children}
      </div>
    );
  };

  const Empty = (props: CommandEmptyProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="command-empty" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Group = (props: CommandGroupProps = {}): JSX.Element => {
    const { heading, hidden, children, class: cls, ...attrs } = props;
    const isHidden = (): boolean => (isFunction(hidden) ? hidden() : (hidden ?? false));
    return (
      <div data-slot="command-group" hidden={isHidden} class={cls} {...attrs}>
        {heading !== undefined && <div data-slot="command-group-heading">{heading}</div>}
        {children}
      </div>
    );
  };

  const Separator = (props: CommandSeparatorProps = {}): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return <div role="separator" data-slot="command-separator" class={cls} {...attrs} />;
  };

  const Item = (props: CommandItemProps = {}): JSX.Element => {
    const {
      children,
      class: cls,
      value: itemValue,
      id: idProp,
      disabled,
      active: activeProp,
      onSelect,
      "on:click": userClick,
      ...attrs
    } = props;
    const active = (): boolean =>
      isFunction(activeProp)
        ? activeProp()
        : itemValue !== undefined && activeValue() === itemValue;
    if (!dataMode && itemValue !== undefined && onSelect !== undefined) {
      rendered.set(itemValue, onSelect);
    }
    // DOM-order mode only: the ranked filter resolves visibility against the
    // rendered rows (data mode re-renders the ranked order instead).
    const filtered = (): boolean => {
      if (dataMode || query() === "" || itemValue === undefined) return false;
      return !(options.filter ?? defaultFilter)(scanEntries(), query()).some(
        (entry) => entry.value === itemValue,
      );
    };
    // Precomputed so the style prop stays a bare reactive accessor (a compound
    // attribute expression would stringify through the transform).
    const hiddenStyle = (): string => (filtered() ? "display: none" : "");
    return (
      <div
        role="option"
        id={idProp ?? (itemValue !== undefined ? optionIdOf(listId, itemValue) : undefined)}
        data-slot="command-item"
        data-value={itemValue}
        aria-selected={() => (active() ? "true" : "false")}
        aria-disabled={disabled ? "true" : undefined}
        data-selected={() => (active() ? "true" : undefined)}
        data-disabled={disabled ? "true" : undefined}
        style={dataMode ? undefined : hiddenStyle}
        class={cls}
        on:click={function (e) {
          if (disabled) return;
          userClick?.call(this, e);
          onSelect?.();
        }}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  const Shortcut = (props: CommandShortcutProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <span data-slot="command-shortcut" class={cls} {...attrs}>
        {children}
      </span>
    );
  };

  const Dialog = (props: CommandDialogProps): JSX.Element => {
    const {
      open,
      onClose,
      title: titleText,
      description: descriptionText,
      children,
      class: cls,
      ...attrs
    } = props;
    const titleId = `hella-command-dialog-title-${++commandDialogCount}`;
    const descriptionId = `hella-command-dialog-description-${commandDialogCount}`;
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
    // panel stays mounted under data-state="closed" until its animationend
    // (or the copied 250ms duration budget) unmounts it. The trap/escape/
    // outside wiring arms through modal() against the state getter, so
    // closing disarms it immediately and reopening re-arms without a remount.
    effect(() => {
      if (open()) {
        wasOpen = true;
        finishExit();
        visible(true);
      } else if (wasOpen) {
        wasOpen = false;
        visible(true);
        fallback = setTimeout(finishExit, 250);
      }
    });

    const state = (): "open" | "closed" => (open() ? "open" : "closed");

    return (
      <>
        {() =>
          visible() && (
            <Portal to="body">
              <div class={cls} data-slot="command-dialog-root">
                <div data-slot="dialog-overlay" data-state={state()} />
                <div
                  data-slot="dialog-content"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  aria-describedby={descriptionText === undefined ? undefined : descriptionId}
                  data-state={state()}
                  hook:afterMount={(node) => {
                    if (!(node instanceof HTMLElement)) return;
                    modal(node, { state, onClose, onExited: finishExit });
                  }}
                  {...attrs}
                >
                  <div data-slot="dialog-header">
                    {titleText !== undefined && (
                      <h2 id={titleId} data-slot="dialog-title">
                        {titleText}
                      </h2>
                    )}
                    {descriptionText !== undefined && (
                      <p id={descriptionId} data-slot="dialog-description">
                        {descriptionText}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    data-slot="dialog-close"
                    data-state={state()}
                    on:click={() => onClose()}
                  >
                    {closeIcon()}
                    <span>Close</span>
                  </button>
                  <div data-slot="command">{children}</div>
                </div>
              </div>
            </Portal>
          )
        }
      </>
    );
  };

  return {
    Input,
    List,
    Empty,
    Group,
    Separator,
    Item,
    Shortcut,
    Dialog,
  };
}
