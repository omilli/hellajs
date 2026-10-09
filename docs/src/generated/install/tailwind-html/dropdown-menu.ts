import { effect, signal } from "@hellajs/core";
import { anchorPosition, html, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode, Placement } from "@hellajs/dom";
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
      cn("size-4")
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
      cn("size-2 fill-current")
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
      cn("ml-auto size-4")
    }"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>` as HellaNode;

interface DropdownMenuTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; the composed DropdownMenu renders the same shape wired to toggle + aria state. */
export function DropdownMenuTrigger({ children, class: cls, ...attrs }: DropdownMenuTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="dropdown-menu-trigger"
      aria-haspopup="menu"
      class="${
        cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 h-9 px-4 py-2 has-[>svg]:px-3", cls)
      }"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface DropdownMenuContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
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

export function DropdownMenuContent({ state, id, side: sideProp, align: alignProp, sideOffset, alignOffset: alignOffsetProp, anchor, onDismiss, onExited, onArrowLeft, children, class: cls, ...attrs }: DropdownMenuContentProps): HellaNode {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "start";
  const alignOffset = alignOffsetProp ?? 0;
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
      data-slot="dropdown-menu-content"
      data-state="${stateOf}"
      data-side="${side}"
      data-align="${align}"
      class="${
        cn("z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", cls)
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: sideOffset ?? 4 }));
        if (alignOffset !== 0) {
          // Cross-axis shift over the placed coordinates; the placement axis
          // stays owned by anchorPosition's left/top writes.
          node.style.translate = side === "top" || side === "bottom" ? `${alignOffset}px 0` : `0 ${alignOffset}px`;
        }
        if (onDismiss) {
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
          const onSelect = (): void => onDismiss?.();
          document.addEventListener("hella:menu-select", onSelect);
          wirings.push(() => document.removeEventListener("hella:menu-select", onSelect));
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

interface DropdownMenuPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function DropdownMenuGroup({ children, class: cls, ...attrs }: DropdownMenuPartProps): HellaNode {
  return html`
    <div
      data-slot="dropdown-menu-group"
      class="${
        cn(cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface DropdownMenuItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  /** Shortcut text rendered as a trailing Shortcut span. */
  shortcut?: string;
  class?: string;
}

export function DropdownMenuItem({ destructive, inset, disabled, "on:click": userClick, shortcut: shortcutSlot, children, class: cls, ...attrs }: DropdownMenuItemProps): HellaNode {
  return html`
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="dropdown-menu-item"
      data-variant="${destructive ? "destructive" : "default"}"
      data-inset="${inset ? "true" : undefined}"
      data-disabled="${disabled ? "true" : undefined}"
      aria-disabled="${disabled ? "true" : undefined}"
      class="${
        cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!", cls)
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) {
        if (disabled) return;
        userClick?.call(this, e);
        closeAllMenus();
      }}"
      ...${attrs}
    >
      ${() => children}${() => (shortcutSlot !== undefined ? DropdownMenuShortcut({ children: shortcutSlot }) : null)}
    </div>
  ` as HellaNode;
}

interface DropdownMenuCheckboxItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Checked state. A boolean seeds the internal signal; an accessor makes the item controlled - activation then only reports through `onCheckedChange`. */
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  class?: string;
}

export function DropdownMenuCheckboxItem({ checked: checkedProp, onCheckedChange, disabled, children, class: cls, ...attrs }: DropdownMenuCheckboxItemProps): HellaNode {
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
      data-slot="dropdown-menu-checkbox-item"
      aria-checked="${() => (checked() ? "true" : "false")}"
      data-state="${() => (checked() ? "checked" : "unchecked")}"
      data-disabled="${disabled ? "true" : undefined}"
      aria-disabled="${disabled ? "true" : undefined}"
      class="${
        cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", cls)
      }"
      on:click="${toggle}"
      ...${attrs}
    >
      <span
        data-slot="dropdown-menu-indicator"
        class="${
          cn("pointer-events-none absolute left-2 flex size-3.5 items-center justify-center")
        }"
      >
        ${() => (checked() ? checkIcon() : null)}
      </span>
      ${() => children}
    </div>
  ` as HellaNode;
}

