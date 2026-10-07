import { effect, signal } from "@hellajs/core";
import { anchorPosition, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HellaChildren, Placement } from "@hellajs/dom";
import { cn } from "./cn.js";

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

const closeAllMenus = (): void => {
  document.dispatchEvent(new CustomEvent("hella:menu-select"));
};

interface MenuEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

/** Open/close state shared by the composed root and submenus: controlled override, exit-holding `visible` gate. */
function menuOpenState(props: { open?: () => boolean; onOpenChange?: (open: boolean) => void }) {
  const internal = signal(false);
  const isOpen = (): boolean => (props.open !== undefined ? props.open() : internal());
  const setOpen = (next: boolean): void => {
    if (props.open === undefined) internal(next);
    props.onOpenChange?.(next);
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

/** The menu's activatable items in DOM order, disabled entries excluded (roving, typeahead, and focus-first share this). */
const menuItems = (node: ParentNode): HTMLElement[] => {
  const found = node.querySelectorAll("[role^='menuitem']");
  const items: HTMLElement[] = [];
  let i = 0;
  while (i < found.length) {
    const el = found[i] as HTMLElement;
    if (!el.hasAttribute("data-disabled")) items.push(el);
    i++;
  }
  return items;
};

/** The same items shaped for `menuTypeahead`'s text matching. */
const menuEntries = (node: ParentNode): { node: HTMLElement; text: string }[] => {
  const items = menuItems(node);
  const entries: { node: HTMLElement; text: string }[] = [];
  let i = 0;
  while (i < items.length) {
    entries.push({ node: items[i]!, text: items[i]!.textContent ?? "" });
    i++;
  }
  return entries;
};

/** The content-owned keyboard model shared by content and sub-content: roving arrows with wrap, Home/End, Enter/Space activation, Tab close-all, and directional submenu entry that flips with the resolved writing direction. */
const menuKeyDown = (onArrowLeft?: () => void) => (node: HTMLElement) => (event: Event): void => {
  const e = event as KeyboardEvent;
  const items = menuItems(node);
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (e.key === "Tab") {
    closeAllMenus();
    return;
  }
  if (e.key === "Enter" || e.key === " ") {
    if (current === -1) return;
    e.preventDefault();
    items[current]!.dispatchEvent(new Event("click", { bubbles: true }));
    return;
  }
  const rtl = getComputedStyle(node).direction === "rtl";
  const enterKey = rtl ? "ArrowLeft" : "ArrowRight";
  const exitKey = rtl ? "ArrowRight" : "ArrowLeft";
  if (e.key === enterKey && current !== -1) {
    const el = items[current]!;
    if (el.getAttribute("aria-haspopup") === "menu") {
      e.preventDefault();
      el.dispatchEvent(new Event("click", { bubbles: true }));
    }
    return;
  }
  if (e.key === exitKey) {
    if (onArrowLeft) {
      e.preventDefault();
      onArrowLeft();
    }
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
  items[target]!.focus();
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
      cn("size-4")
    }
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** The circle icon (refs/icons/circle.svg), created per call so reactive swaps never share nodes between clones. */
const circleIcon = (): JSX.Element => (
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
      cn("size-2 fill-current")
    }
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

/** The chevron-right icon (refs/icons/chevron-right.svg), created per call so reactive swaps never share nodes between clones. */
const chevronIcon = (): JSX.Element => (
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
      cn("ml-auto")
    }
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

interface ContextMenuTriggerProps {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger zone; the composed ContextMenu renders the same shape wired to the `contextmenu` listener. */
export function ContextMenuTrigger(props: ContextMenuTriggerProps): JSX.Element {
  return (
    <span
      data-slot="context-menu-trigger"
      class={
        cn(props.class)
      }
    >
      {props.children}
    </span>
  );
}

interface ContextMenuContentProps {
  state?: () => "open" | "closed";
  id?: string;
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback, and item selection closes every open layer. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  /** ArrowLeft closes the menu when provided (submenu exit; a top-level menu stays inert). */
  onArrowLeft?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function ContextMenuContent(props: ContextMenuContentProps): JSX.Element {
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
      role="menu"
      tabindex="-1"
      id={props.id}
      data-slot="context-menu-content"
      data-state={state()}
      data-side={side}
      data-align={align}
      class={
        cn("z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", props.class)
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = props.anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align) }));
        if (props.onDismiss) {
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], props.onDismiss));
          const onSelect = (): void => props.onDismiss?.();
          document.addEventListener("hella:menu-select", onSelect);
          wirings.push(() => document.removeEventListener("hella:menu-select", onSelect));
        }
        wirings.push(menuTypeahead(node, () => menuEntries(node), (entry) => entry.node.focus()));
        const onKey = menuKeyDown(props.onArrowLeft)(node);
        node.addEventListener("keydown", onKey);
        wirings.push(() => node.removeEventListener("keydown", onKey));
        // Focus moves to the first activatable item on open (the content
        // itself when the menu is empty).
        const first = menuItems(node)[0];
        (first ?? node).focus();
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
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
      {props.children}
    </div>
  );
}

