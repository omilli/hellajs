import { effect, signal } from "@hellajs/core";
import { html, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const contentSides = {
  right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
  left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
  top: "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  bottom: "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
};

const title = "font-semibold text-foreground";

const description = "text-sm text-muted-foreground";

/** Accessibility state shared by the animated sheet parts. */
type SheetState = () => "open" | "closed";

/** Side the panel slides in from. */
type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetOverlayProps {
  state?: SheetState;
  class?: string;
}

export function SheetOverlay(props: SheetOverlayProps): HellaNode {
  return html`
    <div
      data-slot="sheet-overlay"
      data-state="${() => props.state?.()}"
      class="${
        cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", props.class)
      }"
    />
  ` as HellaNode;
}

interface SheetCloseProps {
  state?: SheetState;
  onClose?: () => void;
  class?: string;
}

export function SheetClose(props: SheetCloseProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="sheet-close"
      data-state="${() => props.state?.()}"
      class="${
        cn("absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary", props.class)
      }"
      e:click="${() => props.onClose?.()}"
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
  ` as HellaNode;
}

interface SheetPortalProps {
  children?: HellaChildren;
}

/** Portals the manual composition's parts into document.body. */
export function SheetPortal(props: SheetPortalProps): HellaNode {
  return Portal({ to: "body", children: props.children === undefined ? [] : Array.isArray(props.children) ? props.children : [props.children] }) as HellaNode;
}

interface SheetTriggerProps {
  children?: HellaChildren;
  class?: string;
}

/** The manual trigger button; wire its click to the caller's open signal - hella has no Radix context to do it for you. */
export function SheetTrigger(props: SheetTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="sheet-trigger"
      class="${
        cn(props.class)
      }"
    >${() => props.children}</button>
  ` as HellaNode;
}

interface SheetContentProps {
  state?: SheetState;
  side?: SheetSide;
  labelledBy?: string;
  describedBy?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  onClose?: () => void;
  onExited?: () => void;
  class?: string;
  children?: HellaChildren;
}

/**
 * The sheet panel. Manual composition portals it alongside a SheetOverlay
 * sibling - hella has no Radix context, so the portal/overlay pairing is the
 * composer's (the default Sheet below shows the wired composition). The
 * Title/Description parts carry the required aria wiring through
 * labelledBy/describedBy - pass their generated ids even in manual
 * compositions, screen readers announce nothing without them.
 */
export function SheetContent(props: SheetContentProps): HellaNode {
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  let panel: HTMLElement | undefined;

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  const installWirings = (): void => {
    if (panel === undefined || wirings.length > 0 || props.state?.() === "closed") return;
    const target = panel;
    if (props.closeOnEscape !== false && props.onClose) wirings.push(onEscape(target, props.onClose));
    if (props.closeOnOutside !== false && props.onClose) wirings.push(onOutside(() => [target], props.onClose));
    wirings.push(trapFocus(target));
  };

  // The exit runs unwired: flipping to "closed" tears the trap/escape/outside
  // handlers down immediately; reopening re-arms them without a remount.
  effect(() => {
    if (props.state?.() === "closed") disposeWirings();
    else installWirings();
  });

  const side = props.side ?? "right";

  return html`
    <div
      data-slot="sheet-content"
      data-state="${() => props.state?.()}"
      data-side="${side}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${props.labelledBy}"
      aria-describedby="${props.describedBy}"
      class="${
        cn("fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500", contentSides[side], props.class)
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        panel = node;
        installWirings();
        // The exit's animationend (state already "closed") is the primary
        // unmount trigger; the entry's animationend is ignored.
        const onAnimationEnd = (): void => {
          if (props.state?.() === "closed") props.onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
    >
      ${() => props.children}
      ${() => (props.showCloseButton !== false) && SheetClose({ state: props.state, onClose: props.onClose })}
    </div>
  ` as HellaNode;
}

interface SheetPartProps {
  children?: HellaChildren;
  class?: string;
}

export function SheetHeader(props: SheetPartProps): HellaNode {
  return html`
    <div
      data-slot="sheet-header"
      class="${
        cn("flex flex-col gap-1.5 p-4", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SheetFooter(props: SheetPartProps): HellaNode {
  return html`
    <div
      data-slot="sheet-footer"
      class="${
        cn("mt-auto flex flex-col gap-2 p-4", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface SheetTitleProps {
  id?: string;
  children?: HellaChildren;
  class?: string;
}

export function SheetTitle(props: SheetTitleProps): HellaNode {
  return html`
    <h2
      id="${props.id}"
      data-slot="sheet-title"
      class="${
        cn(title, props.class)
      }"
    >${() => props.children}</h2>
  ` as HellaNode;
}

export function SheetDescription(props: SheetTitleProps): HellaNode {
  return html`
    <p
      id="${props.id}"
      data-slot="sheet-description"
      class="${
        cn(description, props.class)
      }"
    >${() => props.children}</p>
  ` as HellaNode;
}

interface SheetProps {
  open: () => boolean;
  onClose: () => void;
  side?: SheetSide;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChildren;
}

let sheetCount = 0;

export default function Sheet(props: SheetProps): HellaNode {
  const titleId = `hella-sheet-title-${++sheetCount}`;
  const descriptionId = `hella-sheet-description-${sheetCount}`;
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
  // panel stays mounted under data-state="closed" until its animationend
  // (or the copied 300ms duration budget) unmounts it.
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

  const state = (): "open" | "closed" => (props.open() ? "open" : "closed");

  return html`
    ${() => visible() && Portal({
      to: "body",
      children: [
        SheetOverlay({ state }) as HellaChild,
        SheetContent({
          state,
          side: props.side,
          labelledBy: titleId,
          describedBy: props.description === undefined ? undefined : descriptionId,
          showCloseButton: props.showCloseButton,
          closeOnEscape: props.closeOnEscape,
          closeOnOutside: props.closeOnOutside,
          onClose: props.onClose,
          onExited: finishExit,
          class: props.class,
          children: [
            ...(props.title !== undefined ? [SheetTitle({ id: titleId, children: props.title }) as HellaChild] : []),
            ...(props.description !== undefined ? [SheetDescription({ id: descriptionId, children: props.description }) as HellaChild] : []),
            ...(props.children === undefined ? [] : Array.isArray(props.children) ? props.children : [props.children]),
          ],
        }) as HellaChild,
      ],
    })}
  ` as HellaNode;
}
