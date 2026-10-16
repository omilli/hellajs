import { effect, signal } from "@hellajs/core";
import { anchorPosition, ForEach, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { Placement } from "@hellajs/dom";
import type {
  AnchorSide,
  AnchorAlign,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuPartProps,
  DropdownMenuItemProps,
  DropdownMenuCheckboxItemProps,
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioItemProps,
  DropdownMenuLabelProps,
  DropdownMenuShortcutProps,
  DropdownMenuSubTriggerProps,
  DropdownMenuSubContentProps,
  DropdownMenuSubProps,
  DropdownMenuProps,
} from "./dropdown-menu-types.js";

// @hella:styles
declare const base: string;
declare const checkItem: string;
declare const chevron: string;
declare const content: string;
declare const icon: string;
declare const indicator: string;
declare const item: string;
declare const label: string;
declare const radioIcon: string;
declare const radioItem: string;
declare const separator: string;
declare const shortcut: string;
declare const subContent: string;
declare const subTrigger: string;
// @hella:end

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

/** Document-level activation event: item selection closes every open menu layer (Radix close-on-select). */
const SELECT_EVENT = "hella:menu-select";

const closeAllMenus = (): void => {
  document.dispatchEvent(new CustomEvent(SELECT_EVENT));
};

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
  return {
    isOpen,
    setOpen,
    state: (): "open" | "closed" => (isOpen() ? "open" : "closed"),
    visible,
    finishExit,
  };
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
const menuKeyDown =
  (onArrowLeft?: () => void) =>
  (node: HTMLElement) =>
  (event: Event): void => {
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
      // @hella:compose
      [icon]
      // @hella:end
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
      // @hella:compose
      [radioIcon]
      // @hella:end
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
      // @hella:compose
      [chevron]
      // @hella:end
    }
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/** The manual trigger button; the composed DropdownMenu renders the same shape wired to toggle + aria state. */
export function DropdownMenuTrigger({
  children,
  class: cls,
  ...attrs
}: DropdownMenuTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="dropdown-menu-trigger"
      aria-haspopup="menu"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  state,
  id,
  side: sideProp,
  align: alignProp,
  sideOffset,
  alignOffset: alignOffsetProp,
  anchor,
  onDismiss,
  onExited,
  onArrowLeft,
  children,
  class: cls,
  ...attrs
}: DropdownMenuContentProps): JSX.Element {
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

  return (
    <div
      role="menu"
      tabindex="-1"
      id={id}
      data-slot="dropdown-menu-content"
      data-state={stateOf()}
      data-side={side}
      data-align={align}
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null)
          wirings.push(
            anchorPosition(anchorEl, node, {
              placement: placementOf(side, align),
              offset: sideOffset ?? 4,
            }),
          );
        if (alignOffset !== 0) {
          // Cross-axis shift over the placed coordinates; the placement axis
          // stays owned by anchorPosition's left/top writes.
          node.style.translate =
            side === "top" || side === "bottom" ? `${alignOffset}px 0` : `0 ${alignOffset}px`;
        }
        if (onDismiss) {
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
          const onSelect = (): void => onDismiss?.();
          document.addEventListener(SELECT_EVENT, onSelect);
          wirings.push(() => document.removeEventListener(SELECT_EVENT, onSelect));
        }
        wirings.push(
          menuTypeahead(
            node,
            () => menuEntries(node),
            (entry) => entry.node.focus(),
          ),
        );
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

export function DropdownMenuGroup({
  children,
  class: cls,
  ...attrs
}: DropdownMenuPartProps): JSX.Element {
  return (
    <div
      data-slot="dropdown-menu-group"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  destructive,
  inset,
  disabled,
  "on:click": userClick,
  shortcut: shortcutSlot,
  children,
  class: cls,
  ...attrs
}: DropdownMenuItemProps): JSX.Element {
  return (
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="dropdown-menu-item"
      data-variant={destructive ? "destructive" : "default"}
      data-inset={inset ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
      on:click={function (e) {
        if (disabled) return;
        userClick?.call(this, e);
        closeAllMenus();
      }}
      {...attrs}
    >
      {children}
      {() =>
        shortcutSlot !== undefined ? (
          <DropdownMenuShortcut>{shortcutSlot}</DropdownMenuShortcut>
        ) : null
      }
    </div>
  );
}

export function DropdownMenuCheckboxItem({
  checked: checkedProp,
  onCheckedChange,
  disabled,
  children,
  class: cls,
  ...attrs
}: DropdownMenuCheckboxItemProps): JSX.Element {
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
      data-slot="dropdown-menu-checkbox-item"
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      data-disabled={disabled ? "true" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      class={
        // @hella:compose
        [checkItem, cls]
        // @hella:end
      }
      on:click={toggle}
      {...attrs}
    >
      <span
        data-slot="dropdown-menu-indicator"
        class={
          // @hella:compose
          [indicator]
          // @hella:end
        }
      >
        {() => (checked() ? checkIcon() : null)}
      </span>
      {children}
    </div>
  );
}

export function DropdownMenuRadioGroup({
  items,
  keyBy,
  value: valueProp,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: DropdownMenuRadioGroupProps): JSX.Element {
  const internal = signal("");
  const current = (): string => (valueProp !== undefined ? valueProp() : internal());
  const select = (value: string): void => {
    if (valueProp === undefined) internal(value);
    onValueChange?.(value);
  };
  return (
    <div
      data-slot="dropdown-menu-radio-group"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      <ForEach
        each={items ?? (() => [])}
        use={(entry) => (
          <DropdownMenuRadioItem
            key={keyBy ? entry.value : undefined}
            value={entry.value}
            checked={() => current() === entry.value}
            disabled={entry.disabled}
            onSelect={() => select(entry.value)}
          >
            {entry.label}
          </DropdownMenuRadioItem>
        )}
      />
    </div>
  );
}

export function DropdownMenuRadioItem({
  value,
  checked: checkedProp,
  onSelect,
  disabled,
  children,
  class: cls,
  ...attrs
}: DropdownMenuRadioItemProps): JSX.Element {
  const checked = (): boolean =>
    typeof checkedProp === "function" ? checkedProp() : (checkedProp ?? false);
  return (
    <div
      role="menuitemradio"
      tabindex="-1"
      data-slot="dropdown-menu-radio-item"
      data-value={value}
      aria-checked={checked() ? "true" : "false"}
      data-state={checked() ? "checked" : "unchecked"}
      data-disabled={disabled ? "true" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      class={
        // @hella:compose
        [radioItem, cls]
        // @hella:end
      }
      on:click={() => {
        if (disabled) return;
        onSelect?.();
        closeAllMenus();
      }}
      {...attrs}
    >
      <span
        data-slot="dropdown-menu-indicator"
        class={
          // @hella:compose
          [indicator]
          // @hella:end
        }
      >
        {() => (checked() ? circleIcon() : null)}
      </span>
      {children}
    </div>
  );
}

export function DropdownMenuLabel({
  inset,
  children,
  class: cls,
  ...attrs
}: DropdownMenuLabelProps): JSX.Element {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset ? "true" : undefined}
      class={
        // @hella:compose
        [label, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({
  class: cls,
  ...attrs
}: DropdownMenuPartProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="dropdown-menu-separator"
      class={
        // @hella:compose
        [separator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function DropdownMenuShortcut({
  children,
  class: cls,
  ...attrs
}: DropdownMenuShortcutProps): JSX.Element {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
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

export function DropdownMenuSubTrigger({
  inset,
  state,
  onOpen,
  children,
  class: cls,
  ...attrs
}: DropdownMenuSubTriggerProps): JSX.Element {
  const stateOf = (): "open" | "closed" => state?.() ?? "closed";
  const teardown: (() => void)[] = [];
  return (
    <div
      role="menuitem"
      tabindex="-1"
      data-slot="dropdown-menu-sub-trigger"
      data-state={stateOf()}
      data-inset={inset ? "true" : undefined}
      aria-haspopup="menu"
      aria-expanded={stateOf() === "open" ? "true" : "false"}
      class={
        // @hella:compose
        [subTrigger, cls]
        // @hella:end
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

export function DropdownMenuSubContent({
  state,
  side: sideProp,
  align: alignProp,
  sideOffset,
  anchor,
  onDismiss,
  onExited,
  onArrowLeft,
  onPointerEnter,
  children,
  class: cls,
  ...attrs
}: DropdownMenuSubContentProps): JSX.Element {
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
      data-slot="dropdown-menu-sub-content"
      data-state={stateOf()}
      data-side={side}
      data-align={align}
      class={
        // @hella:compose
        [subContent, cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = anchor?.();
        if (anchorEl != null)
          wirings.push(
            anchorPosition(anchorEl, node, {
              placement: placementOf(side, align),
              offset: sideOffset ?? 0,
            }),
          );
        if (onDismiss) {
          // Submenu layers register their own dismissal: Escape pops one
          // level, an outside pointerdown closes the sub before the parent.
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
          const onSelect = (): void => onDismiss?.();
          document.addEventListener(SELECT_EVENT, onSelect);
          wirings.push(() => document.removeEventListener(SELECT_EVENT, onSelect));
        }
        wirings.push(
          menuTypeahead(
            node,
            () => menuEntries(node),
            (entry) => entry.node.focus(),
          ),
        );
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

export function DropdownMenuSub({
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: DropdownMenuSubProps): JSX.Element {
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
        // @hella:compose
        [subTrigger, cls]
        // @hella:end
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
      {() =>
        s.visible() && (
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
              children={contentSlot}
            />
          </Portal>
        )
      }
    </div>
  );
}

let dropdownMenuCount = 0;

export function DropdownMenu({
  open,
  onOpenChange,
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: DropdownMenuProps): JSX.Element {
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

  return (
    <button
      type="button"
      data-slot="dropdown-menu-trigger"
      data-state={s.state()}
      aria-haspopup="menu"
      aria-expanded={s.isOpen() ? "true" : "false"}
      aria-controls={contentId}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
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
      {...attrs}
    >
      {children}
      {() =>
        s.visible() && (
          <Portal to="body">
            <DropdownMenuContent
              state={s.state}
              id={contentId}
              anchor={() => triggerNode}
              onDismiss={() => s.setOpen(false)}
              onExited={s.finishExit}
              children={contentSlot}
            />
          </Portal>
        )
      }
    </button>
  );
}