interface ContextMenuPartProps {
  children?: HellaChildren;
  class?: string;
}

export function ContextMenuGroup(props: ContextMenuPartProps): JSX.Element {
  return (
    <div
      data-slot="context-menu-group"
      class={
        cn(props.class)
      }
    >
      {props.children}
    </div>
  );
}

interface ContextMenuItemProps {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  disabled?: boolean;
  onclick?: () => void;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  class?: string;
}

export function ContextMenuItem(props: ContextMenuItemProps): JSX.Element {
  return (
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="context-menu-item"
      data-variant={props.destructive ? "destructive" : "default"}
      data-inset={props.inset ? "true" : undefined}
      data-disabled={props.disabled ? "true" : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      class={
        cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!", props.class)
      }
      on:click={() => {
        if (props.disabled) return;
        props.onclick?.();
        closeAllMenus();
      }}
    >
      {props.children}
      {() => (props.shortcut !== undefined ? <ContextMenuShortcut>{props.shortcut}</ContextMenuShortcut> : null)}
    </div>
  );
}

interface ContextMenuCheckboxItemProps {
  children?: HellaChildren;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled - activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  class?: string;
}

export function ContextMenuCheckboxItem(props: ContextMenuCheckboxItemProps): JSX.Element {
  const accessor = typeof props.checked === "function" ? props.checked : undefined;
  const internal = signal(typeof props.checked === "boolean" ? props.checked : false);
  const checked = (): boolean => (accessor ? accessor() : internal());
  const toggle = (): void => {
    if (props.disabled) return;
    const next = !checked();
    if (!accessor) internal(next);
    props.onCheckedChange?.(next);
    closeAllMenus();
  };
  return (
    <div
      role="menuitemcheckbox"
      tabindex="-1"
      data-slot="context-menu-checkbox-item"
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      data-disabled={props.disabled ? "true" : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      class={
        cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", props.class)
      }
      on:click={toggle}
    >
      <span
        data-slot="context-menu-indicator"
        class={
          cn("pointer-events-none absolute left-2 flex size-3.5 items-center justify-center")
        }
      >
        {() => (checked() ? checkIcon() : null)}
      </span>
      {props.children}
    </div>
  );
}

interface ContextMenuRadioGroupProps {
  children?: HellaChildren;
  items?: MenuEntry[];
  /** Controlled selected value. When given, the group never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
}

export function ContextMenuRadioGroup(props: ContextMenuRadioGroupProps): JSX.Element {
  const internal = signal("");
  const current = (): string => (props.value !== undefined ? props.value() : internal());
  const select = (value: string): void => {
    if (props.value === undefined) internal(value);
    props.onValueChange?.(value);
  };
  return (
    <div
      data-slot="context-menu-radio-group"
      class={
        cn(props.class)
      }
    >
      {props.children}
      {(props.items ?? []).map((entry) => (
        <ContextMenuRadioItem
          value={entry.value}
          checked={() => current() === entry.value}
          disabled={entry.disabled}
          onSelect={() => select(entry.value)}
        >
          {entry.label}
        </ContextMenuRadioItem>
      ))}
    </div>
  );
}

interface ContextMenuRadioItemProps {
  children?: HellaChildren;
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  disabled?: boolean;
  class?: string;
}

export function ContextMenuRadioItem(props: ContextMenuRadioItemProps): JSX.Element {
  const checked = (): boolean =>
    typeof props.checked === "function" ? props.checked() : props.checked ?? false;
  return (
    <div
      role="menuitemradio"
      tabindex="-1"
      data-slot="context-menu-radio-item"
      data-value={props.value}
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      data-disabled={props.disabled ? "true" : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      class={
        cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", props.class)
      }
      on:click={() => {
        if (props.disabled) return;
        props.onSelect?.();
        closeAllMenus();
      }}
    >
      <span
        data-slot="context-menu-indicator"
        class={
          cn("pointer-events-none absolute left-2 flex size-3.5 items-center justify-center")
        }
      >
        {() => (checked() ? circleIcon() : null)}
      </span>
      {props.children}
    </div>
  );
}

interface ContextMenuLabelProps {
  children?: HellaChildren;
  inset?: boolean;
  class?: string;
}

export function ContextMenuLabel(props: ContextMenuLabelProps): JSX.Element {
  return (
    <div
      data-slot="context-menu-label"
      data-inset={props.inset ? "true" : undefined}
      class={
        cn("px-2 py-1.5 text-sm font-medium text-foreground data-[inset]:pl-8", props.class)
      }
    >
      {props.children}
    </div>
  );
}

export function ContextMenuSeparator(props: ContextMenuPartProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="context-menu-separator"
      class={
        cn("-mx-1 my-1 h-px bg-border", props.class)
      }
    />
  );
}

export function ContextMenuShortcut(props: ContextMenuPartProps): JSX.Element {
  return (
    <span
      data-slot="context-menu-shortcut"
      class={
        cn("ml-auto text-xs tracking-widest text-muted-foreground", props.class)
      }
    >
      {props.children}
    </span>
  );
}

interface ContextMenuSubTriggerProps {
  children?: HellaChildren;
  inset?: boolean;
  /** Resolves the open state for `aria-expanded`/`data-state`; the composed Sub wires it. */
  state?: () => "open" | "closed";
  /** Called on click and hover intent to open the submenu. */
  onOpen?: () => void;
  class?: string;
}

export function ContextMenuSubTrigger(props: ContextMenuSubTriggerProps): JSX.Element {
  const state = (): "open" | "closed" => props.state?.() ?? "closed";
  const teardown: (() => void)[] = [];
  return (
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="context-menu-sub-trigger"
      data-state={state()}
      data-inset={props.inset ? "true" : undefined}
      aria-haspopup="menu"
      aria-expanded={state() === "open" ? "true" : "false"}
      class={
        cn("flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", props.class)
      }
      on:click={() => props.onOpen?.()}
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement) || !props.onOpen) return;
        // Hover intent: ~100ms rest opens, leaving before it fires cancels.
        let timer: ReturnType<typeof setTimeout> | null = null;
        const enter = (): void => {
          if (timer !== null) return;
          timer = setTimeout(() => {
            timer = null;
            props.onOpen?.();
          }, 100);
        };
        const leave = (): void => {
          if (timer === null) return;
          clearTimeout(timer);
          timer = null;
        };
        node.addEventListener("pointerenter", enter);
        node.addEventListener("pointerleave", leave);
        teardown.push(() => {
          node.removeEventListener("pointerenter", enter);
          node.removeEventListener("pointerleave", leave);
          if (timer !== null) clearTimeout(timer);
        });
      }}
      hook:beforeDestroy={() => {
        while (teardown.length) teardown.pop()!();
      }}
    >
      {props.children}
      {chevronIcon()}
    </div>
  );
}

