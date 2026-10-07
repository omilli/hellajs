import { effect, signal } from "@hellajs/core";
import { onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

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

interface RankedItem {
  item: CommandItemData;
  score: number;
}

const boundaryStart = (haystack: string, at: number): boolean =>
  at === 0 || " -_/.(".includes(haystack.charAt(at - 1));

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

interface CommandInputProps {
  value?: string | (() => string);
  placeholder?: string;
  onInput?: (value: string) => void;
  onKeydown?: (e: KeyboardEvent) => void;
  class?: string;
}

export function CommandInput(props: CommandInputProps): JSX.Element {
  return (
    <div
      data-slot="command-input-wrapper"
      class={
        cn("flex h-9 items-center gap-2 border-b px-3", props.class)
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
          cn("size-4 shrink-0 opacity-50")
        }
      >
        <path d="m21 21-4.34-4.34" />
        <circle cx="11" cy="11" r="8" />
      </svg>
      <input
        type="text"
        data-slot="command-input"
        value={props.value}
        placeholder={props.placeholder}
        autocomplete="off"
        spellcheck="false"
        class={
          cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50")
        }
        on:input={(e) => props.onInput?.((e.target as HTMLInputElement).value)}
        on:keydown={(e) => props.onKeydown?.(e as KeyboardEvent)}
      />
    </div>
  );
}

interface CommandListProps {
  /** Reactive items body; a thunk so the composed root's re-ranked list re-renders through the slot. */
  body?: () => HellaChild | HellaChild[];
  children?: HellaChildren;
  class?: string;
}

export function CommandList(props: CommandListProps): JSX.Element {
  return (
    <div
      role="listbox"
      data-slot="command-list"
      aria-label="Suggestions"
      class={
        cn("max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto", props.class)
      }
    >
      {() => props.body?.()}
      {props.children}
    </div>
  );
}

interface CommandEmptyProps {
  children?: HellaChildren;
  class?: string;
}

export function CommandEmpty(props: CommandEmptyProps): JSX.Element {
  return (
    <div
      data-slot="command-empty"
      class={
        cn("py-6 text-center text-sm", props.class)
      }
    >
      {props.children}
    </div>
  );
}

interface CommandGroupProps {
  heading?: string;
  hidden?: boolean | (() => boolean);
  children?: HellaChildren;
  class?: string;
}

export function CommandGroup(props: CommandGroupProps): JSX.Element {
  const isHidden = (): boolean =>
    typeof props.hidden === "function" ? props.hidden() : props.hidden ?? false;
  return (
    <div
      data-slot="command-group"
      hidden={isHidden}
      class={
        cn("overflow-hidden p-1 text-foreground [&_[data-slot='command-group-heading']]:px-2 [&_[data-slot='command-group-heading']]:py-1.5 [&_[data-slot='command-group-heading']]:text-xs [&_[data-slot='command-group-heading']]:font-medium [&_[data-slot='command-group-heading']]:text-muted-foreground", props.class)
      }
    >
      {props.heading !== undefined && (
        <div
          data-slot="command-group-heading"
          class={
            cn("px-2 py-1.5 text-xs font-medium text-muted-foreground")
          }
        >
          {props.heading}
        </div>
      )}
      {props.children}
    </div>
  );
}

interface CommandSeparatorProps {
  class?: string;
}

export function CommandSeparator(props: CommandSeparatorProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="command-separator"
      class={
        cn("-mx-1 h-px bg-border", props.class)
      }
    />
  );
}

interface CommandItemProps {
  value?: string;
  disabled?: boolean;
  /** Selected state (the ref's data-selected accent); an accessor follows the owning command's active item. */
  active?: () => boolean;
  /** Called on click and on Enter when the owning command commits. */
  onSelect?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function CommandItem(props: CommandItemProps): JSX.Element {
  return (
    <div
      role="option"
      data-slot="command-item"
      data-value={props.value}
      aria-selected={() => (props.active?.() ? "true" : "false")}
      aria-disabled={props.disabled ? "true" : undefined}
      data-selected={() => (props.active?.() ? "true" : undefined)}
      data-disabled={props.disabled ? "true" : undefined}
      class={
        cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", props.class)
      }
      on:click={() => {
        if (props.disabled) return;
        props.onSelect?.();
      }}
    >
      {props.children}
    </div>
  );
}

interface CommandShortcutProps {
  children?: HellaChildren;
  class?: string;
}

export function CommandShortcut(props: CommandShortcutProps): JSX.Element {
  return (
    <span
      data-slot="command-shortcut"
      class={
        cn("ml-auto text-xs tracking-widest text-muted-foreground", props.class)
      }
    >
      {props.children}
    </span>
  );
}

interface CommandProps {
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

interface CommandDialogProps {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: HellaChildren;
}

let commandDialogCount = 0;

/**
 * The palette dialog: the composed Dialog surface (overlay, panel, focus trap,
 * escape and outside dismissal) duplicated inline under this entry - registry
 * entries never cross-import - with the command palette scoping on its root.
 * Manual parts compose inside through children.
 */
export function CommandDialog(props: CommandDialogProps): JSX.Element {
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
    if (panel === undefined || wirings.length > 0 || props.open() === false) return;
    const target = panel;
    wirings.push(onEscape(target, props.onClose));
    wirings.push(onOutside(() => [target], props.onClose));
    wirings.push(trapFocus(target));
  };

