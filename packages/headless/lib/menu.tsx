import { effect, isBoolean, isFunction, isString, signal } from "@hellajs/core";
import { ForEach, Portal } from "@hellajs/dom";
import { menuTypeahead } from "./utils/menuTypeahead";
import { anchoredLayer } from "./internal/anchoredLayer";
import type {
  MenuCheckboxItemProps,
  MenuContentProps,
  MenuEntry,
  MenuItemProps,
  MenuLabelProps,
  MenuOptions,
  MenuPartProps,
  MenuComponents,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuShortcutProps,
  MenuSubContentProps,
  MenuSubOptions,
  MenuSubComponents,
  MenuSubTriggerProps,
  MenuTriggerProps,
  MenubarBarProps,
  MenubarMenuOptions,
  MenubarOptions,
  MenubarComponents,
} from "./types/components";

/** Document-level activation event: item selection closes every open menu layer (Radix close-on-select). */
const SELECT_EVENT = "hella:menu-select";

/** Document-level coordination events: opening a bar menu closes its siblings, and the bar mirrors which menu is open. */
const OPEN_EVENT = "hella:menubar-open";
const CLOSE_EVENT = "hella:menubar-close";

const closeAllMenus = (): void => {
  document.dispatchEvent(new CustomEvent(SELECT_EVENT));
};

