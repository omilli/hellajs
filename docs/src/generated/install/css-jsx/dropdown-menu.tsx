import { effect, signal } from "@hellajs/core";
import { anchorPosition, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HellaChildren, Placement } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const base = style({
  alignItems: "center",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  height: "2.25rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  paddingBlock: "0.5rem",
  paddingInline: "1rem",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:hover": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&:has(> svg)": {
    paddingInline: "0.75rem",
  },
  "&:is(.dark *)": {
    borderColor: "var(--input)",
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
  "&:is(.dark *):hover": {
    background: "color-mix(in oklab, var(--input) 50%, transparent)",
  },
}, { label: "hella-dropdown-menu-base", layer: "hella" });

const content = style({
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  maxHeight: "var(--radix-dropdown-menu-content-available-height)",
  minWidth: "8rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflowX: "hidden",
  overflowY: "auto",
  padding: "0.25rem",
  transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)",
  zIndex: "50",
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 150ms ease-in both`,
  },
}, { label: "hella-dropdown-menu-content", layer: "hella" });

const item = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
  "&[data-variant='destructive']": {
    color: "var(--destructive)",
  },
  "&[data-variant='destructive']:focus": {
    backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)",
    color: "var(--destructive)",
  },
  "&:is(.dark *)[data-variant='destructive']:focus": {
    backgroundColor: "color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: "var(--muted-foreground)",
  },
  "&[data-variant='destructive'] svg": {
    color: "var(--destructive) !important",
  },
}, { label: "hella-dropdown-menu-item", layer: "hella" });

const checkItem = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingLeft: "2rem",
  paddingRight: "0.5rem",
  paddingBlock: "0.375rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-dropdown-menu-check-item", layer: "hella" });

const radioItem = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingLeft: "2rem",
  paddingRight: "0.5rem",
  paddingBlock: "0.375rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-dropdown-menu-radio-item", layer: "hella" });

const indicator = style({
  alignItems: "center",
  display: "flex",
  height: "0.875rem",
  justifyContent: "center",
  left: "0.5rem",
  pointerEvents: "none",
  position: "absolute",
  width: "0.875rem",
}, { label: "hella-dropdown-menu-indicator", layer: "hella" });

const icon = style({
  height: "1rem",
  width: "1rem",
}, { label: "hella-dropdown-menu-icon", layer: "hella" });

const radioIcon = style({
  fill: "currentColor",
  height: "0.5rem",
  width: "0.5rem",
}, { label: "hella-dropdown-menu-radio-icon", layer: "hella" });

const label = style({
  fontSize: "0.875rem",
  fontWeight: "500",
  lineHeight: "1.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
}, { label: "hella-dropdown-menu-label", layer: "hella" });

const separator = style({
  backgroundColor: "var(--border)",
  height: "1px",
  marginBottom: "0.25rem",
  marginLeft: "-0.25rem",
  marginRight: "-0.25rem",
  marginTop: "0.25rem",
}, { label: "hella-dropdown-menu-separator", layer: "hella" });

const shortcut = style({
  color: "var(--muted-foreground)",
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
}, { label: "hella-dropdown-menu-shortcut", layer: "hella" });

const subTrigger = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
  "&[data-state='open']": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: "var(--muted-foreground)",
  },
}, { label: "hella-dropdown-menu-sub-trigger", layer: "hella" });

const chevron = style({
  height: "1rem",
  marginLeft: "auto",
  width: "1rem",
}, { label: "hella-dropdown-menu-chevron", layer: "hella" });

const subContent = style({
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  minWidth: "8rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflow: "hidden",
  padding: "0.25rem",
  transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)",
  zIndex: "50",
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 150ms ease-in both`,
  },
}, { label: "hella-dropdown-menu-sub-content", layer: "hella" });

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

/** Document-level activation event: item selection closes every open menu layer (Radix close-on-select). */
const SELECT_EVENT = "hella:menu-select";

const closeAllMenus = (): void => {
  document.dispatchEvent(new CustomEvent(SELECT_EVENT));
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
      [icon]
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
      [radioIcon]
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
      [chevron]
    }
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

interface DropdownMenuTriggerProps {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; the composed DropdownMenu renders the same shape wired to toggle + aria state. */
export function DropdownMenuTrigger(props: DropdownMenuTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="dropdown-menu-trigger"
      aria-haspopup="menu"
      class={
        [base, props.class]
      }
    >
      {() => props.children}
    </button>
  );
}

