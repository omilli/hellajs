import { effect, signal } from "@hellajs/core";
import { anchorPosition, hoverIntent, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

/**
 * The state SidebarProvider threads to its children function - hella has no
 * context primitive, so the provider's composition root hands every manual
 * part its accessors (the dual-surface counterpart of the ref's useSidebar).
 */
interface SidebarState {
  /** Desktop expanded state. */
  open: () => boolean;
  /** Desktop open setter (writes the internal signal unless controlled). */
  setOpen: (open: boolean) => void;
  /** Mobile viewport (max-width: 769px). */
  mobile: () => boolean;
  /** Mobile sheet open state. */
  openMobile: () => boolean;
  /** Mobile sheet open setter. */
  setOpenMobile: (open: boolean) => void;
  /** Toggles the mobile sheet on mobile, the desktop open state otherwise. */
  onToggle: () => void;
}

interface SidebarProviderProps {
  /** Controlled open state. When given, the provider never writes its internal signal and `onOpenChange` reports the requested flip. */
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: (state: SidebarState) => HellaChildren;
  class?: string;
}

export function SidebarProvider(props: SidebarProviderProps): JSX.Element {
  const internal = signal(props.defaultOpen ?? true);
  // Two separate states the ref also splits: the viewport query and the
  // mobile sheet's own open flag - conflating them would flip the branch
  // back to desktop on sheet close.
  const viewport = signal(false);
  const sheetOpen = signal(false);
  const open = (): boolean => (props.open !== undefined ? props.open() : internal());
  const setOpen = (next: boolean): void => {
    if (props.open === undefined) internal(next);
    props.onOpenChange?.(next);
  };
  const openMobile = (): boolean => sheetOpen();
  const setOpenMobile = (next: boolean): void => {
    sheetOpen(next);
  };
  const mobile = (): boolean => viewport();
  const onToggle = (): void => (mobile() ? setOpenMobile(!openMobile()) : setOpen(!open()));
  const teardown: (() => void)[] = [];

  return (
    <div
      data-slot="sidebar-wrapper"
      style="--sidebar-width: 16rem; --sidebar-width-icon: 3rem"
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
      hook:afterMount={() => {
        // Mobile detection: the ref's use-mobile hook, inlined as a
        // max-width media query listener on the wrapper's mount.
        const query = window.matchMedia("(max-width: 769px)");
        const onMediaChange = (): void => {
          viewport(query.matches);
        };
        query.addEventListener("change", onMediaChange);
        teardown.push(() => query.removeEventListener("change", onMediaChange));
        onMediaChange();
        // Ctrl/Cmd+B toggles the sidebar (the ref's keyboard shortcut).
        const onKeyDown = (event: KeyboardEvent): void => {
          if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onToggle();
          }
        };
        window.addEventListener("keydown", onKeyDown);
        teardown.push(() => window.removeEventListener("keydown", onKeyDown));
      }}
      hook:beforeDestroy={() => {
        while (teardown.length) teardown.pop()!();
      }}
    >
      {props.children({ open, setOpen, mobile, openMobile, setOpenMobile, onToggle })}
    </div>
  );
}

/** Side the desktop panel hugs. */
type SidebarSide = "left" | "right";

type SidebarVariant = "sidebar" | "floating" | "inset";

type SidebarCollapsible = "offcanvas" | "icon" | "none";

interface SidebarProps {
  /** Desktop expanded accessor threaded from SidebarProvider. */
  open?: () => boolean;
  /** Mobile viewport accessor threaded from SidebarProvider. */
  mobile?: () => boolean;
  /** Mobile sheet open accessor threaded from SidebarProvider. */
  openMobile?: () => boolean;
  /** Mobile sheet open setter threaded from SidebarProvider. */
  onOpenMobileChange?: (open: boolean) => void;
  side?: SidebarSide;
  variant?: SidebarVariant;
  collapsible?: SidebarCollapsible;
  class?: string;
  children?: HellaChildren;
}

let sidebarCount = 0;

