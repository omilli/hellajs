import { effect, signal } from "@hellajs/core";
import { anchorPosition, hoverIntent, html, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const containerSides = {
  left: "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]",
  right: "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
};

const mobileSides = {
  left: "inset-y-0 left-0 h-full w-(--sidebar-width) border-r sm:max-w-sm data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
  right: "inset-y-0 right-0 h-full w-(--sidebar-width) border-l sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
};

const menuButtonVariants = {
  default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
};

const menuButtonSizes = {
  default: "h-8 text-sm",
  sm: "h-7 text-xs",
  lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
};

const menuSubSizes = {
  sm: "text-xs",
  md: "text-sm",
};

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

export function SidebarProvider(props: SidebarProviderProps): HellaNode {
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
  const isMobile = (): boolean => viewport();
  const onToggle = (): void => (isMobile() ? setOpenMobile(!openMobile()) : setOpen(!open()));
  const teardown: (() => void)[] = [];

  return html`
    <div
      data-slot="sidebar-wrapper"
      style="--sidebar-width: 16rem; --sidebar-width-icon: 3rem"
      class="${
        cn("group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar", props.class)
      }"
      hook:afterMount="${() => {
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
      }}"
      hook:beforeDestroy="${() => {
        while (teardown.length) teardown.pop()!();
      }}"
    >${props.children({ open, setOpen, mobile: isMobile, openMobile, setOpenMobile, onToggle })}</div>
  ` as HellaNode;
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

export function Sidebar(props: SidebarProps): HellaNode {
  const side = props.side ?? "left";
  const variant = props.variant ?? "sidebar";
  const collapsible = props.collapsible ?? "offcanvas";
  const collapsed = (): boolean => props.open !== undefined && props.open() === false;
  const variantIsInset = variant === "floating" || variant === "inset";

  if (collapsible === "none") {
    return html`
      <div
        data-slot="sidebar"
        class="${
          cn("flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground", props.class)
        }"
      >${() => props.children}</div>
    ` as HellaNode;
  }

  // The mobile/desktop fork is a reactive branch - reading mobile() in an
  // early return would bake the branch at first evaluation and the
  // provider's matchMedia flip would never propagate. The mobile arm calls
  // the sheet's gate so the branch resolves to a vnode (or false) in one
  // unwrap - a bare render-fn member would stringify through resolveNode.
  const mobileTree = SidebarMobileSheet({
    open: () => props.openMobile?.() ?? false,
    onClose: () => props.onOpenMobileChange?.(false),
    side,
    children: flattenChildren(props.children),
  });

  return html`
    ${() => props.mobile?.() === true ? mobileTree() : html`
        <div
          data-slot="sidebar"
          data-state="${() => (collapsed() ? "collapsed" : "expanded")}"
          data-collapsible="${() => (collapsed() ? collapsible : undefined)}"
          data-variant="${variant}"
          data-side="${side}"
          class="${
            cn("group peer hidden text-sidebar-foreground md:block")
          }"
        >
          <div
            data-slot="sidebar-gap"
            class="${
              cn("relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[side=right]:rotate-180", variantIsInset ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)")
            }"
          />
          <div
            data-slot="sidebar-container"
            class="${
              cn("fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex", containerSides[side], variantIsInset ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l", props.class)
            }"
          >
            <div
              data-sidebar="sidebar"
              data-slot="sidebar-inner"
              class="${
                cn("flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm")
              }"
            >
              ${() => props.children}
            </div>
          </div>
        </div>
      ` as HellaChild}
  ` as HellaNode;
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
 * escape/outside/trap wiring, exit hold) are duplicated inline. Returns the
 * visible gate thunk - calling it yields the portaled pair or false.
 */
function SidebarMobileSheet(props: SidebarMobileSheetProps): () => HellaChild {
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

  return (): HellaChild => visible() && Portal({
    to: "body",
    children: [
      html`
        <div
          data-slot="sidebar-overlay"
          data-state="${state}"
          class="${
            cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0")
          }"
        />
      ` as HellaChild,
      html`
          <div
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            data-state="${state}"
            data-side="${side}"
            role="dialog"
            aria-modal="true"
            aria-labelledby="${titleId}"
            aria-describedby="${descriptionId}"
            style="--sidebar-width: 18rem"
            class="${
              cn("fixed z-50 flex flex-col gap-4 bg-sidebar p-0 text-sidebar-foreground shadow-lg transition ease-in-out [&>button]:hidden data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500", mobileSides[side])
            }"
            hook:afterMount="${(node: Element) => {
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
            }}"
            hook:beforeDestroy="${() => {
              disposeWirings();
              while (teardown.length) teardown.pop()!();
            }}"
          >
            <h2
              id="${titleId}"
              class="sr-only"
            >
              Sidebar
            </h2>
            <p
              id="${descriptionId}"
              class="sr-only"
            >
              Displays the mobile sidebar.
            </p>
            <div
              class="${
                cn("flex h-full w-full flex-col")
              }"
            >
              ${() => props.children}
            </div>
          </div>
        ` as HellaChild,
    ],
  });
}