interface DropdownMenuRadioGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  items?: MenuEntry[];
  /** Controlled selected value. When given, the group never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
}

export function DropdownMenuRadioGroup({ items, value: valueProp, onValueChange, children, class: cls, ...attrs }: DropdownMenuRadioGroupProps): HellaNode {
  const internal = signal("");
  const current = (): string => (valueProp !== undefined ? valueProp() : internal());
  const select = (value: string): void => {
    if (valueProp === undefined) internal(value);
    onValueChange?.(value);
  };
  return html`
    <div
      data-slot="dropdown-menu-radio-group"
      class="${
        cn(cls)
      }"
      ...${attrs}
    >
      ${() => children}${(items ?? []).map((entry) => DropdownMenuRadioItem({
        value: entry.value,
        checked: () => current() === entry.value,
        disabled: entry.disabled,
        onSelect: () => select(entry.value),
        children: entry.label,
      }))}
    </div>
  ` as HellaNode;
}

interface DropdownMenuRadioItemProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  value?: string;
  /** Checked state. A boolean reads statically; an accessor keeps the item reactive against its owning group. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
  class?: string;
}

export function DropdownMenuRadioItem({ value, checked: checkedProp, onSelect, disabled, children, class: cls, ...attrs }: DropdownMenuRadioItemProps): HellaNode {
  const checked = (): boolean =>
    typeof checkedProp === "function" ? checkedProp() : checkedProp ?? false;
  return html`
    <div
      role="menuitemradio"
      tabindex="-1"
      data-slot="dropdown-menu-radio-item"
      data-value="${value}"
      aria-checked="${() => (checked() ? "true" : "false")}"
      data-state="${() => (checked() ? "checked" : "unchecked")}"
      data-disabled="${disabled ? "true" : undefined}"
      aria-disabled="${disabled ? "true" : undefined}"
      class="${
        cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", cls)
      }"
      on:click="${() => {
        if (disabled) return;
        onSelect?.();
        closeAllMenus();
      }}"
      ...${attrs}
    >
      <span
        data-slot="dropdown-menu-indicator"
        class="${
          cn("pointer-events-none absolute left-2 flex size-3.5 items-center justify-center")
        }"
      >
        ${() => (checked() ? circleIcon() : null)}
      </span>
      ${() => children}
    </div>
  ` as HellaNode;
}

interface DropdownMenuLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  class?: string;
}

export function DropdownMenuLabel({ inset, children, class: cls, ...attrs }: DropdownMenuLabelProps): HellaNode {
  return html`
    <div
      data-slot="dropdown-menu-label"
      data-inset="${inset ? "true" : undefined}"
      class="${
        cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function DropdownMenuSeparator({ class: cls, ...attrs }: DropdownMenuPartProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="dropdown-menu-separator"
      class="${
        cn("-mx-1 my-1 h-px bg-border", cls)
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

interface DropdownMenuShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export function DropdownMenuShortcut({ children, class: cls, ...attrs }: DropdownMenuShortcutProps): HellaNode {
  return html`
    <span
      data-slot="dropdown-menu-shortcut"
      class="${
        cn("ml-auto text-xs tracking-widest text-muted-foreground", cls)
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface DropdownMenuSubTriggerProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  inset?: boolean;
  /** Resolves the open state for `aria-expanded`/`data-state`; the composed Sub wires it. */
  state?: () => "open" | "closed";
  /** Called on click and hover intent to open the submenu. */
  onOpen?: () => void;
  class?: string;
}

export function DropdownMenuSubTrigger({ inset, state, onOpen, children, class: cls, ...attrs }: DropdownMenuSubTriggerProps): HellaNode {
  const stateOf = (): "open" | "closed" => state?.() ?? "closed";
  const teardown: (() => void)[] = [];
  return html`
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="dropdown-menu-sub-trigger"
      data-state="${stateOf}"
      data-inset="${inset ? "true" : undefined}"
      aria-haspopup="menu"
      aria-expanded="${() => (stateOf() === "open" ? "true" : "false")}"
      class="${
        cn("flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", cls)
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

interface DropdownMenuSubContentProps extends HTMLAttributes<"div"> {
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

export function DropdownMenuSubContent({ state, side: sideProp, align: alignProp, sideOffset, anchor, onDismiss, onExited, onArrowLeft, onPointerEnter, children, class: cls, ...attrs }: DropdownMenuSubContentProps): HellaNode {
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
      data-slot="dropdown-menu-sub-content"
      data-state="${stateOf}"
      data-side="${side}"
      data-align="${align}"
      class="${
        cn("z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", cls)
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: sideOffset ?? 0 }));
        if (onDismiss) {
          // Submenu layers register their own dismissal: Escape pops one
          // level, an outside pointerdown closes the sub before the parent.
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
          const onSelect = (): void => onDismiss?.();
          document.addEventListener("hella:menu-select", onSelect);
          wirings.push(() => document.removeEventListener("hella:menu-select", onSelect));
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

interface DropdownMenuSubProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

export function DropdownMenuSub({ content: contentSlot, children, class: cls, ...attrs }: DropdownMenuSubProps): HellaNode {
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
      data-slot="dropdown-menu-sub-trigger"
      data-state="${() => s.state()}"
      aria-haspopup="menu"
      aria-expanded="${() => (s.isOpen() ? "true" : "false")}"
      class="${
        cn("flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", cls)
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
          DropdownMenuSubContent({
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

interface DropdownMenuProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

let dropdownMenuCount = 0;

export default function DropdownMenu({ open, onOpenChange, content: contentSlot, children, class: cls, ...attrs }: DropdownMenuProps): HellaNode {
  const s = menuOpenState({ open, onOpenChange });
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

  return html`
    <button
      type="button"
      data-slot="dropdown-menu-trigger"
      data-state="${() => s.state()}"
      aria-haspopup="menu"
      aria-expanded="${() => (s.isOpen() ? "true" : "false")}"
      aria-controls="${contentId}"
      class="${
        cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 h-9 px-4 py-2 has-[>svg]:px-3", cls)
      }"
      on:click="${() => s.setOpen(!s.isOpen())}"
      on:keydown="${(e: Event) => {
        if ((e as KeyboardEvent).key === "ArrowDown" && !s.isOpen()) {
          e.preventDefault();
          s.setOpen(true);
        }
      }}"
      hook:afterMount="${(node: Element) => {
        if (node instanceof HTMLElement) triggerNode = node;
      }}"
      ...${attrs}
    >
      ${() => children}${() => s.visible() && Portal({
        to: "body",
        children: [
          DropdownMenuContent({
            state: s.state,
            id: contentId,
            anchor: () => triggerNode,
            onDismiss: () => s.setOpen(false),
            onExited: s.finishExit,
            children: contentSlot,
          }) as HellaChild,
        ],
      })}
    </button>
  ` as HellaNode;
}