export function Sidebar(props: SidebarProps): JSX.Element {
  const side = props.side ?? "left";
  const variant = props.variant ?? "sidebar";
  const collapsible = props.collapsible ?? "offcanvas";
  const collapsed = (): boolean => props.open !== undefined && props.open() === false;
  const variantIsInset = variant === "floating" || variant === "inset";

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        class={
          // @hella:compose
          [none, props.class]
          // @hella:end
        }
      >
        {() => props.children}
      </div>
    );
  }

  // The mobile/desktop fork is a reactive branch - reading mobile() in an
  // early return would bake the branch at first evaluation and the
  // provider's matchMedia flip would never propagate.
  return (
    <>
      {() => props.mobile?.() === true ? (
        <SidebarMobileSheet
          open={() => props.openMobile?.() ?? false}
          onClose={() => props.onOpenMobileChange?.(false)}
          side={side}
          children={flattenChildren(props.children)}
        />
      ) : (
        <div
          data-slot="sidebar"
          data-state={collapsed() ? "collapsed" : "expanded"}
          data-collapsible={collapsed() ? collapsible : undefined}
          data-variant={variant}
          data-side={side}
          class={
            // @hella:compose
            [sidebar]
            // @hella:end
          }
        >
          {/* This is what handles the sidebar gap on desktop */}
          <div
            data-slot="sidebar-gap"
            class={
              // @hella:compose
              [gap, variantIsInset ? gapInset : gapPlain]
              // @hella:end
            }
          />
          <div
            data-slot="sidebar-container"
            class={
              // @hella:compose
              [container, containerSides[side], variantIsInset ? containerInset : containerPlain, props.class]
              // @hella:end
            }
          >
            <div
              data-sidebar="sidebar"
              data-slot="sidebar-inner"
              class={
                // @hella:compose
                [inner]
                // @hella:end
              }
            >
              {() => props.children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface SidebarMobileSheetProps {
  open: () => boolean;
  onClose: () => void;
  side: SidebarSide;
  children?: HellaChildren;
}

/**
 * The mobile panel: the ref renders Sidebar inside its Sheet entry; this
 * entry is self-contained, so the sheet mechanics (overlay, slide pair,
 * escape/outside/trap wiring, exit hold) are duplicated inline.
 */
function SidebarMobileSheet(props: SidebarMobileSheetProps): JSX.Element {
  const side = props.side;
  const titleId = `hella-sidebar-title-${++sidebarCount}`;
  const descriptionId = `hella-sidebar-description-${sidebarCount}`;
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading open() in the template
  // would flash the subtree away one evaluation early).
  const visible = signal(false);
  let wasOpen = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  let panel: HTMLElement | undefined;

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

  const finishExit = (): void => {
    if (fallback !== undefined) {
      clearTimeout(fallback);
      fallback = undefined;
    }
    visible(false);
  };

  // Flip to open renders immediately; flip to closed starts the exit - the
  // panel stays mounted under data-state="closed" until its animationend
  // (or the copied 350ms budget) unmounts it.
  effect(() => {
    if (props.open()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 350);
    }
  });

  // The exit runs unwired: flipping closed tears the trap/escape/outside
  // handlers down immediately; reopening re-arms them without a remount.
  effect(() => {
    if (props.open() === false) disposeWirings();
    else installWirings();
  });

  const state = (): "open" | "closed" => (props.open() ? "open" : "closed");

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <div
            data-slot="sidebar-overlay"
            data-state={state()}
            class={
              // @hella:compose
              [overlay]
              // @hella:end
            }
          />
          <div
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            data-state={state()}
            data-side={side}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            style="--sidebar-width: 18rem"
            class={
              // @hella:compose
              [mobile, mobileSides[side]]
              // @hella:end
            }
            hook:afterMount={(node) => {
              if (!(node instanceof HTMLElement)) return;
              panel = node;
              installWirings();
              // The exit's animationend (state already "closed") is the
              // primary unmount trigger; the entry's is ignored.
              const onAnimationEnd = (): void => {
                if (props.open() === false) finishExit();
              };
              node.addEventListener("animationend", onAnimationEnd);
              teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
            }}
            hook:beforeDestroy={() => {
              disposeWirings();
              while (teardown.length) teardown.pop()!();
            }}
          >
            <h2 id={titleId} class="sr-only">Sidebar</h2>
            <p id={descriptionId} class="sr-only">Displays the mobile sidebar.</p>
            <div
              class={
                // @hella:compose
                [mobileInner]
                // @hella:end
              }
            >{() => props.children}</div>
          </div>
        </Portal>
      )}
    </>
  );
}