interface SidebarTriggerProps {
  onclick?: () => void;
  onToggle?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarTrigger(props: SidebarTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      class="${
        cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-7", props.class)
      }"
      e:click="${() => {
        props.onclick?.();
        props.onToggle?.();
      }}"
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
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
      <span class="sr-only">Toggle Sidebar</span>
    </button>
  ` as HellaNode;
}

interface SidebarRailProps {
  onToggle?: () => void;
  class?: string;
  children?: HellaChildren;
}

/** The drag-handle edge - click toggles; width dragging is out of scope (bounded open). */
export function SidebarRail(props: SidebarRailProps): HellaNode {
  return html`
    <button
      type="button"
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      title="Toggle Sidebar"
      tabindex="-1"
      class="${
        cn("absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize [[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar [[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=right][data-collapsible=offcanvas]_&]:-left-2", props.class)
      }"
      e:click="${() => props.onToggle?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

interface SidebarPartProps {
  children?: HellaChildren;
  class?: string;
}

export function SidebarInset(props: SidebarPartProps): HellaNode {
  return html`
    <main
      data-slot="sidebar-inset"
      class="${
        cn("relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2", props.class)
      }"
    >${() => props.children}</main>
  ` as HellaNode;
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

export function SidebarInput(props: SidebarInputProps): HellaNode {
  return html`
    <input
      data-sidebar="input"
      data-slot="sidebar-input"
      type="${props.type}"
      placeholder="${props.placeholder}"
      id="${props.id}"
      aria-label="${props.ariaLabel}"
      aria-invalid="${props.ariaInvalid ? "true" : undefined}"
      value="${props.value}"
      class="${
        cn("h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30", "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50", "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40", "h-8 w-full bg-background shadow-none", props.class)
      }"
      on:input="${(e: Event) => props.oninput?.((e.target as HTMLInputElement).value)}"
    />
  ` as HellaNode;
}

export function SidebarHeader(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      class="${
        cn("flex flex-col gap-2 p-2", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarFooter(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      class="${
        cn("flex flex-col gap-2 p-2", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarSeparator(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-separator"
      data-sidebar="separator"
      role="separator"
      data-orientation="horizontal"
      aria-orientation="horizontal"
      class="${
        cn("shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", "mx-2 w-auto bg-sidebar-border", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarContent(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      class="${
        cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarGroup(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      class="${
        cn("relative flex w-full min-w-0 flex-col p-2", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarGroupLabel(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      class="${
        cn("flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface SidebarGroupActionProps {
  onclick?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarGroupAction(props: SidebarGroupActionProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      class="${
        cn("absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 after:absolute after:-inset-2 md:after:hidden group-data-[collapsible=icon]:hidden", props.class)
      }"
      e:click="${() => props.onclick?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

export function SidebarGroupContent(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      class="${
        cn("w-full text-sm", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarMenu(props: SidebarPartProps): HellaNode {
  return html`
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      class="${
        cn("flex w-full min-w-0 flex-col gap-1", props.class)
      }"
    >${() => props.children}</ul>
  ` as HellaNode;
}

export function SidebarMenuItem(props: SidebarPartProps): HellaNode {
  return html`
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      class="${
        cn("group/menu-item relative", props.class)
      }"
    >${() => props.children}</li>
  ` as HellaNode;
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

export function SidebarMenuButton(props: SidebarMenuButtonProps): HellaNode {
  const variant = props.variant ?? "default";
  const size = props.size ?? "default";

  const button = html`
    <button
      type="${props.type ?? "button"}"
      data-sidebar="menu-button"
      data-slot="sidebar-menu-button"
      data-size="${size}"
      data-active="${props.active ? "true" : undefined}"
      disabled="${props.disabled}"
      class="${
        cn("peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0", menuButtonVariants[variant], menuButtonSizes[size], props.class)
      }"
      e:click="${() => props.onclick?.()}"
    >${() => props.children}</button>
  ` as HellaNode;

  if (props.tooltip === undefined) return button;

  // The ref composes its tooltip entry around the button in icon mode; this
  // entry is self-contained, so the hover wiring (delay 0) is duplicated inline.
  const tooltipId = `hella-sidebar-tooltip-${++sidebarCount}`;
  const tooltipOpen = signal(false);
  const hidden = (): boolean => props.open === undefined || props.open() || (props.mobile?.() ?? false);
  const disposals: (() => void)[] = [];
  let triggerNode: Element | undefined;

  return html`
    <span
      data-slot="sidebar-menu-tooltip"
      aria-describedby="${tooltipId}"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        triggerNode = node;
        // hoverIntent stays armed for the trigger's lifetime - reopen works
        // without a remount (the skip-delay window is the primitive's global).
        disposals.push(hoverIntent(node, {
          onOpen: () => tooltipOpen(true),
          onClose: () => tooltipOpen(false),
          openDelay: 0,
        }));
      }}"
      hook:beforeDestroy="${() => {
        while (disposals.length) disposals.pop()!();
      }}"
    >
      ${button}${() => tooltipOpen() && Portal({
        to: "body",
        children: [
          html`
            <div
              role="tooltip"
              id="${tooltipId}"
              data-slot="sidebar-tooltip-content"
              data-state="${() => (tooltipOpen() ? "open" : "closed")}"
              data-side="right"
              data-align="center"
              hidden="${() => (hidden() ? "" : undefined)}"
              class="${
                cn("z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95")
              }"
              hook:afterMount="${(node: Element) => {
                if (!(node instanceof HTMLElement) || triggerNode === undefined) return;
                const anchor = triggerNode;
                disposals.push(anchorPosition(anchor, node, { placement: "right" }));
              }}"
            >${() => props.tooltip}</div>
          ` as HellaChild,
        ],
      })}
    </span>
  ` as HellaNode;
}

interface SidebarMenuActionProps {
  showOnHover?: boolean;
  onclick?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuAction(props: SidebarMenuActionProps): HellaNode {
  return html`
    <button
      type="button"
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      data-show-on-hover="${props.showOnHover ? "true" : undefined}"
      class="${
        cn("absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 after:absolute after:-inset-2 md:after:hidden peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 group-data-[collapsible=icon]:hidden", props.showOnHover ? "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground data-[state=open]:opacity-100 md:opacity-0" : "", props.class)
      }"
      e:click="${() => props.onclick?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

export function SidebarMenuBadge(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      class="${
        cn("pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 group-data-[collapsible=icon]:hidden", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface SidebarMenuSkeletonProps {
  showIcon?: boolean;
  class?: string;
}

export function SidebarMenuSkeleton(props: SidebarMenuSkeletonProps): HellaNode {
  // Random width between 50 to 90%, fixed per call.
  const width = `${Math.floor(Math.random() * 40) + 50}%`;

  return html`
    <div
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      class="${
        cn("flex h-8 items-center gap-2 rounded-md px-2", props.class)
      }"
    >
      ${() => props.showIcon === true && html`
        <div
          data-sidebar="menu-skeleton-icon"
          class="${
            cn("animate-pulse rounded-md bg-accent", "size-4 rounded-md")
          }"
        />
      ` as HellaChild}
      <div
        data-sidebar="menu-skeleton-text"
        style="--skeleton-width: ${width}"
        class="${
          cn("animate-pulse rounded-md bg-accent", "h-4 max-w-(--skeleton-width) flex-1")
        }"
      />
    </div>
  ` as HellaNode;
}

export function SidebarMenuSub(props: SidebarPartProps): HellaNode {
  return html`
    <ul
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      class="${
        cn("mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden", props.class)
      }"
    >${() => props.children}</ul>
  ` as HellaNode;
}

export function SidebarMenuSubItem(props: SidebarPartProps): HellaNode {
  return html`
    <li
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      class="${
        cn("group/menu-sub-item relative", props.class)
      }"
    >${() => props.children}</li>
  ` as HellaNode;
}

interface SidebarMenuSubButtonProps {
  size?: "sm" | "md";
  active?: boolean;
  href?: string;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuSubButton(props: SidebarMenuSubButtonProps): HellaNode {
  const size = props.size ?? "md";

  return html`
    <a
      href="${props.href}"
      data-sidebar="menu-sub-button"
      data-slot="sidebar-menu-sub-button"
      data-size="${size}"
      data-active="${props.active ? "true" : undefined}"
      class="${
        cn("flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden", menuSubSizes[size], props.class)
      }"
    >${() => props.children}</a>
  ` as HellaNode;
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