  // Flip to open renders immediately; flip to closed starts the exit - the
  // panel stays mounted under data-state="closed" until its animationend
  // (or the copied 200ms duration budget) unmounts it. The exit runs
  // unwired: closing tears the trap/escape/outside handlers down
  // immediately; reopening re-arms them without a remount.
  effect(() => {
    if (props.open()) {
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

  const state = (): "open" | "closed" => (props.open() ? "open" : "closed");

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <div
            data-slot="dialog-overlay"
            data-state={state()}
            class={
              cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0")
            }
          />
          <div
            data-slot="dialog-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={props.description === undefined ? undefined : descriptionId}
            data-state={state()}
            class={
              cn("fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-0 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg overflow-hidden")
            }
            hook:afterMount={(node) => {
              if (!(node instanceof HTMLElement)) return;
              panel = node;
              installWirings();
              const onAnimationEnd = (): void => {
                if (props.open() === false) finishExit();
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
          >
            <div
              data-slot="dialog-header"
              class={
                cn("sr-only")
              }
            >
              {props.title !== undefined && (
                <h2
                  id={titleId}
                  data-slot="dialog-title"
                  class={
                    cn("text-lg leading-none font-semibold")
                  }
                >
                  {props.title}
                </h2>
              )}
              {props.description !== undefined && (
                <p
                  id={descriptionId}
                  data-slot="dialog-description"
                  class={
                    cn("text-sm text-muted-foreground")
                  }
                >
                  {props.description}
                </p>
              )}
            </div>
            <button
              type="button"
              data-slot="dialog-close"
              data-state={state()}
              class={
                cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4")
              }
              on:click={() => props.onClose()}
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
                cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", "[&_[data-slot='command-input-wrapper']]:h-12 [&_[data-slot='command-group-heading']]:px-2 [&_[data-slot='command-group-heading']]:font-medium [&_[data-slot='command-group-heading']]:text-muted-foreground [&_[data-slot='command-group']]:px-2 [&_[data-slot='command-group']:not([hidden])~[data-slot='command-group']]:pt-0 [&_[data-slot='command-input-wrapper']_svg]:h-5 [&_[data-slot='command-input-wrapper']_svg]:w-5 [&_[data-slot='command-input']]:h-12 [&_[data-slot='command-item']]:px-2 [&_[data-slot='command-item']]:py-3 [&_[data-slot='command-item']_svg]:h-5 [&_[data-slot='command-item']_svg]:w-5")
              }
            >
              {props.children}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

export default function Command(props: CommandProps): JSX.Element {
  const items = props.items ?? [];
  const query = signal("");
  const activeIndex = signal(0);
  let rootNode: HTMLElement | undefined;
  let previous: string | undefined;

  const ranked = (): CommandItemData[] =>
    (props.filter ?? defaultFilter)(items, query());

  // The active value: the controlled accessor when given, the internal
  // cursor resolved against the ranked list otherwise.
  const activeValue = (): string | undefined => {
    if (props.value !== undefined) return props.value();
    return ranked()[activeIndex()]?.value;
  };

  const select = (next: number): void => {
    const entry = ranked()[next];
    if (entry === undefined) return;
    if (props.value !== undefined) props.onValueChange?.(entry.value);
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
      if (props.loop) next = (next + delta + len) % len;
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
    if (props.value !== undefined) {
      let i = edge === "first" ? 0 : rankedList.length - 1;
      while (i >= 0 && i < rankedList.length) {
        if (!rankedList[i]!.disabled) {
          props.onValueChange?.(rankedList[i]!.value);
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
    props.onValueChange?.(entry.value);
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
    props.onValueChange?.(entry.value);
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
        cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", props.class)
      }
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) rootNode = node;
      }}
      hook:beforeDestroy={() => {
        rootNode = undefined;
      }}
    >
      <CommandInput
        value={query}
        onInput={(v) => {
          query(v);
          if (props.value === undefined) activeIndex(0);
        }}
        onKeydown={onKeydown}
      />
      <CommandList body={renderBody} />
      {props.children}
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