interface SidebarTriggerProps {
  onclick?: () => void;
  onToggle?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarTrigger(props: SidebarTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      class={
        // @hella:compose
        [trigger, props.class]
        // @hella:end
      }
      on:click={() => {
        props.onclick?.();
        props.onToggle?.();
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></svg>
      <span class="sr-only">Toggle Sidebar</span>
    </button>
  );
}

interface SidebarRailProps {
  onToggle?: () => void;
  class?: string;
  children?: HellaChildren;
}

/** The drag-handle edge - click toggles; width dragging is out of scope (bounded open). */
export function SidebarRail(props: SidebarRailProps): JSX.Element {
  return (
    <button
      type="button"
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      title="Toggle Sidebar"
      tabIndex={-1}
      class={
        // @hella:compose
        [rail, props.class]
        // @hella:end
      }
      on:click={() => props.onToggle?.()}
    >
      {() => props.children}
    </button>
  );
}

interface SidebarPartProps {
  children?: HellaChildren;
  class?: string;
}

export function SidebarInset(props: SidebarPartProps): JSX.Element {
  return (
    <main
      data-slot="sidebar-inset"
      class={
        // @hella:compose
        [inset, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </main>
  );
}

interface SidebarInputProps {
  value?: string | (() => string);
  type?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}

export function SidebarInput(props: SidebarInputProps): JSX.Element {
  return (
    <input
      data-sidebar="input"
      data-slot="sidebar-input"
      type={props.type}
      placeholder={props.placeholder}
      id={props.id}
      ariaLabel={props.ariaLabel}
      aria-invalid={props.ariaInvalid ? "true" : undefined}
      value={props.value}
      class={
        // @hella:compose
        [inputBase, inputFocus, inputInvalid, input, props.class]
        // @hella:end
      }
      on:input={(e: Event) => props.oninput?.((e.target as HTMLInputElement).value)}
    />
  );
}

export function SidebarHeader(props: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      class={
        // @hella:compose
        [header, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

export function SidebarFooter(props: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      class={
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

export function SidebarSeparator(props: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-separator"
      data-sidebar="separator"
      role="separator"
      data-orientation="horizontal"
      aria-orientation="horizontal"
      class={
        // @hella:compose
        [separatorBase, separator, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

export function SidebarContent(props: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      class={
        // @hella:compose
        [content, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

export function SidebarGroup(props: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      class={
        // @hella:compose
        [group, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

export function SidebarGroupLabel(props: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      class={
        // @hella:compose
        [groupLabel, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

interface SidebarGroupActionProps {
  onclick?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarGroupAction(props: SidebarGroupActionProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      class={
        // @hella:compose
        [groupAction, props.class]
        // @hella:end
      }
      on:click={() => props.onclick?.()}
    >
      {() => props.children}
    </button>
  );
}

export function SidebarGroupContent(props: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      class={
        // @hella:compose
        [groupContent, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

export function SidebarMenu(props: SidebarPartProps): JSX.Element {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      class={
        // @hella:compose
        [menu, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </ul>
  );
}

export function SidebarMenuItem(props: SidebarPartProps): JSX.Element {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      class={
        // @hella:compose
        [menuItem, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </li>
  );
}

interface SidebarMenuButtonProps {
  active?: boolean;
  /** Tooltip label shown while the sidebar is collapsed to icon mode (hover). */
  tooltip?: HellaChildren;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  /** Desktop open accessor threaded from SidebarProvider; the tooltip hides while expanded. */
  open?: () => boolean;
  /** Mobile viewport accessor threaded from SidebarProvider; the tooltip never shows on mobile. */
  mobile?: () => boolean;
  type?: string;
  disabled?: boolean;
  onclick?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuButton(props: SidebarMenuButtonProps): JSX.Element {
  const variant = props.variant ?? "default";
  const size = props.size ?? "default";

  const button = (
    <button
      type={props.type ?? "button"}
      data-sidebar="menu-button"
      data-slot="sidebar-menu-button"
      data-size={size}
      data-active={props.active ? "true" : undefined}
      disabled={props.disabled}
      class={
        // @hella:compose
        [menuButton, menuButtonVariants[variant], menuButtonSizes[size], props.class]
        // @hella:end
      }
      on:click={() => props.onclick?.()}
    >
      {() => props.children}
    </button>
  );

  if (props.tooltip === undefined) return button;

  // The ref composes its tooltip entry around the button in icon mode; this
  // entry is self-contained, so the hover wiring (delay 0) is duplicated inline.
  const tooltipId = `hella-sidebar-tooltip-${++sidebarCount}`;
  const tooltipOpen = signal(false);
  const hidden = (): boolean => props.open === undefined || props.open() || (props.mobile?.() ?? false);
  const disposals: (() => void)[] = [];
  let triggerNode: Element | undefined;

  return (
    <span
      data-slot="sidebar-menu-tooltip"
      aria-describedby={tooltipId}
      class={
        // @hella:compose
        [tooltipBase]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        triggerNode = node;
        // hoverIntent stays armed for the trigger's lifetime - reopen works
        // without a remount (the skip-delay window is the primitive's global).
        disposals.push(hoverIntent(node, {
          onOpen: () => tooltipOpen(true),
          onClose: () => tooltipOpen(false),
          openDelay: 0,
        }));
      }}
      hook:beforeDestroy={() => {
        while (disposals.length) disposals.pop()!();
      }}
    >
      {button}
      {() => tooltipOpen() && (
        <Portal to="body">
          <div
            role="tooltip"
            id={tooltipId}
            data-slot="sidebar-tooltip-content"
            data-state={tooltipOpen() ? "open" : "closed"}
            data-side="right"
            data-align="center"
            hidden={hidden() ? "" : undefined}
            class={
              // @hella:compose
              [tooltipContent]
              // @hella:end
            }
            hook:afterMount={(node) => {
              if (!(node instanceof HTMLElement) || triggerNode === undefined) return;
              const anchor = triggerNode;
              disposals.push(anchorPosition(anchor, node, { placement: "right" }));
            }}
          >
            {props.tooltip}
          </div>
        </Portal>
      )}
    </span>
  );
}

interface SidebarMenuActionProps {
  showOnHover?: boolean;
  onclick?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuAction(props: SidebarMenuActionProps): JSX.Element {
  return (
    <button
      type="button"
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      data-show-on-hover={props.showOnHover ? "true" : undefined}
      class={
        // @hella:compose
        [menuAction, props.showOnHover ? menuActionHover : "", props.class]
        // @hella:end
      }
      on:click={() => props.onclick?.()}
    >
      {() => props.children}
    </button>
  );
}

export function SidebarMenuBadge(props: SidebarPartProps): JSX.Element {
  return (
    <div
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      class={
        // @hella:compose
        [menuBadge, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </div>
  );
}

interface SidebarMenuSkeletonProps {
  showIcon?: boolean;
  class?: string;
}

export function SidebarMenuSkeleton(props: SidebarMenuSkeletonProps): JSX.Element {
  // Random width between 50 to 90%, fixed per call.
  const width = `${Math.floor(Math.random() * 40) + 50}%`;

  return (
    <div
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      class={
        // @hella:compose
        [menuSkeleton, props.class]
        // @hella:end
      }
    >
      {props.showIcon === true && (
        <div
          data-sidebar="menu-skeleton-icon"
          class={
            // @hella:compose
            [skeletonBase, skeletonIcon]
            // @hella:end
          }
        />
      )}
      <div
        data-sidebar="menu-skeleton-text"
        style={`--skeleton-width: ${width}`}
        class={
          // @hella:compose
          [skeletonBase, skeletonText]
          // @hella:end
        }
      />
    </div>
  );
}

export function SidebarMenuSub(props: SidebarPartProps): JSX.Element {
  return (
    <ul
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      class={
        // @hella:compose
        [menuSub, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </ul>
  );
}

export function SidebarMenuSubItem(props: SidebarPartProps): JSX.Element {
  return (
    <li
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      class={
        // @hella:compose
        [menuSubItem, props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </li>
  );
}

interface SidebarMenuSubButtonProps {
  size?: "sm" | "md";
  active?: boolean;
  href?: string;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuSubButton(props: SidebarMenuSubButtonProps): JSX.Element {
  const size = props.size ?? "md";

  return (
    <a
      href={props.href}
      data-sidebar="menu-sub-button"
      data-slot="sidebar-menu-sub-button"
      data-size={size}
      data-active={props.active ? "true" : undefined}
      class={
        // @hella:compose
        [menuSubButton, menuSubSizes[size], props.class]
        // @hella:end
      }
    >
      {() => props.children}
    </a>
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