interface DropdownMenuContentProps {
  state?: () => "open" | "closed";
  id?: string;
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 4. */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default 0. */
  alignOffset?: number;
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

export function DropdownMenuContent(props: DropdownMenuContentProps): JSX.Element {
  const side = props.side ?? "bottom";
  const align = props.align ?? "start";
  const alignOffset = props.alignOffset ?? 0;
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
      data-slot="dropdown-menu-content"
      data-state={state()}
      data-side={side}
      data-align={align}
      class={
        [content, props.class]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = props.anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: props.sideOffset ?? 4 }));
        if (alignOffset !== 0) {
          // Cross-axis shift over the placed coordinates; the placement axis
          // stays owned by anchorPosition's left/top writes.
          node.style.translate = side === "top" || side === "bottom" ? `${alignOffset}px 0` : `0 ${alignOffset}px`;
        }
        if (props.onDismiss) {
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], props.onDismiss));
          const onSelect = (): void => props.onDismiss?.();
          document.addEventListener(SELECT_EVENT, onSelect);
          wirings.push(() => document.removeEventListener(SELECT_EVENT, onSelect));
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
      {() => props.children}
    </div>
  );
}

interface DropdownMenuPartProps {
  children?: HellaChildren;
  class?: string;
}

export function DropdownMenuGroup(props: DropdownMenuPartProps): JSX.Element {
  return (
    <div
      data-slot="dropdown-menu-group"
      class={
        [props.class]
      }
    >
      {() => props.children}
    </div>
  );
}

interface DropdownMenuItemProps {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  disabled?: boolean;
  onclick?: () => void;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  class?: string;
}

export function DropdownMenuItem(props: DropdownMenuItemProps): JSX.Element {
  return (
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="dropdown-menu-item"
      data-variant={props.destructive ? "destructive" : "default"}
      data-inset={props.inset ? "true" : undefined}
      data-disabled={props.disabled ? "true" : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      class={
        [item, props.class]
      }
      on:click={() => {
        if (props.disabled) return;
        props.onclick?.();
        closeAllMenus();
      }}
    >
      {() => props.children}
      {() => (props.shortcut !== undefined ? <DropdownMenuShortcut>{props.shortcut}</DropdownMenuShortcut> : null)}
    </div>
  );
}

interface DropdownMenuCheckboxItemProps {
  children?: HellaChildren;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled - activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  class?: string;
}

export function DropdownMenuCheckboxItem(props: DropdownMenuCheckboxItemProps): JSX.Element {
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
      data-slot="dropdown-menu-checkbox-item"
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      data-disabled={props.disabled ? "true" : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      class={
        [checkItem, props.class]
      }
      on:click={toggle}
    >
      <span
        data-slot="dropdown-menu-indicator"
        class={
          [indicator]
        }
      >
        {() => (checked() ? checkIcon() : null)}
      </span>
      {() => props.children}
    </div>
  );
}

interface DropdownMenuRadioGroupProps {
  children?: HellaChildren;
  items?: MenuEntry[];
  /** Controlled selected value. When given, the group never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
}

export function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps): JSX.Element {
  const internal = signal("");
  const current = (): string => (props.value !== undefined ? props.value() : internal());
  const select = (value: string): void => {
    if (props.value === undefined) internal(value);
    props.onValueChange?.(value);
  };
  return (
    <div
      data-slot="dropdown-menu-radio-group"
      class={
        [props.class]
      }
    >
      {() => props.children}
      {(props.items ?? []).map((entry) => (
        <DropdownMenuRadioItem
          value={entry.value}
          checked={() => current() === entry.value}
          disabled={entry.disabled}
          onSelect={() => select(entry.value)}
        >
          {entry.label}
        </DropdownMenuRadioItem>
      ))}
    </div>
  );
}

interface DropdownMenuRadioItemProps {
  children?: HellaChildren;
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  disabled?: boolean;
  class?: string;
}

export function DropdownMenuRadioItem(props: DropdownMenuRadioItemProps): JSX.Element {
  const checked = (): boolean =>
    typeof props.checked === "function" ? props.checked() : props.checked ?? false;
  return (
    <div
      role="menuitemradio"
      tabindex="-1"
      data-slot="dropdown-menu-radio-item"
      data-value={props.value}
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      data-disabled={props.disabled ? "true" : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      class={
        [radioItem, props.class]
      }
      on:click={() => {
        if (props.disabled) return;
        props.onSelect?.();
        closeAllMenus();
      }}
    >
      <span
        data-slot="dropdown-menu-indicator"
        class={
          [indicator]
        }
      >
        {() => (checked() ? circleIcon() : null)}
      </span>
      {() => props.children}
    </div>
  );
}

interface DropdownMenuLabelProps {
  children?: HellaChildren;
  inset?: boolean;
  class?: string;
}

export function DropdownMenuLabel(props: DropdownMenuLabelProps): JSX.Element {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={props.inset ? "true" : undefined}
      class={
        [label, props.class]
      }
    >
      {() => props.children}
    </div>
  );
}

export function DropdownMenuSeparator(props: DropdownMenuPartProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="dropdown-menu-separator"
      class={
        [separator, props.class]
      }
    />
  );
}

export function DropdownMenuShortcut(props: DropdownMenuPartProps): JSX.Element {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      class={
        [shortcut, props.class]
      }
    >
      {() => props.children}
    </span>
  );
}

interface DropdownMenuSubTriggerProps {
  children?: HellaChildren;
  inset?: boolean;
  /** Resolves the open state for `aria-expanded`/`data-state`; the composed Sub wires it. */
  state?: () => "open" | "closed";
  /** Called on click and hover intent to open the submenu. */
  onOpen?: () => void;
  class?: string;
}

export function DropdownMenuSubTrigger(props: DropdownMenuSubTriggerProps): JSX.Element {
  const state = (): "open" | "closed" => props.state?.() ?? "closed";
  const teardown: (() => void)[] = [];
  return (
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="dropdown-menu-sub-trigger"
      data-state={state()}
      data-inset={props.inset ? "true" : undefined}
      aria-haspopup="menu"
      aria-expanded={state() === "open" ? "true" : "false"}
      class={
        [subTrigger, props.class]
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
      {() => props.children}
      {chevronIcon()}
    </div>
  );
}

interface DropdownMenuSubContentProps {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  sideOffset?: number;
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

export function DropdownMenuSubContent(props: DropdownMenuSubContentProps): JSX.Element {
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
      data-slot="dropdown-menu-sub-content"
      data-state={state()}
      data-side={side}
      data-align={align}
      class={
        [subContent, props.class]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = props.anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: props.sideOffset ?? 0 }));
        if (props.onDismiss) {
          // Submenu layers register their own dismissal: Escape pops one
          // level, an outside pointerdown closes the sub before the parent.
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], props.onDismiss));
          const onSelect = (): void => props.onDismiss?.();
          document.addEventListener(SELECT_EVENT, onSelect);
          wirings.push(() => document.removeEventListener(SELECT_EVENT, onSelect));
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
      {() => props.children}
    </div>
  );
}