interface ContextMenuSubContentProps {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Resolves the element the content anchors to (the sub-trigger); positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback, and item selection closes every open layer. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  /** ArrowLeft closes the submenu. */
  onArrowLeft?: () => void;
  /** Pointer entering the content cancels the trigger's pending close. */
  onPointerEnter?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function ContextMenuSubContent(props: ContextMenuSubContentProps): JSX.Element {
  const side = props.side ?? "right";
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
      role="menu"
      tabindex="-1"
      data-slot="context-menu-sub-content"
      data-state={state()}
      data-side={side}
      data-align={align}
      class={
        cn("z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", props.class)
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = props.anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align) }));
        if (props.onDismiss) {
          // Submenu layers register their own dismissal: Escape pops one
          // level, an outside pointerdown closes the sub before the parent.
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], props.onDismiss));
          const onSelect = (): void => props.onDismiss?.();
          document.addEventListener("hella:menu-select", onSelect);
          wirings.push(() => document.removeEventListener("hella:menu-select", onSelect));
        }
        wirings.push(menuTypeahead(node, () => menuEntries(node), (entry) => entry.node.focus()));
        const onKey = menuKeyDown(props.onArrowLeft)(node);
        node.addEventListener("keydown", onKey);
        wirings.push(() => node.removeEventListener("keydown", onKey));
        if (props.onPointerEnter) {
          const onPointerEnter = (): void => props.onPointerEnter?.();
          node.addEventListener("pointerenter", onPointerEnter);
          wirings.push(() => node.removeEventListener("pointerenter", onPointerEnter));
        }
        const first = menuItems(node)[0];
        (first ?? node).focus();
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
      {props.children}
    </div>
  );
}

