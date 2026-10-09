import { effect, signal } from "@hellajs/core";
import { anchorPosition, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, Placement } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const base = style("menubar-base", {
  alignItems: "center",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  gap: "0.25rem",
  height: "2.25rem",
  padding: "0.25rem",
});

const trigger = style("menubar-trigger", {
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  paddingBlock: "0.25rem",
  paddingInline: "0.5rem",
  userSelect: "none",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-state='open']": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
});

const content = style("menubar-content", {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  minWidth: "12rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflow: "hidden",
  padding: "0.25rem",
  transformOrigin: "var(--radix-menubar-content-transform-origin)",
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
});

const item = style("menubar-item", {
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
});

const checkItem = style("menubar-check-item", {
  alignItems: "center",
  borderRadius: "0.125rem",
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
});

const radioItem = style("menubar-radio-item", {
  alignItems: "center",
  borderRadius: "0.125rem",
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
});

const indicator = style("menubar-indicator", {
  alignItems: "center",
  display: "flex",
  height: "0.875rem",
  justifyContent: "center",
  left: "0.5rem",
  pointerEvents: "none",
  position: "absolute",
  width: "0.875rem",
});

const icon = style("menubar-icon", {
  height: "1rem",
  width: "1rem",
});

const radioIcon = style("menubar-radio-icon", {
  fill: "currentColor",
  height: "0.5rem",
  width: "0.5rem",
});

const label = style("menubar-label", {
  fontSize: "0.875rem",
  fontWeight: "500",
  lineHeight: "1.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
});

const separator = style("menubar-separator", {
  backgroundColor: "var(--border)",
  height: "1px",
  marginBottom: "0.25rem",
  marginLeft: "-0.25rem",
  marginRight: "-0.25rem",
  marginTop: "0.25rem",
});

const shortcut = style("menubar-shortcut", {
  color: "var(--muted-foreground)",
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
});

const subTrigger = style("menubar-sub-trigger", {
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  outlineStyle: "none",
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
});

const chevron = style("menubar-chevron", {
  height: "1rem",
  marginLeft: "auto",
  width: "1rem",
});

const subContent = style("menubar-sub-content", {
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
  transformOrigin: "var(--radix-menubar-content-transform-origin)",
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
});

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

/** Document-level coordination events: opening a menu closes its bar siblings, and the bar mirrors which menu is open. */
const OPEN_EVENT = "hella:menubar-open";
const CLOSE_EVENT = "hella:menubar-close";

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

/** Open/close state shared by the bar menu wrapper and submenus: controlled override, exit-holding `visible` gate. */
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