interface DropdownMenuSubProps {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

export function DropdownMenuSub(props: DropdownMenuSubProps): JSX.Element {
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
      data-slot="dropdown-menu-sub-trigger"
      data-state={s.state()}
      aria-haspopup="menu"
      aria-expanded={s.isOpen() ? "true" : "false"}
      class={
        [subTrigger, props.class]
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
      {() => props.children}
      {chevronIcon()}
      {() => s.visible() && (
        <Portal to="body">
          <DropdownMenuSubContent
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

interface DropdownMenuProps {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

let dropdownMenuCount = 0;

export default function DropdownMenu(props: DropdownMenuProps): JSX.Element {
  const s = menuOpenState(props);
  const contentId = `hella-dropdown-menu-content-${++dropdownMenuCount}`;
  let triggerNode: HTMLElement | undefined;

  // Focus returns to the trigger when the menu closes (one open→closed flip
  // only, so the initial closed state never steals focus at mount).
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
      data-slot="dropdown-menu-trigger"
      data-state={s.state()}
      aria-haspopup="menu"
      aria-expanded={s.isOpen() ? "true" : "false"}
      aria-controls={contentId}
      class={
        [base, props.class]
      }
      on:click={() => s.setOpen(!s.isOpen())}
      on:keydown={(e) => {
        if ((e as KeyboardEvent).key === "ArrowDown" && !s.isOpen()) {
          e.preventDefault();
          s.setOpen(true);
        }
      }}
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) triggerNode = node;
      }}
    >
      {() => props.children}
      {() => s.visible() && (
        <Portal to="body">
          <DropdownMenuContent
            state={s.state}
            id={contentId}
            anchor={() => triggerNode}
            onDismiss={() => s.setOpen(false)}
            onExited={s.finishExit}
            children={props.content}
          />
        </Portal>
      )}
    </button>
  );
}