/** The menu's activatable items in DOM order, disabled entries excluded (roving, typeahead, and focus-first share this). */
const menuItems = (node: ParentNode): HTMLElement[] => {
  const found = node.querySelectorAll("[role^='menuitem']");
  const items: HTMLElement[] = [];
  const len = found.length;
  let i = 0;
  while (i < len) {
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
  const len = items.length;
  let i = 0;
  while (i < len) {
    entries.push({ node: items[i]!, text: items[i]!.textContent ?? "" });
    i++;
  }
  return entries;
};

/** The content-owned keyboard model shared by every menu layer: roving arrows with wrap, Home/End, Enter/Space activation, Tab close-all, directional submenu entry that flips with the resolved writing direction, and optional horizontal-arrow handoffs (a bar menu reports both outward for open-then-move; a submenu reports ArrowLeft to close). */
const menuKeyDown =
  (handlers: { onArrowLeft?: () => void; onArrowRight?: () => void } = {}) =>
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
    data-slot="menu-check-icon"
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
    data-slot="menu-radio-icon"
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
    data-slot="menu-chevron"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/** Open/close state shared by every menu layer: controlled override, exit-holding `visible` gate. */
function menuOpenState(options: { open?: () => boolean; onOpenChange?: (open: boolean) => void }) {
  const internal = signal(false);
  const isOpen = (): boolean => (options.open !== undefined ? options.open() : internal());
  const setOpen = (next: boolean): void => {
    if (options.open === undefined) internal(next);
    options.onOpenChange?.(next);
  };
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading isOpen() in the template
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

/** The presentational and selectable rows, shared verbatim by menus, bar menus, and submenus. Item selection closes every open layer unless the item opts out. */
function makeItemComponents() {
  const Group = (props: MenuPartProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="menu-group" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Item = (props: MenuItemProps): JSX.Element => {
    const {
      children,
      class: cls,
      destructive,
      inset,
      disabled,
      "on:click": userClick,
      shortcut: shortcutSlot,
      onSelect,
      closeOnSelect,
      ...attrs
    } = props;
    return (
      <div
        role="menuitem"
        tabindex="-1"
        data-slot="menu-item"
        data-variant={destructive ? "destructive" : "default"}
        data-inset={inset ? "true" : undefined}
        data-disabled={disabled ? "true" : undefined}
        aria-disabled={disabled ? "true" : undefined}
        class={cls}
        on:click={function (e) {
          if (disabled) return;
          userClick?.call(this, e);
          onSelect?.();
          if (closeOnSelect !== false) closeAllMenus();
        }}
        {...attrs}
      >
        {children}
        {() => (shortcutSlot !== undefined ? <Shortcut>{shortcutSlot}</Shortcut> : null)}
      </div>
    );
  };

  const CheckboxItem = (props: MenuCheckboxItemProps): JSX.Element => {
    const {
      children,
      class: cls,
      checked: checkedProp,
      onCheckedChange,
      disabled,
      ...attrs
    } = props;
    const accessor = isFunction(checkedProp) ? checkedProp : undefined;
    const internal = signal(isBoolean(checkedProp) ? checkedProp : false);
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
        data-slot="menu-checkbox-item"
        aria-checked={checked() ? "true" : "false"}
        data-state={checked() ? "checked" : "unchecked"}
        data-disabled={disabled ? "true" : undefined}
        aria-disabled={disabled ? "true" : undefined}
        class={cls}
        on:click={toggle}
        {...attrs}
      >
        <span data-slot="menu-indicator">{() => (checked() ? checkIcon() : null)}</span>
        {children}
      </div>
    );
  };

  const RadioGroup = (props: MenuRadioGroupProps): JSX.Element => {
    const { children, class: cls, items, keyBy, value: valueProp, onValueChange, ...attrs } = props;
    const internal = signal("");
    const current = (): string => (valueProp !== undefined ? valueProp() : internal());
    const select = (value: string): void => {
      if (valueProp === undefined) internal(value);
      onValueChange?.(value);
    };
    return (
      <div data-slot="menu-radio-group" class={cls} {...attrs}>
        {children}
        <ForEach
          each={items ?? (() => [])}
          use={(entry: MenuEntry) => (
            <RadioItem
              key={keyBy ? entry.value : undefined}
              value={entry.value}
              checked={() => current() === entry.value}
              disabled={entry.disabled}
              onSelect={() => select(entry.value)}
            >
              {entry.label}
            </RadioItem>
          )}
        />
      </div>
    );
  };

  const RadioItem = (props: MenuRadioItemProps): JSX.Element => {
    const {
      children,
      class: cls,
      value,
      checked: checkedProp,
      onSelect,
      disabled,
      ...attrs
    } = props;
    const checked = (): boolean =>
      isFunction(checkedProp) ? checkedProp() : (checkedProp ?? false);
    return (
      <div
        role="menuitemradio"
        tabindex="-1"
        data-slot="menu-radio-item"
        data-value={value}
        aria-checked={checked() ? "true" : "false"}
        data-state={checked() ? "checked" : "unchecked"}
        data-disabled={disabled ? "true" : undefined}
        aria-disabled={disabled ? "true" : undefined}
        class={cls}
        on:click={() => {
          if (disabled) return;
          onSelect?.();
          closeAllMenus();
        }}
        {...attrs}
      >
        <span data-slot="menu-indicator">{() => (checked() ? circleIcon() : null)}</span>
        {children}
      </div>
    );
  };

  const Label = (props: MenuLabelProps): JSX.Element => {
    const { children, class: cls, inset, ...attrs } = props;
    return (
      <div data-slot="menu-label" data-inset={inset ? "true" : undefined} class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Separator = (props: MenuPartProps): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return <div role="separator" data-slot="menu-separator" class={cls} {...attrs} />;
  };

  const Shortcut = (props: MenuShortcutProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <span data-slot="menu-shortcut" class={cls} {...attrs}>
        {children}
      </span>
    );
  };

  return { Group, Item, CheckboxItem, RadioGroup, RadioItem, Label, Separator, Shortcut };
}

type ItemComponents = ReturnType<typeof makeItemComponents>;

/** A nested menu factory: its own controlled-or-internal open state, hover-intent trigger, and a content layer anchored to its own trigger on the shared layer stack. */
function makeSubComponents(items: ItemComponents, options: MenuSubOptions = {}): MenuSubComponents {
  const s = menuOpenState(options);
  let triggerNode: HTMLElement | undefined;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  // Closing the submenu returns focus to its trigger; the parent's own restore
  // owns the top-level handoff, so a detached trigger is left alone.
  let subWasOpen = false;
  effect(() => {
    if (s.isOpen()) subWasOpen = true;
    else if (subWasOpen) {
      subWasOpen = false;
      if (triggerNode?.isConnected) triggerNode.focus();
    }
  });

  const Trigger = (props: MenuSubTriggerProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div
        role="menuitem"
        tabindex="-1"
        data-slot="menu-sub-trigger"
        data-state={s.state()}
        aria-haspopup="menu"
        aria-expanded={s.isOpen() ? "true" : "false"}
        class={cls}
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
      </div>
    );
  };

  const Content = (props: MenuSubContentProps): JSX.Element => {
    const {
      children,
      class: cls,
      side: sideProp,
      align: alignProp,
      sideOffset: sideOffsetProp,
      alignOffset: alignOffsetProp,
      anchor: anchorProp,
      onExited,
      ...attrs
    } = props;
    const side = sideProp ?? "right";
    const align = alignProp ?? "start";
    const sideOffset = sideOffsetProp ?? 0;
    const alignOffset = alignOffsetProp ?? 0;
    return (
      <>
        {() =>
          s.visible() && (
            <Portal to="body">
              <div
                role="menu"
                tabindex="-1"
                data-slot="menu-sub-content"
                data-state={s.state()}
                data-side={side}
                data-align={align}
                class={cls}
                hook:afterMount={(node) => {
                  if (!(node instanceof HTMLElement)) return;
                  anchoredLayer(node, {
                    state: s.state,
                    anchor: () => anchorProp?.() ?? triggerNode,
                    side,
                    align,
                    sideOffset,
                    alignOffset,
                    focusTarget: () => menuItems(node)[0] ?? node,
                    onDismiss: () => s.setOpen(false),
                    onExited: () => {
                      s.finishExit();
                      onExited?.();
                    },
                    arm: (push) => {
                      push(
                        menuTypeahead(
                          node,
                          () => menuEntries(node),
                          (entry) => entry.node.focus(),
                        ),
                      );
                      const onKey = menuKeyDown({ onArrowLeft: () => s.setOpen(false) })(node);
                      node.addEventListener("keydown", onKey);
                      push(() => node.removeEventListener("keydown", onKey));
                      const onSelect = (): void => s.setOpen(false);
                      document.addEventListener(SELECT_EVENT, onSelect);
                      push(() => document.removeEventListener(SELECT_EVENT, onSelect));
                      // Pointer entering the content cancels the trigger's
                      // pending close (the pointer is in transit).
                      const onPointerEnter = (): void => {
                        if (closeTimer !== null) {
                          clearTimeout(closeTimer);
                          closeTimer = null;
                        }
                      };
                      node.addEventListener("pointerenter", onPointerEnter);
                      push(() => node.removeEventListener("pointerenter", onPointerEnter));
                    },
                  });
                }}
                {...attrs}
              >
                {children}
              </div>
            </Portal>
          )
        }
      </>
    );
  };

  return { Trigger, Content, ...items };
}

let menuCount = 0;

/**
 * Creates the menu part set: `Trigger`, `Content`, the selectable rows
 * (`Item`, `CheckboxItem`, `RadioGroup`, `RadioItem`), the structural rows
 * (`Label`, `Separator`, `Group`, `Shortcut`), and `sub()` for nested
 * submenus. The closure owns the open state — controlled through an `open`
 * getter when passed, an internal signal when omitted — the exit machine, and
 * the generated content id. `Content` portals to `document.body`, anchors to
 * the trigger (or the virtual pointer anchor in contextmenu mode), and arms
 * typeahead, roving arrows, and stacked dismissal while open. Call in
 * component scope so the state machine's effect disposes with the component.
 *
 * ```tsx
 * const Menu = menu({ onOpenChange });
 *
 * <Menu.Trigger>Actions</Menu.Trigger>
 * <Menu.Content side="bottom">
 *   <Menu.Item onSelect={save}>Save</Menu.Item>
 * </Menu.Content>
 * ```
 * @param options `open` getter + `onOpenChange`, plus the trigger model — `"click"` (default) or `"contextmenu"` for pointer-anchored menus.
 * @returns The part set, composed as `Menu.Trigger`-style members.
 */
export function menu(options: MenuOptions = {}): MenuComponents {
  const mode = options.trigger ?? "click";
  const s = menuOpenState(options);
  const items = makeItemComponents();
  const contentId = `hella-menu-content-${++menuCount}`;
  let triggerNode: HTMLElement | undefined;
  let anchorNode: HTMLElement | undefined;

  // The contextmenu model: a zero-size fixed anchor node marks the pointer
  // position, and the content positions against it through the fixed-coords
  // path (collision flipping included).
  const removeAnchor = (): void => {
    if (anchorNode !== undefined) {
      anchorNode.remove();
      anchorNode = undefined;
    }
  };
  const openAt = (x: number, y: number): void => {
    removeAnchor();
    const anchor = document.createElement("span");
    anchor.dataset.slot = "menu-anchor";
    anchor.style.position = "fixed";
    anchor.style.left = `${x}px`;
    anchor.style.top = `${y}px`;
    anchor.style.width = "0px";
    anchor.style.height = "0px";
    document.body.appendChild(anchor);
    anchorNode = anchor;
    s.setOpen(true);
  };

  // Focus returns to the trigger when the menu closes (one open→closed flip
  // only, so the initial closed state never steals focus at mount). The
  // contextmenu mode also drops its virtual anchor.
  let wasOpenForFocus = false;
  effect(() => {
    if (s.isOpen()) wasOpenForFocus = true;
    else if (wasOpenForFocus) {
      wasOpenForFocus = false;
      if (mode === "contextmenu") {
        removeAnchor();
        if (triggerNode?.isConnected) triggerNode.focus();
      } else {
        triggerNode?.focus();
      }
    }
  });

  const Trigger = (props: MenuTriggerProps): JSX.Element => {
    const { children, class: cls, "on:click": userClick, ...attrs } = props;
    return (
      <button
        type="button"
        data-slot="menu-trigger"
        data-state={s.state()}
        aria-haspopup="menu"
        aria-expanded={s.isOpen() ? "true" : "false"}
        aria-controls={contentId}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          s.setOpen(!s.isOpen());
        }}
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
      </button>
    );
  };

  const ContextTrigger = (props: MenuTriggerProps): JSX.Element => {
    const { children, class: cls, "on:contextmenu": userMenu, ...attrs } = props;
    return (
      <span
        data-slot="menu-trigger"
        data-state={s.state()}
        aria-haspopup="menu"
        tabindex="-1"
        class={cls}
        on:contextmenu={function (e) {
          userMenu?.call(this, e);
          e.preventDefault();
          openAt((e as MouseEvent).clientX, (e as MouseEvent).clientY);
        }}
        hook:afterMount={(node) => {
          if (node instanceof HTMLElement) triggerNode = node;
        }}
        hook:beforeDestroy={() => {
          // An unmount while open must not strand the virtual anchor in body.
          removeAnchor();
        }}
        {...attrs}
      >
        {children}
      </span>
    );
  };

  const Content = (props: MenuContentProps): JSX.Element => {
    const {
      children,
      class: cls,
      id,
      side: sideProp,
      align: alignProp,
      sideOffset: sideOffsetProp,
      alignOffset: alignOffsetProp,
      anchor: anchorProp,
      onArrowLeft,
      onExited,
      ...attrs
    } = props;
    const side = sideProp ?? "bottom";
    const align = alignProp ?? "start";
    // Pointer-anchored menus sit flush against the virtual anchor; trigger
    // menus keep a one-step gap.
    const sideOffset = sideOffsetProp ?? (mode === "contextmenu" ? 0 : 4);
    const alignOffset = alignOffsetProp ?? 0;
    return (
      <>
        {() =>
          s.visible() && (
            <Portal to="body">
              <div
                role="menu"
                tabindex="-1"
                id={id ?? contentId}
                data-slot="menu-content"
                data-state={s.state()}
                data-side={side}
                data-align={align}
                class={cls}
                hook:afterMount={(node) => {
                  if (!(node instanceof HTMLElement)) return;
                  anchoredLayer(node, {
                    state: s.state,
                    anchor: () =>
                      anchorProp?.() ?? (mode === "contextmenu" ? anchorNode : triggerNode),
                    side,
                    align,
                    sideOffset,
                    alignOffset,
                    focusTarget: () => menuItems(node)[0] ?? node,
                    onDismiss: () => s.setOpen(false),
                    onExited: () => {
                      s.finishExit();
                      onExited?.();
                    },
                    arm: (push) => {
                      push(
                        menuTypeahead(
                          node,
                          () => menuEntries(node),
                          (entry) => entry.node.focus(),
                        ),
                      );
                      const onKey = menuKeyDown(onArrowLeft ? { onArrowLeft } : {})(node);
                      node.addEventListener("keydown", onKey);
                      push(() => node.removeEventListener("keydown", onKey));
                      const onSelect = (): void => s.setOpen(false);
                      document.addEventListener(SELECT_EVENT, onSelect);
                      push(() => document.removeEventListener(SELECT_EVENT, onSelect));
                    },
                  });
                }}
                {...attrs}
              >
                {children}
              </div>
            </Portal>
          )
        }
      </>
    );
  };

  return {
    Trigger: mode === "contextmenu" ? ContextTrigger : Trigger,
    Content,
    ...items,
    sub: (subOptions?: MenuSubOptions) => makeSubComponents(items, subOptions),
  };
}