/** The content-owned keyboard model shared by the bar menu and its submenus: roving arrows with wrap, Home/End, Enter/Space activation, Tab close-all, and optional horizontal-arrow handoffs (the bar menu reports both outward for open-then-move; a submenu reports ArrowLeft to close). */
const menuKeyDown = (handlers: { onArrowLeft?: () => void; onArrowRight?: () => void } = {}) => (node: HTMLElement) => (event: Event): void => {
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
    } else if (handlers.onArrowRight) {
      e.preventDefault();
      handlers.onArrowRight();
    }
    return;
  }
  if (e.key === exitKey && handlers.onArrowLeft) {
    e.preventDefault();
    handlers.onArrowLeft();
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

interface MenubarTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; the composed Menubar renders the same shape wired to toggle + aria state. */
export function MenubarTrigger({ children, class: cls, ...attrs }: MenubarTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="menubar-trigger"
      aria-haspopup="menu"
      class={
        [trigger, cls]
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

interface MenubarContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 8. */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default -4. */
  alignOffset?: number;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback, and item selection closes every open layer. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  /** Both horizontal arrows report outward (bar open-then-move) when the focused item is not a sub-trigger. */
  onArrow?: (direction: "left" | "right") => void;
  children?: HellaChildren;
  class?: string;
}

export function MenubarContent({ state, id, side: sideProp, align: alignProp, sideOffset, alignOffset: alignOffsetProp, anchor, onDismiss, onExited, onArrow, children, class: cls, ...attrs }: MenubarContentProps): JSX.Element {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "start";
  const alignOffset = alignOffsetProp ?? -4;
  const stateOf = (): "open" | "closed" => state?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  // The exit runs unwired: flipping to "closed" tears the layer down
  // immediately; reopening remounts fresh wirings with the content.
  effect(() => {
    if (stateOf() === "closed") disposeWirings();
  });

  return (
    <div
      role="menu"
      tabindex="-1"
      id={id}
      data-slot="menubar-content"
      data-state={stateOf()}
      data-side={side}
      data-align={align}
      class={
        [content, cls]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: sideOffset ?? 8 }));
        if (alignOffset !== 0) {
          // Cross-axis shift over the placed coordinates; the placement axis
          // stays owned by anchorPosition's left/top writes.
          node.style.translate = side === "top" || side === "bottom" ? `${alignOffset}px 0` : `0 ${alignOffset}px`;
        }
        if (onDismiss) {
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
          const onSelect = (): void => onDismiss?.();
          document.addEventListener(SELECT_EVENT, onSelect);
          wirings.push(() => document.removeEventListener(SELECT_EVENT, onSelect));
        }
        wirings.push(menuTypeahead(node, () => menuEntries(node), (entry) => entry.node.focus()));
        const onKey = menuKeyDown(onArrow ? { onArrowLeft: () => onArrow("left"), onArrowRight: () => onArrow("right") } : {})(node);
        node.addEventListener("keydown", onKey);
        wirings.push(() => node.removeEventListener("keydown", onKey));
        // Focus moves to the first activatable item on open (the content
        // itself when the menu is empty).
        const first = menuItems(node)[0];
        (first ?? node).focus();
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (stateOf() === "closed") onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MenubarPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function MenubarGroup({ children, class: cls, ...attrs }: MenubarPartProps): JSX.Element {
  return (
    <div
      data-slot="menubar-group"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MenubarItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  class?: string;
}

export function MenubarItem({ destructive, inset, disabled, "on:click": userClick, shortcut: shortcutSlot, children, class: cls, ...attrs }: MenubarItemProps): JSX.Element {
  return (
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="menubar-item"
      data-variant={destructive ? "destructive" : "default"}
      data-inset={inset ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      class={
        [item, cls]
      }
      on:click={function (e) {
        if (disabled) return;
        userClick?.call(this, e);
        closeAllMenus();
      }}
      {...attrs}
    >
      {children}
      {() => (shortcutSlot !== undefined ? <MenubarShortcut>{shortcutSlot}</MenubarShortcut> : null)}
    </div>
  );
}

interface MenubarCheckboxItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled - activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  class?: string;
}

export function MenubarCheckboxItem({ checked: checkedProp, onCheckedChange, disabled, children, class: cls, ...attrs }: MenubarCheckboxItemProps): JSX.Element {
  const accessor = typeof checkedProp === "function" ? checkedProp : undefined;
  const internal = signal(typeof checkedProp === "boolean" ? checkedProp : false);
  const checked = (): boolean => (accessor ? accessor() : internal());
  const toggle = (): void => {
    if (disabled) return;
    const next = !checked();
    if (!accessor) internal(next);
    onCheckedChange?.(next);
    closeAllMenus();
  };
  return (
    <div
      role="menuitemcheckbox"
      tabindex="-1"
      data-slot="menubar-checkbox-item"
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      data-disabled={disabled ? "true" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      class={
        [checkItem, cls]
      }
      on:click={toggle}
      {...attrs}
    >
      <span
        data-slot="menubar-indicator"
        class={
          [indicator]
        }
      >
        {() => (checked() ? checkIcon() : null)}
      </span>
      {children}
    </div>
  );
}

interface MenubarRadioGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  items?: MenuEntry[];
  /** Controlled selected value. When given, the group never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
}

export function MenubarRadioGroup({ items, value: valueProp, onValueChange, children, class: cls, ...attrs }: MenubarRadioGroupProps): JSX.Element {
  const internal = signal("");
  const current = (): string => (valueProp !== undefined ? valueProp() : internal());
  const select = (value: string): void => {
    if (valueProp === undefined) internal(value);
    onValueChange?.(value);
  };
  return (
    <div
      data-slot="menubar-radio-group"
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
      {(items ?? []).map((entry) => (
        <MenubarRadioItem
          value={entry.value}
          checked={() => current() === entry.value}
          disabled={entry.disabled}
          onSelect={() => select(entry.value)}
        >
          {entry.label}
        </MenubarRadioItem>
      ))}
    </div>
  );
}

interface MenubarRadioItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  class?: string;
}

export function MenubarRadioItem({ value, checked: checkedProp, onSelect, disabled, children, class: cls, ...attrs }: MenubarRadioItemProps): JSX.Element {
  const checked = (): boolean =>
    typeof checkedProp === "function" ? checkedProp() : checkedProp ?? false;
  return (
    <div
      role="menuitemradio"
      tabindex="-1"
      data-slot="menubar-radio-item"
      data-value={value}
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      data-disabled={disabled ? "true" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      class={
        [radioItem, cls]
      }
      on:click={() => {
        if (disabled) return;
        onSelect?.();
        closeAllMenus();
      }}
      {...attrs}
    >
      <span
        data-slot="menubar-indicator"
        class={
          [indicator]
        }
      >
        {() => (checked() ? circleIcon() : null)}
      </span>
      {children}
    </div>
  );
}

interface MenubarLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  class?: string;
}

export function MenubarLabel({ inset, children, class: cls, ...attrs }: MenubarLabelProps): JSX.Element {
  return (
    <div
      data-slot="menubar-label"
      data-inset={inset ? "true" : undefined}
      class={
        [label, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function MenubarSeparator({ class: cls, ...attrs }: MenubarPartProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="menubar-separator"
      class={
        [separator, cls]
      }
      {...attrs}
    />
  );
}

interface MenubarShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export function MenubarShortcut({ children, class: cls, ...attrs }: MenubarShortcutProps): JSX.Element {
  return (
    <span
      data-slot="menubar-shortcut"
      class={
        [shortcut, cls]
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface MenubarSubTriggerProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  /** Resolves the open state for `aria-expanded`/`data-state`; the composed Sub wires it. */
  state?: () => "open" | "closed";
  /** Called on click and hover intent to open the submenu. */
  onOpen?: () => void;
  class?: string;
}

export function MenubarSubTrigger({ inset, state, onOpen, children, class: cls, ...attrs }: MenubarSubTriggerProps): JSX.Element {
  const stateOf = (): "open" | "closed" => state?.() ?? "closed";
  const teardown: (() => void)[] = [];
  return (
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="menubar-sub-trigger"
      data-state={stateOf()}
      data-inset={inset ? "true" : undefined}
      aria-haspopup="menu"
      aria-expanded={stateOf() === "open" ? "true" : "false"}
      class={
        [subTrigger, cls]
      }
      on:click={() => onOpen?.()}
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement) || !onOpen) return;
        // Hover intent: ~100ms rest opens, leaving before it fires cancels.
        let timer: ReturnType<typeof setTimeout> | null = null;
        const enter = (): void => {
          if (timer !== null) return;
          timer = setTimeout(() => {
            timer = null;
            onOpen?.();
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
      {...attrs}
    >
      {children}
      {chevronIcon()}
    </div>
  );
}

interface MenubarSubContentProps extends HTMLAttributes<"div"> {
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

export function MenubarSubContent({ state, side: sideProp, align: alignProp, sideOffset, anchor, onDismiss, onExited, onArrowLeft, onPointerEnter, children, class: cls, ...attrs }: MenubarSubContentProps): JSX.Element {
  const side = sideProp ?? "right";
  const align = alignProp ?? "start";
  const stateOf = (): "open" | "closed" => state?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  // The exit runs unwired: flipping to "closed" tears the layer down
  // immediately; reopening remounts fresh wirings with the content.
  effect(() => {
    if (stateOf() === "closed") disposeWirings();
  });

  return (
    <div
      role="menu"
      tabindex="-1"
      data-slot="menubar-sub-content"
      data-state={stateOf()}
      data-side={side}
      data-align={align}
      class={
        [subContent, cls]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: sideOffset ?? 0 }));
        if (onDismiss) {
          // Submenu layers register their own dismissal: Escape pops one
          // level, an outside pointerdown closes the sub before the parent.
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
          const onSelect = (): void => onDismiss?.();
          document.addEventListener(SELECT_EVENT, onSelect);
          wirings.push(() => document.removeEventListener(SELECT_EVENT, onSelect));
        }
        wirings.push(menuTypeahead(node, () => menuEntries(node), (entry) => entry.node.focus()));
        const onKey = menuKeyDown(onArrowLeft ? { onArrowLeft } : {})(node);
        node.addEventListener("keydown", onKey);
        wirings.push(() => node.removeEventListener("keydown", onKey));
        if (onPointerEnter) {
          const onPointerEnterListener = (): void => onPointerEnter?.();
          node.addEventListener("pointerenter", onPointerEnterListener);
          wirings.push(() => node.removeEventListener("pointerenter", onPointerEnterListener));
        }
        const first = menuItems(node)[0];
        (first ?? node).focus();
        const onAnimationEnd = (): void => {
          if (stateOf() === "closed") onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}
      hook:beforeDestroy={() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MenubarSubProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

export function MenubarSub({ content: contentSlot, children, class: cls, ...attrs }: MenubarSubProps): JSX.Element {
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
      data-slot="menubar-sub-trigger"
      data-state={s.state()}
      aria-haspopup="menu"
      aria-expanded={s.isOpen() ? "true" : "false"}
      class={
        [subTrigger, cls]
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
      {...attrs}
    >
      {children}
      {chevronIcon()}
      {() => s.visible() && (
        <Portal to="body">
          <MenubarSubContent
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
            children={contentSlot}
          />
        </Portal>
      )}
    </div>
  );
}

interface MenubarMenuProps extends HTMLAttributes<"div"> {
  /** This menu's id in the bar's open-menu value; a generated id stands in when omitted. */
  value?: string;
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

let menubarMenuCount = 0;

export function MenubarMenu({ value, open, onOpenChange, content: contentSlot, children, class: cls, ...attrs }: MenubarMenuProps): JSX.Element {
  const s = menuOpenState({ open, onOpenChange });
  const menuId = value ?? `hella-menubar-menu-${++menubarMenuCount}`;
  const contentId = `${menuId}-content`;
  let triggerNode: HTMLElement | undefined;
  const wirings: (() => void)[] = [];

  // Announce every flip so sibling menus close (second opens, first closes)
  // and the bar mirrors which menu is open. Closing under Tab runs through
  // closeAllMenus, so the item-model activation event also lands here.
  let wasOpen = false;
  effect(() => {
    if (s.isOpen()) {
      wasOpen = true;
      document.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { id: menuId } }));
    } else if (wasOpen) {
      wasOpen = false;
      document.dispatchEvent(new CustomEvent(CLOSE_EVENT, { detail: { id: menuId } }));
    }
  });

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

  // Bar coordination: a sibling opening closes this menu without re-announcing.
  const onSiblingOpen = (event: Event): void => {
    const id = (event as CustomEvent).detail?.id;
    if (id !== menuId) s.setOpen(false);
  };

  // Open-then-move: both horizontal arrows hand off to the adjacent trigger in
  // the same bar; its click opens that menu and the announcement closes this one.
  const onArrow = (direction: "left" | "right"): void => {
    if (!triggerNode) return;
    const bar = triggerNode.closest("[data-slot='menubar']");
    const triggers = bar
      ? Array.from(bar.querySelectorAll("[data-slot='menubar-trigger']"))
      : [];
    const index = triggers.indexOf(triggerNode);
    if (index === -1 || triggers.length < 2) return;
    const next = triggers[(index + (direction === "right" ? 1 : -1) + triggers.length) % triggers.length] as HTMLElement;
    next.focus();
    next.dispatchEvent(new Event("click", { bubbles: true }));
  };

  return (
    <div
      data-slot="menubar-menu"
      data-value={value}
      class={
        [cls]
      }
      hook:afterMount={(node) => {
        if (node instanceof HTMLElement) triggerNode = node.querySelector("[data-slot='menubar-trigger']") ?? undefined;
        document.addEventListener(OPEN_EVENT, onSiblingOpen);
        wirings.push(() => document.removeEventListener(OPEN_EVENT, onSiblingOpen));
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
      }}
      {...attrs}
    >
      <button
        type="button"
        data-slot="menubar-trigger"
        data-state={s.state()}
        aria-haspopup="menu"
        aria-expanded={s.isOpen() ? "true" : "false"}
        aria-controls={contentId}
        class={
          [trigger]
        }
        on:click={() => s.setOpen(!s.isOpen())}
        on:keydown={(e) => {
          if ((e as KeyboardEvent).key === "ArrowDown" && !s.isOpen()) {
            e.preventDefault();
            s.setOpen(true);
          }
        }}
      >
        {children}
      </button>
      {() => s.visible() && (
        <Portal to="body">
          <MenubarContent
            state={s.state}
            id={contentId}
            anchor={() => triggerNode}
            onDismiss={() => s.setOpen(false)}
            onExited={s.finishExit}
            onArrow={onArrow}
            children={contentSlot}
          />
        </Portal>
      )}
    </div>
  );
}

interface MenubarProps extends HTMLAttributes<"div"> {
  /** Controlled id of the open menu ("" when closed). When given, the bar never writes its internal signal and `onValueChange` reports every flip. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  class?: string;
}

export default function Menubar({ value: valueProp, onValueChange, children, class: cls, ...attrs }: MenubarProps): JSX.Element {
  const internal = signal("");
  const active = (): string => (valueProp !== undefined ? valueProp() : internal());
  const setActive = (value: string): void => {
    if (valueProp === undefined) internal(value);
    onValueChange?.(value);
  };
  const wirings: (() => void)[] = [];
  let barNode: HTMLElement | undefined;

  // Mirror the menus' announcements into the bar's open-menu value.
  const onMenuOpen = (event: Event): void => {
    const id = (event as CustomEvent).detail?.id;
    if (typeof id === "string") setActive(id);
  };
  const onMenuClose = (event: Event): void => {
    const id = (event as CustomEvent).detail?.id;
    if (typeof id === "string" && active() === id) setActive("");
  };

  // Bar keyboard with no menu open: left/right move focus between triggers
  // (open-then-move is the content's onArrow handoff, not the bar's). A direct
  // listener, not on: - delegation leaves currentTarget at body.
  const onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const focused = document.activeElement?.closest?.("[data-slot='menubar-trigger']") as HTMLElement | null;
    if (!focused || focused.getAttribute("data-state") === "open") return;
    const bar = focused.closest("[data-slot='menubar']");
    if (!bar || bar !== barNode) return;
    const triggers = Array.from(bar.querySelectorAll("[data-slot='menubar-trigger']"));
    if (triggers.length === 0) return;
    const current = triggers.indexOf(focused);
    if (current === -1) return;
    e.preventDefault();
    const next = triggers[(current + (e.key === "ArrowRight" ? 1 : -1) + triggers.length) % triggers.length] as HTMLElement;
    next.focus();
  };

  return (
    <div
      role="menubar"
      data-slot="menubar"
      class={
        [base, cls]
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        barNode = node;
        node.addEventListener("keydown", onKeyDown);
        wirings.push(() => node.removeEventListener("keydown", onKeyDown));
        document.addEventListener(OPEN_EVENT, onMenuOpen);
        document.addEventListener(CLOSE_EVENT, onMenuClose);
        wirings.push(() => {
          document.removeEventListener(OPEN_EVENT, onMenuOpen);
          document.removeEventListener(CLOSE_EVENT, onMenuClose);
        });
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
        barNode = undefined;
      }}
      {...attrs}
    >
      {children}
    </div>
  );
}