interface ContextMenuSubProps {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

export function ContextMenuSub(props: ContextMenuSubProps): JSX.Element {
  const s = menuOpenState({});
  let triggerNode: HTMLElement | undefined;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  // Closing the submenu returns focus to its trigger; the root's own restore
  // owns the top-level handoff, so a detached trigger is left alone.
  let subWasOpen = false;
  effect(() => {
    if (s.isOpen()) subWasOpen = true;
    else if (subWasOpen) {
      subWasOpen = false;
      if (triggerNode?.isConnected) triggerNode.focus();
    }
  });

  return (
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="context-menu-sub-trigger"
      data-state={s.state()}
      aria-haspopup="menu"
      aria-expanded={s.isOpen() ? "true" : "false"}
      class={
        cn("flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", props.class)
      }
      on:click={() => s.setOpen(true)}
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        triggerNode = node;
        // Hover intent: ~100ms rest opens; leaving schedules a close that
        // entering the submenu content cancels (the pointer is in transit).
        const enter = (): void => {
          if (closeTimer !== null) {
            clearTimeout(closeTimer);
            closeTimer = null;
          }
          if (openTimer !== null) return;
          openTimer = setTimeout(() => {
            openTimer = null;
            s.setOpen(true);
          }, 100);
        };
        const leave = (): void => {
          if (openTimer !== null) {
            clearTimeout(openTimer);
            openTimer = null;
          }
          if (closeTimer !== null) return;
          closeTimer = setTimeout(() => {
            closeTimer = null;
            s.setOpen(false);
          }, 300);
        };
        node.addEventListener("pointerenter", enter);
        node.addEventListener("pointerleave", leave);
      }}
      hook:beforeDestroy={() => {
        if (openTimer !== null) clearTimeout(openTimer);
        if (closeTimer !== null) clearTimeout(closeTimer);
      }}
    >
      {props.children}
      {chevronIcon()}
      {() => s.visible() && (
        <Portal to="body">
          <ContextMenuSubContent
            state={s.state}
            anchor={() => triggerNode}
            onDismiss={() => s.setOpen(false)}
            onExited={s.finishExit}
            onArrowLeft={() => s.setOpen(false)}
            onPointerEnter={() => {
              if (closeTimer !== null) {
                clearTimeout(closeTimer);
                closeTimer = null;
              }
            }}
            children={props.content}
          />
        </Portal>
      )}
    </div>
  );
}

interface ContextMenuProps {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

let contextMenuCount = 0;

export default function ContextMenu(props: ContextMenuProps): JSX.Element {
  const s = menuOpenState(props);
  const contentId = `hella-context-menu-content-${++contextMenuCount}`;
  let triggerNode: HTMLElement | undefined;
  let anchorNode: HTMLElement | undefined;

  const removeAnchor = (): void => {
    if (anchorNode !== undefined) {
      anchorNode.remove();
      anchorNode = undefined;
    }
  };

  // Opens at the pointer: a zero-size fixed anchor node marks the click
  // point, and the content positions against it through the fixed-coords
  // path (collision flipping included).
  const openAt = (x: number, y: number): void => {
    removeAnchor();
    const anchor = document.createElement("span");
    anchor.dataset.slot = "context-menu-anchor";
    anchor.style.position = "fixed";
    anchor.style.left = `${x}px`;
    anchor.style.top = `${y}px`;
    anchor.style.width = "0px";
    anchor.style.height = "0px";
    document.body.appendChild(anchor);
    anchorNode = anchor;
    s.setOpen(true);
  };

  // Focus returns to the trigger zone when the menu closes (one open→closed
  // flip only, so the initial closed state never steals focus at mount).
  let wasOpenForFocus = false;
  effect(() => {
    if (s.isOpen()) wasOpenForFocus = true;
    else if (wasOpenForFocus) {
      wasOpenForFocus = false;
      removeAnchor();
      if (triggerNode?.isConnected) triggerNode.focus();
    }
  });

  return (
    <span
      data-slot="context-menu-trigger"
      data-state={s.state()}
      aria-haspopup="menu"
      tabindex="-1"
      class={
        cn(props.class)
      }
      on:contextmenu={(e) => {
        e.preventDefault();
        openAt((e as MouseEvent).clientX, (e as MouseEvent).clientY);
      }}
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) triggerNode = node;
      }}
    >
      {props.children}
      {() => s.visible() && (
        <Portal to="body">
          <ContextMenuContent
            state={s.state}
            id={contentId}
            anchor={() => anchorNode}
            onDismiss={() => s.setOpen(false)}
            onExited={s.finishExit}
            children={props.content}
          />
        </Portal>
      )}
    </span>
  );
}
