import { effect, signal } from "@hellajs/core";
import { anchorPosition, html, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode, Placement } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const content = style("context-menu-content", {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  maxHeight: "var(--radix-context-menu-content-available-height)",
  minWidth: "8rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflowX: "hidden",
  overflowY: "auto",
  padding: "0.25rem",
  transformOrigin: "var(--radix-context-menu-content-transform-origin)",
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

const item = style("context-menu-item", {
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

const checkItem = style("context-menu-check-item", {
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
});

const radioItem = style("context-menu-radio-item", {
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
});

const indicator = style("context-menu-indicator", {
  alignItems: "center",
  display: "flex",
  height: "0.875rem",
  justifyContent: "center",
  left: "0.5rem",
  pointerEvents: "none",
  position: "absolute",
  width: "0.875rem",
});

const icon = style("context-menu-icon", {
  height: "1rem",
  width: "1rem",
});

const radioIcon = style("context-menu-radio-icon", {
  fill: "currentColor",
  height: "0.5rem",
  width: "0.5rem",
});

const label = style("context-menu-label", {
  color: "var(--foreground)",
  fontSize: "0.875rem",
  fontWeight: "500",
  lineHeight: "1.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
});

const separator = style("context-menu-separator", {
  backgroundColor: "var(--border)",
  height: "1px",
  marginBottom: "0.25rem",
  marginLeft: "-0.25rem",
  marginRight: "-0.25rem",
  marginTop: "0.25rem",
});

const shortcut = style("context-menu-shortcut", {
  color: "var(--muted-foreground)",
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
});

const subTrigger = style("context-menu-sub-trigger", {
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
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
});

const chevron = style("context-menu-chevron", {
  marginLeft: "auto",
});

const subContent = style("context-menu-sub-content", {
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
  transformOrigin: "var(--radix-context-menu-content-transform-origin)",
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
      [icon]
    }"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>` as HellaNode;

/** The circle icon (refs/icons/circle.svg), created per call so reactive swaps never share nodes between clones. */
const circleIcon = (): HellaNode =>
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
      [radioIcon]
    }"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>` as HellaNode;

/** The chevron-right icon (refs/icons/chevron-right.svg), created per call so reactive swaps never share nodes between clones. */
const chevronIcon = (): HellaNode =>
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
      [chevron]
    }"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>` as HellaNode;

interface ContextMenuTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger zone; the composed ContextMenu renders the same shape wired to the `contextmenu` listener. */
export function ContextMenuTrigger({ children, class: cls, ...attrs }: ContextMenuTriggerProps): HellaNode {
  return html`
    <span
      data-slot="context-menu-trigger"
      class="${
        [cls]
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface ContextMenuContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
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

export function ContextMenuContent({ state, id, side: sideProp, align: alignProp, anchor, onDismiss, onExited, onArrowLeft, children, class: cls, ...attrs }: ContextMenuContentProps): HellaNode {
  const side = sideProp ?? "bottom";
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

  return html`
    <div
      role="menu"
      tabindex="-1"
      id="${id}"
      data-slot="context-menu-content"
      data-state="${stateOf}"
      data-side="${side}"
      data-align="${align}"
      class="${
        [content, cls]
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align) }));
        if (onDismiss) {
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
          const onSelect = (): void => onDismiss?.();
          document.addEventListener(SELECT_EVENT, onSelect);
          wirings.push(() => document.removeEventListener(SELECT_EVENT, onSelect));
        }
        wirings.push(menuTypeahead(node, () => menuEntries(node), (entry) => entry.node.focus()));
        const onKey = menuKeyDown(onArrowLeft)(node);
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
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ContextMenuPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function ContextMenuGroup({ children, class: cls, ...attrs }: ContextMenuPartProps): HellaNode {
  return html`
    <div
      data-slot="context-menu-group"
      class="${
        [cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ContextMenuItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  class?: string;
}

export function ContextMenuItem({ destructive, inset, disabled, "on:click": userClick, shortcut: shortcutSlot, children, class: cls, ...attrs }: ContextMenuItemProps): HellaNode {
  return html`
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="context-menu-item"
      data-variant="${destructive ? "destructive" : "default"}"
      data-inset="${inset ? "true" : undefined}"
      data-disabled="${disabled ? "true" : undefined}"
      aria-disabled="${disabled ? "true" : undefined}"
      class="${
        [item, cls]
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) {
        if (disabled) return;
        userClick?.call(this, e);
        closeAllMenus();
      }}"
      ...${attrs}
    >
      ${() => children}${() => (shortcutSlot !== undefined ? ContextMenuShortcut({ children: shortcutSlot }) : null)}
    </div>
  ` as HellaNode;
}

interface ContextMenuCheckboxItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled - activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  class?: string;
}

export function ContextMenuCheckboxItem({ checked: checkedProp, onCheckedChange, disabled, children, class: cls, ...attrs }: ContextMenuCheckboxItemProps): HellaNode {
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
  return html`
    <div
      role="menuitemcheckbox"
      tabindex="-1"
      data-slot="context-menu-checkbox-item"
      aria-checked="${() => (checked() ? "true" : "false")}"
      data-state="${() => (checked() ? "checked" : "unchecked")}"
      data-disabled="${disabled ? "true" : undefined}"
      aria-disabled="${disabled ? "true" : undefined}"
      class="${
        [checkItem, cls]
      }"
      on:click="${toggle}"
      ...${attrs}
    >
      <span
        data-slot="context-menu-indicator"
        class="${
          [indicator]
        }"
      >
        ${() => (checked() ? checkIcon() : null)}
      </span>
      ${() => children}
    </div>
  ` as HellaNode;
}

interface ContextMenuRadioGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  items?: MenuEntry[];
  /** Controlled selected value. When given, the group never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
}

export function ContextMenuRadioGroup({ items, value: valueProp, onValueChange, children, class: cls, ...attrs }: ContextMenuRadioGroupProps): HellaNode {
  const internal = signal("");
  const current = (): string => (valueProp !== undefined ? valueProp() : internal());
  const select = (value: string): void => {
    if (valueProp === undefined) internal(value);
    onValueChange?.(value);
  };
  return html`
    <div
      data-slot="context-menu-radio-group"
      class="${
        [cls]
      }"
      ...${attrs}
    >
      ${() => children}${(items ?? []).map((entry) => ContextMenuRadioItem({
        value: entry.value,
        checked: () => current() === entry.value,
        disabled: entry.disabled,
        onSelect: () => select(entry.value),
        children: entry.label,
      }))}
    </div>
  ` as HellaNode;
}

interface ContextMenuRadioItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  class?: string;
}

export function ContextMenuRadioItem({ value, checked: checkedProp, onSelect, disabled, children, class: cls, ...attrs }: ContextMenuRadioItemProps): HellaNode {
  const checked = (): boolean =>
    typeof checkedProp === "function" ? checkedProp() : checkedProp ?? false;
  return html`
    <div
      role="menuitemradio"
      tabindex="-1"
      data-slot="context-menu-radio-item"
      data-value="${value}"
      aria-checked="${() => (checked() ? "true" : "false")}"
      data-state="${() => (checked() ? "checked" : "unchecked")}"
      data-disabled="${disabled ? "true" : undefined}"
      aria-disabled="${disabled ? "true" : undefined}"
      class="${
        [radioItem, cls]
      }"
      on:click="${() => {
        if (disabled) return;
        onSelect?.();
        closeAllMenus();
      }}"
      ...${attrs}
    >
      <span
        data-slot="context-menu-indicator"
        class="${
          [indicator]
        }"
      >
        ${() => (checked() ? circleIcon() : null)}
      </span>
      ${() => children}
    </div>
  ` as HellaNode;
}

interface ContextMenuLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  class?: string;
}

export function ContextMenuLabel({ inset, children, class: cls, ...attrs }: ContextMenuLabelProps): HellaNode {
  return html`
    <div
      data-slot="context-menu-label"
      data-inset="${inset ? "true" : undefined}"
      class="${
        [label, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ContextMenuSeparator({ class: cls, ...attrs }: ContextMenuPartProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="context-menu-separator"
      class="${
        [separator, cls]
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

interface ContextMenuShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export function ContextMenuShortcut({ children, class: cls, ...attrs }: ContextMenuShortcutProps): HellaNode {
  return html`
    <span
      data-slot="context-menu-shortcut"
      class="${
        [shortcut, cls]
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface ContextMenuSubTriggerProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  /** Resolves the open state for `aria-expanded`/`data-state`; the composed Sub wires it. */
  state?: () => "open" | "closed";
  /** Called on click and hover intent to open the submenu. */
  onOpen?: () => void;
  class?: string;
}

export function ContextMenuSubTrigger({ inset, state, onOpen, children, class: cls, ...attrs }: ContextMenuSubTriggerProps): HellaNode {
  const stateOf = (): "open" | "closed" => state?.() ?? "closed";
  const teardown: (() => void)[] = [];
  return html`
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="context-menu-sub-trigger"
      data-state="${stateOf}"
      data-inset="${inset ? "true" : undefined}"
      aria-haspopup="menu"
      aria-expanded="${() => (stateOf() === "open" ? "true" : "false")}"
      class="${
        [subTrigger, cls]
      }"
      on:click="${() => onOpen?.()}"
      hook:afterMount="${(node: Element) => {
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
      }}"
      hook:beforeDestroy="${() => {
        while (teardown.length) teardown.pop()!();
      }}"
      ...${attrs}
    >
      ${() => children}${chevronIcon()}
    </div>
  ` as HellaNode;
}

interface ContextMenuSubContentProps extends HTMLAttributes<"div"> {
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

export function ContextMenuSubContent({ state, side: sideProp, align: alignProp, anchor, onDismiss, onExited, onArrowLeft, onPointerEnter, children, class: cls, ...attrs }: ContextMenuSubContentProps): HellaNode {
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

  return html`
    <div
      role="menu"
      tabindex="-1"
      data-slot="context-menu-sub-content"
      data-state="${stateOf}"
      data-side="${side}"
      data-align="${align}"
      class="${
        [subContent, cls]
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align) }));
        if (onDismiss) {
          // Submenu layers register their own dismissal: Escape pops one
          // level, an outside pointerdown closes the sub before the parent.
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
          const onSelect = (): void => onDismiss?.();
          document.addEventListener(SELECT_EVENT, onSelect);
          wirings.push(() => document.removeEventListener(SELECT_EVENT, onSelect));
        }
        wirings.push(menuTypeahead(node, () => menuEntries(node), (entry) => entry.node.focus()));
        const onKey = menuKeyDown(onArrowLeft)(node);
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
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ContextMenuSubProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

