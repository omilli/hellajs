import { effect, signal } from "@hellajs/core";
import { onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const dialogClose: string;
declare const dialogDescription: string;
declare const dialogHeader: string;
declare const dialogOverlay: string;
declare const dialogPanel: string;
declare const dialogTitle: string;
declare const empty: string;
declare const group: string;
declare const groupHeading: string;
declare const icon: string;
declare const input: string;
declare const inputWrapper: string;
declare const item: string;
declare const list: string;
declare const palette: string;
declare const separator: string;
declare const shortcut: string;
// @hella:end

export interface CommandItemData {
  value: string;
  label: string;
  group?: string;
  keywords?: string[];
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

const MATCH_BASE = 1000;
const BOUNDARY_BONUS = 500;
const KEYWORD_BONUS = 100;
const BOUNDARY_CHARS = " -_/.(";

interface RankedItem {
  item: CommandItemData;
  score: number;
}

const boundaryStart = (haystack: string, at: number): boolean =>
  at === 0 || BOUNDARY_CHARS.includes(haystack.charAt(at - 1));

const scoreCandidate = (haystack: string, needle: string): number => {
  const at = haystack.indexOf(needle);
  if (at === -1) return 0;
  return MATCH_BASE - at + (boundaryStart(haystack, at) ? BOUNDARY_BONUS : 0);
};

const scoreItem = (candidate: CommandItemData, needle: string): number => {
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
const defaultFilter = (items: CommandItemData[], query: string): CommandItemData[] => {
  if (query === "") return items;
  const needle = query.toLowerCase();
  const ranked: RankedItem[] = [];
  let i = 0;
  while (i < items.length) {
    const score = scoreItem(items[i]!, needle);
    if (score > 0) ranked.push({ item: items[i]!, score });
    i++;
  }
  return ranked.sort((a, b) => b.score - a.score).map((entry) => entry.item);
};

interface CommandInputProps extends HTMLAttributes<"input"> {
  class?: string;
}

export function CommandInput({ class: cls, ...attrs }: CommandInputProps): JSX.Element {
  return (
    <div
      data-slot="command-input-wrapper"
      class={
        // @hella:compose
        [inputWrapper, cls]
        // @hella:end
      }
    >
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
        <path d="m21 21-4.34-4.34" />
        <circle cx="11" cy="11" r="8" />
      </svg>
      <input
        type="text"
        data-slot="command-input"
        autocomplete="off"
        spellcheck="false"
        class={
          // @hella:compose
          [input]
          // @hella:end
        }
        {...attrs}
      />
    </div>
  );
}

interface CommandListProps extends HTMLAttributes<"div"> {
  /** Reactive items body; a thunk so the composed root's re-ranked list re-renders through the slot. */
  body?: () => HellaChild | HellaChild[];
  children?: HellaChildren;
  class?: string;
}

export function CommandList({ body, children, class: cls, ...attrs }: CommandListProps): JSX.Element {
  return (
    <div
      role="listbox"
      data-slot="command-list"
      aria-label="Suggestions"
      class={
        // @hella:compose
        [list, cls]
        // @hella:end
      }
      {...attrs}
    >
      {() => body?.()}
      {children}
    </div>
  );
}

interface CommandEmptyProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function CommandEmpty({ children, class: cls, ...attrs }: CommandEmptyProps): JSX.Element {
  return (
    <div
      data-slot="command-empty"
      class={
        // @hella:compose
        [empty, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface CommandGroupProps extends HTMLAttributes<"div"> {
  heading?: string;
  hidden?: boolean | (() => boolean);
  children?: HellaChildren;
  class?: string;
}

export function CommandGroup({ heading, hidden, children, class: cls, ...attrs }: CommandGroupProps): JSX.Element {
  const isHidden = (): boolean =>
    typeof hidden === "function" ? hidden() : hidden ?? false;
  return (
    <div
      data-slot="command-group"
      hidden={isHidden}
      class={
        // @hella:compose
        [group, cls]
        // @hella:end
      }
      {...attrs}
    >
      {heading !== undefined && (
        <div
          data-slot="command-group-heading"
          class={
            // @hella:compose
            [groupHeading]
            // @hella:end
          }
        >
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

interface CommandSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

export function CommandSeparator({ class: cls, ...attrs }: CommandSeparatorProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="command-separator"
      class={
        // @hella:compose
        [separator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

interface CommandItemProps extends HTMLAttributes<"div"> {
  value?: string;
  /** Selected state (the ref's data-selected accent); an accessor follows the owning command's active item. */
  active?: () => boolean;
  /** Called on click and on Enter when the owning command commits. */
  onSelect?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function CommandItem({ value, disabled, active, onSelect, "on:click": userClick, children, class: cls, ...attrs }: CommandItemProps): JSX.Element {
  return (
    <div
      role="option"
      data-slot="command-item"
      data-value={value}
      aria-selected={() => (active?.() ? "true" : "false")}
      aria-disabled={disabled ? "true" : undefined}
      data-selected={() => (active?.() ? "true" : undefined)}
      data-disabled={disabled ? "true" : undefined}
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
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
}

interface CommandShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export function CommandShortcut({ children, class: cls, ...attrs }: CommandShortcutProps): JSX.Element {
  return (
    <span
      data-slot="command-shortcut"
      class={
        // @hella:compose
        [shortcut, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface CommandProps extends HTMLAttributes<"div"> {
  items?: CommandItemData[];
  /** Replaces the default scoring filter (earlier matches, word-boundary starts, keyword hits). */
  filter?: (items: CommandItemData[], query: string) => CommandItemData[];
  /** Wraps arrow movement at the edges; the default clamps. */
  loop?: boolean;
  /** Controlled active value. When given, the root never writes its internal cursor and onValueChange reports each requested move and selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
  /** Extra chrome rendered below the auto-rendered list (footer hints, custom rows). */
  children?: HellaChildren;
}

interface CommandDialogProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  class?: string;
  children?: HellaChildren;
}

let commandDialogCount = 0;

/**
 * The palette dialog: the composed Dialog surface (overlay, panel, focus trap,
 * escape and outside dismissal) duplicated inline under this entry - registry
 * entries never cross-import - with the command palette scoping on its root.
 * Manual parts compose inside through children.
 */
export function CommandDialog({ open, onClose, title: titleText, description: descriptionText, children, class: cls, ...attrs }: CommandDialogProps): JSX.Element {
  const titleId = `hella-command-dialog-title-${++commandDialogCount}`;
  const descriptionId = `hella-command-dialog-description-${commandDialogCount}`;
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading open() in the template
  // would flash the subtree away one evaluation early).
  const visible = signal(false);
  let wasOpen = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  let panel: HTMLElement | undefined;

  const finishExit = (): void => {
    if (fallback !== undefined) {
      clearTimeout(fallback);
      fallback = undefined;
    }
    visible(false);
  };

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  const installWirings = (): void => {
    if (panel === undefined || wirings.length > 0 || open() === false) return;
    const target = panel;
    wirings.push(onEscape(target, onClose));
    wirings.push(onOutside(() => [target], onClose));
    wirings.push(trapFocus(target));
  };

  // Flip to open renders immediately; flip to closed starts the exit - the
  // panel stays mounted under data-state="closed" until its animationend
  // (or the copied 200ms duration budget) unmounts it. The exit runs
  // unwired: closing tears the trap/escape/outside handlers down
  // immediately; reopening re-arms them without a remount.
  effect(() => {
    if (open()) {
      wasOpen = true;
      finishExit();
      visible(true);
      installWirings();
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      disposeWirings();
      fallback = setTimeout(finishExit, 250);
    }
  });

  const state = (): "open" | "closed" => (open() ? "open" : "closed");

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <div
            data-slot="dialog-overlay"
            data-state={state()}
            class={
              // @hella:compose
              [dialogOverlay]
              // @hella:end
            }
          />
          <div
            data-slot="dialog-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionText === undefined ? undefined : descriptionId}
            data-state={state()}
            class={
              // @hella:compose
              [dialogPanel, cls]
              // @hella:end
            }
            hook:afterMount={(node) => {
              if (!(node instanceof HTMLElement)) return;
              panel = node;
              installWirings();
              const onAnimationEnd = (): void => {
                if (open() === false) finishExit();
              };
              node.addEventListener("animationend", onAnimationEnd);
              teardown.push(() => {
                node.removeEventListener("animationend", onAnimationEnd);
                panel = undefined;
              });
            }}
            hook:beforeDestroy={() => {
              disposeWirings();
              while (teardown.length) teardown.pop()!();
            }}
            {...attrs}
          >
            <div
              data-slot="dialog-header"
              class={
                // @hella:compose
                [dialogHeader]
                // @hella:end
              }
            >
              {titleText !== undefined && (
                <h2
                  id={titleId}
                  data-slot="dialog-title"
                  class={
                    // @hella:compose
                    [dialogTitle]
                    // @hella:end
                  }
                >
                  {titleText}
                </h2>
              )}
              {descriptionText !== undefined && (
                <p
                  id={descriptionId}
                  data-slot="dialog-description"
                  class={
                    // @hella:compose
                    [dialogDescription]
                    // @hella:end
                  }
                >
                  {descriptionText}
                </p>
              )}
            </div>
            <button
              type="button"
              data-slot="dialog-close"
              data-state={state()}
              class={
                // @hella:compose
                [dialogClose]
                // @hella:end
              }
              on:click={() => onClose()}
            >
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
              <span class="sr-only">Close</span>
            </button>
            <div
              data-slot="command"
              class={
                // @hella:compose
                [base, palette]
                // @hella:end
              }
            >
              {children}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

export default function Command({ items: itemsProp, filter, loop, value, onValueChange, children, class: cls, ...attrs }: CommandProps): JSX.Element {
  const items = itemsProp ?? [];
  const query = signal("");
  const activeIndex = signal(0);
  let rootNode: HTMLElement | undefined;
  let previous: string | undefined;

  const ranked = (): CommandItemData[] =>
    (filter ?? defaultFilter)(items, query());

  // The active value: the controlled accessor when given, the internal
  // cursor resolved against the ranked list otherwise.
  const activeValue = (): string | undefined => {
    if (value !== undefined) return value();
    return ranked()[activeIndex()]?.value;
  };

  const select = (next: number): void => {
    const entry = ranked()[next];
    if (entry === undefined) return;
    if (value !== undefined) onValueChange?.(entry.value);
    else activeIndex(next);
  };

  const step = (delta: number): void => {
    const rankedList = ranked();
    const len = rankedList.length;
    if (len === 0) return;
    const current = activeValue();
    let at = current === undefined ? -1 : rankedList.findIndex((entry) => entry.value === current);
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
      if (!rankedList[next]!.disabled) {
        select(next);
        return;
      }
    }
  };

  const jump = (edge: "first" | "last"): void => {
    const rankedList = ranked();
    if (value !== undefined) {
      let i = edge === "first" ? 0 : rankedList.length - 1;
      while (i >= 0 && i < rankedList.length) {
        if (!rankedList[i]!.disabled) {
          onValueChange?.(rankedList[i]!.value);
          return;
        }
        i = edge === "first" ? i + 1 : i - 1;
      }
      return;
    }
    let i = edge === "first" ? 0 : rankedList.length - 1;
    while (i >= 0 && i < rankedList.length) {
      if (!rankedList[i]!.disabled) {
        activeIndex(i);
        return;
      }
      i = edge === "first" ? i + 1 : i - 1;
    }
  };

  const commit = (): void => {
    const current = activeValue();
    const entry = ranked().find((candidate) => candidate.value === current);
    if (entry === undefined || entry.disabled) return;
    entry.onSelect?.();
    onValueChange?.(entry.value);
  };

  const onKeydown = (e: KeyboardEvent): void => {
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
  effect(() => {
    const current = activeValue();
    if (current === previous || rootNode === undefined) return;
    previous = current;
    if (current === undefined) return;
    const nodes = rootNode.querySelectorAll("[data-slot='command-item']");
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

  const commitItem = (entry: CommandItemData): void => {
    entry.onSelect?.();
    onValueChange?.(entry.value);
  };

  const renderItem = (entry: CommandItemData): JSX.Element => (
    <CommandItem
      value={entry.value}
      disabled={entry.disabled}
      active={() => activeValue() === entry.value}
      onSelect={() => commitItem(entry)}
    >
      {entry.label}
      {entry.shortcut !== undefined && <CommandShortcut>{entry.shortcut}</CommandShortcut>}
    </CommandItem>
  );

  const renderBody = (): HellaChild | HellaChild[] => {
    const rankedList = ranked();
    if (rankedList.length === 0) return <CommandEmpty>No results found.</CommandEmpty>;
    const nodes: HellaChild[] = [];
    const groups = orderedGroups(items);
    let g = 0;
    const gLen = groups.length;
    while (g < gLen) {
      const key = groups[g]!;
      const members = rankedList.filter((entry) => (entry.group ?? "") === key);
      if (key === "") {
        nodes.push(...members.map((entry) => renderItem(entry)));
      } else {
        nodes.push(
          <CommandGroup heading={key} hidden={members.length === 0}>
            {members.map((entry) => renderItem(entry))}
          </CommandGroup>,
        );
      }
      g++;
    }
    return nodes;
  };

  return (
    <div
      data-slot="command"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) rootNode = node;
      }}
      hook:beforeDestroy={() => {
        rootNode = undefined;
      }}
      {...attrs}
    >
      <CommandInput
        value={query}
        on:input={(e) => {
          query((e.target as HTMLInputElement).value);
          if (value === undefined) activeIndex(0);
        }}
        on:keydown={onKeydown}
      />
      <CommandList body={renderBody} />
      {children}
    </div>
  );
}

/** Group keys in first-appearance order over the original items; "" holds the ungrouped items. */
function orderedGroups(items: CommandItemData[]): string[] {
  const keys: string[] = [];
  let i = 0;
  while (i < items.length) {
    const key = items[i]!.group ?? "";
    if (!keys.includes(key)) keys.push(key);
    i++;
  }
  return keys;
}

export { Command };