let menubarMenuCount = 0;

/**
 * Creates the menubar pair: the `Bar` root and a `menu()` factory for
 * coordinated bar menus. `Bar` roves focus across its triggers with the
 * horizontal arrows while no menu is open and mirrors the open menu's id into
 * its value (controlled-or-internal, the registry's `value`/`onValueChange`
 * contract). Each `Bar.menu()` call returns a full menu part set whose open
 * state announces to the bar — opening one menu closes its siblings, and the
 * horizontal arrows inside an open menu hand off to the adjacent trigger
 * (open-then-move). Call in component scope so the coordination effects
 * dispose with the component.
 *
 * ```tsx
 * const Menubar = menubar({ value, onValueChange });
 * const File = Menubar.menu();
 *
 * <Menubar.Bar>
 *   <File.Trigger>File</File.Trigger>
 *   <File.Content>...</File.Content>
 * </Menubar.Bar>
 * ```
 * @param options `value` getter + `onValueChange`; an omitted `value` keeps the bar's open-menu id internal.
 * @returns The bar root and the coordinated menu factory.
 */
export function menubar(options: MenubarOptions = {}): MenubarComponents {
  const value = options.value;
  const internal = signal("");
  const active = (): string => (value !== undefined ? value() : internal());
  const setActive = (next: string): void => {
    if (value === undefined) internal(next);
    options.onValueChange?.(next);
  };
  let barNode: HTMLElement | undefined;

  // Mirror the bar menus' announcements into the bar's open-menu value.
  const onMenuOpen = (event: Event): void => {
    const id = (event as CustomEvent).detail?.id;
    if (isString(id)) setActive(id);
  };
  const onMenuClose = (event: Event): void => {
    const id = (event as CustomEvent).detail?.id;
    if (isString(id) && active() === id) setActive("");
  };

  // Bar keyboard with no menu open: left/right move focus between triggers
  // (open-then-move is the bar menu's own handoff, not the bar's). A direct
  // listener, not on: - delegation leaves currentTarget at body.
  const onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const focused = document.activeElement?.closest?.(
      "button[aria-haspopup='menu']",
    ) as HTMLElement | null;
    if (!focused || focused.getAttribute("data-state") === "open") return;
    const bar = focused.closest("[role='menubar']");
    if (!bar || bar !== barNode) return;
    const triggers = Array.from(bar.querySelectorAll("button[aria-haspopup='menu']"));
    if (triggers.length === 0) return;
    const current = triggers.indexOf(focused);
    if (current === -1) return;
    e.preventDefault();
    const next = triggers[
      (current + (e.key === "ArrowRight" ? 1 : -1) + triggers.length) % triggers.length
    ] as HTMLElement;
    next.focus();
  };

  const Bar = (props: MenubarBarProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div
        role="menubar"
        data-slot="menubar"
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          barNode = node;
          node.addEventListener("keydown", onKeyDown);
          document.addEventListener(OPEN_EVENT, onMenuOpen);
          document.addEventListener(CLOSE_EVENT, onMenuClose);
        }}
        hook:beforeDestroy={() => {
          if (barNode !== undefined) {
            barNode.removeEventListener("keydown", onKeyDown);
            document.removeEventListener(OPEN_EVENT, onMenuOpen);
            document.removeEventListener(CLOSE_EVENT, onMenuClose);
            barNode = undefined;
          }
        }}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  const menu = (menuOptions: MenubarMenuOptions = {}): MenuComponents => {
    const s = menuOpenState(menuOptions);
    const items = makeItemComponents();
    const menuId = menuOptions.value ?? `hella-menubar-menu-${++menubarMenuCount}`;
    const contentId = `${menuId}-content`;
    let triggerNode: HTMLElement | undefined;

    // Announce every flip so sibling menus close (second opens, first closes)
    // and the bar mirrors which menu is open. Closing under Tab runs through
    // closeAllMenus, so the item-model activation event also lands here.
    let announced = false;
    effect(() => {
      if (s.isOpen()) {
        announced = true;
        document.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { id: menuId } }));
      } else if (announced) {
        announced = false;
        document.dispatchEvent(new CustomEvent(CLOSE_EVENT, { detail: { id: menuId } }));
      }
    });

    // Bar coordination: a sibling opening closes this menu without re-announcing.
    const onSiblingOpen = (event: Event): void => {
      const id = (event as CustomEvent).detail?.id;
      if (id !== menuId) s.setOpen(false);
    };

    // Focus returns to the trigger when the menu closes (one open→closed flip
    // only, so the initial closed state never steals focus at mount).
    let wasOpenForFocus = false;
    effect(() => {
      if (s.isOpen()) wasOpenForFocus = true;
      else if (wasOpenForFocus) {
        wasOpenForFocus = false;
        if (triggerNode?.isConnected) triggerNode.focus();
      }
    });

    // Open-then-move: both horizontal arrows hand off to the adjacent trigger
    // in the same bar; its click opens that menu and the announcement closes
    // this one.
    const onArrow = (direction: "left" | "right"): void => {
      if (!triggerNode) return;
      const bar = triggerNode.closest("[role='menubar']");
      const triggers = bar ? Array.from(bar.querySelectorAll("button[aria-haspopup='menu']")) : [];
      const index = triggers.indexOf(triggerNode);
      if (index === -1 || triggers.length < 2) return;
      const next = triggers[
        (index + (direction === "right" ? 1 : -1) + triggers.length) % triggers.length
      ] as HTMLElement;
      next.focus();
      next.dispatchEvent(new Event("click", { bubbles: true }));
    };

    const Trigger = (props: MenuTriggerProps): JSX.Element => {
      const { children, class: cls, "on:click": userClick, ...attrs } = props;
      return (
        <button
          type="button"
          data-slot="menu-trigger"
          data-state={s.state()}
          aria-haspopup="menu"
          aria-expanded={s.isOpen() ? "true" : "false"}
          aria-controls={contentId}
          class={cls}
          on:click={function (e) {
            userClick?.call(this, e);
            s.setOpen(!s.isOpen());
          }}
          on:keydown={(e) => {
            if ((e as KeyboardEvent).key === "ArrowDown" && !s.isOpen()) {
              e.preventDefault();
              s.setOpen(true);
            }
          }}
          hook:afterMount={(node) => {
            if (!(node instanceof HTMLElement)) return;
            triggerNode = node;
            document.addEventListener(OPEN_EVENT, onSiblingOpen);
          }}
          hook:beforeDestroy={() => {
            document.removeEventListener(OPEN_EVENT, onSiblingOpen);
          }}
          {...attrs}
        >
          {children}
        </button>
      );
    };

    const Content = (props: MenuContentProps): JSX.Element => {
      const {
        children,
        class: cls,
        id,
        side: sideProp,
        align: alignProp,
        sideOffset: sideOffsetProp,
        alignOffset: alignOffsetProp,
        anchor: anchorProp,
        onExited,
        ...attrs
      } = props;
      const side = sideProp ?? "bottom";
      const align = alignProp ?? "start";
      const sideOffset = sideOffsetProp ?? 8;
      const alignOffset = alignOffsetProp ?? -4;
      return (
        <>
          {() =>
            s.visible() && (
              <Portal to="body">
                <div
                  role="menu"
                  tabindex="-1"
                  id={id ?? contentId}
                  data-slot="menu-content"
                  data-state={s.state()}
                  data-side={side}
                  data-align={align}
                  class={cls}
                  hook:afterMount={(node) => {
                    if (!(node instanceof HTMLElement)) return;
                    anchoredLayer(node, {
                      state: s.state,
                      anchor: () => anchorProp?.() ?? triggerNode,
                      side,
                      align,
                      sideOffset,
                      alignOffset,
                      focusTarget: () => menuItems(node)[0] ?? node,
                      onDismiss: () => s.setOpen(false),
                      onExited: () => {
                        s.finishExit();
                        onExited?.();
                      },
                      arm: (push) => {
                        push(
                          menuTypeahead(
                            node,
                            () => menuEntries(node),
                            (entry) => entry.node.focus(),
                          ),
                        );
                        // Open-then-move: the horizontal arrows hand off in
                        // both directions; a submenu's ArrowLeft exit is the
                        // sub content's own wiring, not the bar menu's.
                        const onKey = menuKeyDown({
                          onArrowLeft: () => onArrow("left"),
                          onArrowRight: () => onArrow("right"),
                        })(node);
                        node.addEventListener("keydown", onKey);
                        push(() => node.removeEventListener("keydown", onKey));
                        const onSelect = (): void => s.setOpen(false);
                        document.addEventListener(SELECT_EVENT, onSelect);
                        push(() => document.removeEventListener(SELECT_EVENT, onSelect));
                      },
                    });
                  }}
                  {...attrs}
                >
                  {children}
                </div>
              </Portal>
            )
          }
        </>
      );
    };

    return {
      Trigger,
      Content,
      ...items,
      sub: (subOptions?: MenuSubOptions) => makeSubComponents(items, subOptions),
    };
  };

  return { Bar, menu };
}