export function ContextMenuSub({ content: contentSlot, children, class: cls, ...attrs }: ContextMenuSubProps): HellaNode {
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

  return html`
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="context-menu-sub-trigger"
      data-state="${() => s.state()}"
      aria-haspopup="menu"
      aria-expanded="${() => (s.isOpen() ? "true" : "false")}"
      class="${
        [subTrigger, cls]
      }"
      on:click="${() => s.setOpen(true)}"
      hook:afterMount="${(node: Element) => {
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
      }}"
      hook:beforeDestroy="${() => {
        if (openTimer !== null) clearTimeout(openTimer);
        if (closeTimer !== null) clearTimeout(closeTimer);
      }}"
      ...${attrs}
    >
      ${() => children}${chevronIcon()}${() => s.visible() && Portal({
        to: "body",
        children: [
          ContextMenuSubContent({
            state: s.state,
            anchor: () => triggerNode,
            onDismiss: () => s.setOpen(false),
            onExited: s.finishExit,
            onArrowLeft: () => s.setOpen(false),
            onPointerEnter: () => {
              if (closeTimer !== null) {
                clearTimeout(closeTimer);
                closeTimer = null;
              }
            },
            children: contentSlot,
          }) as HellaChild,
        ],
      })}
    </div>
  ` as HellaNode;
}

interface ContextMenuProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

let contextMenuCount = 0;

export default function ContextMenu({ open, onOpenChange, content: contentSlot, children, class: cls, ...attrs }: ContextMenuProps): HellaNode {
  const s = menuOpenState({ open, onOpenChange });
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
    anchor.style.left = x + "px";
    anchor.style.top = y + "px";
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

  return html`
    <span
      data-slot="context-menu-trigger"
      data-state="${() => s.state()}"
      aria-haspopup="menu"
      tabindex="-1"
      class="${
        [cls]
      }"
      on:contextmenu="${(e: Event) => {
        e.preventDefault();
        openAt((e as MouseEvent).clientX, (e as MouseEvent).clientY);
      }}"
      hook:afterMount="${(node: Element) => {
        if (node instanceof HTMLElement) triggerNode = node;
      }}"
      ...${attrs}
    >
      ${() => children}${() => s.visible() && Portal({
        to: "body",
        children: [
          ContextMenuContent({
            state: s.state,
            id: contentId,
            anchor: () => anchorNode,
            onDismiss: () => s.setOpen(false),
            onExited: s.finishExit,
            children: contentSlot,
          }) as HellaChild,
        ],
      })}
    </span>
  ` as HellaNode;
}
