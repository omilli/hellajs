import { effect, signal } from "@hellajs/core";
import { Portal } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const chevron: string;
declare const content: string;
declare const contentAnchor: string;
declare const diamond: string;
declare const indicator: string;
declare const item: string;
declare const link: string;
declare const list: string;
declare const trigger: string;
declare const viewport: string;
declare const viewportWrapper: string;
// @hella:end

/** Document-level activation event: triggers carrying a `value` announce clicks so the root's store and its appended viewport follow without context. */
const ACTIVATE_EVENT = "hella:navigation-menu-activate";

/** The default portal target every Content renders into: the first viewport slot in the document. */
const VIEWPORT_SELECTOR = "[data-slot='navigation-menu-viewport']";

/** The chevron-down icon (refs/icons/chevron-down.svg), created per call so reactive swaps never share nodes between clones. */
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
    <path d="m6 9 6 6 6-6" />
  </svg>
);

interface NavigationMenuListProps extends HTMLAttributes<"ul"> {
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuList({ children, class: cls, ...attrs }: NavigationMenuListProps): JSX.Element {
  return (
    <ul
      data-slot="navigation-menu-list"
      class={
        // @hella:compose
        [list, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </ul>
  );
}

interface NavigationMenuItemProps extends HTMLAttributes<"li"> {
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuItem({ children, class: cls, ...attrs }: NavigationMenuItemProps): JSX.Element {
  return (
    <li
      data-slot="navigation-menu-item"
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </li>
  );
}

interface NavigationMenuTriggerProps extends HTMLAttributes<"button"> {
  /** This trigger's id in the root's open-value store; clicks announce it when no `onActivate` stands in. */
  value?: string;
  /** Resolves the open state for `aria-expanded`/`data-state`; manual wiring threads it from the owning signal. */
  active?: () => boolean;
  onActivate?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuTrigger({ value, active: activeProp, onActivate, children, class: cls, ...attrs }: NavigationMenuTriggerProps): JSX.Element {
  const active = (): boolean => activeProp?.() ?? false;
  return (
    <button
      type="button"
      data-slot="navigation-menu-trigger"
      data-value={value}
      data-state={active() ? "open" : "closed"}
      aria-expanded={active() ? "true" : "false"}
      class={
        // @hella:compose
        [trigger, cls]
        // @hella:end
      }
      on:click={() => {
        // The announce carries the requested state (computed before the owner
        // toggle runs), so the root's store mirrors instead of re-toggling.
        const open = !active();
        onActivate?.();
        if (value !== undefined) document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: { id: value, open } }));
      }}
      {...attrs}
    >
      {children}
      {chevronIcon()}
    </button>
  );
}

interface NavigationMenuContentProps extends HTMLAttributes<"div"> {
  /** Resolves the open state; manual wiring threads it from the owning signal. */
  active?: () => boolean;
  /** Portal target for the shared viewport slot; defaults to the first `[data-slot="navigation-menu-viewport"]` in the document. */
  viewport?: string;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuContent({ active: activeProp, viewport: viewportSlot, onExited, children, class: cls, ...attrs }: NavigationMenuContentProps): JSX.Element {
  const active = (): boolean => activeProp?.() ?? false;
  const portalTarget = viewportSlot ?? VIEWPORT_SELECTOR;
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit; the panel stays mounted under
  // data-state="closed" until its animationend (or the copied duration
  // budget) removes it.
  const visible = signal(false);
  let wasOpen = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  effect(() => {
    if (active()) {
      wasOpen = true;
      if (fallback !== undefined) {
        clearTimeout(fallback);
        fallback = undefined;
      }
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(() => {
        if (fallback !== undefined) {
          clearTimeout(fallback);
          fallback = undefined;
        }
        visible(false);
      }, 250);
    }
  });
  const state = (): "open" | "closed" => (active() ? "open" : "closed");
  const teardown: (() => void)[] = [];
  return (
    <div
      data-slot="navigation-menu-content-anchor"
      class={
        // @hella:compose
        [contentAnchor]
        // @hella:end
      }
    >
      {() => visible() && (
        <Portal to={portalTarget}>
          <div
            data-slot="navigation-menu-content"
            data-state={state()}
            class={
              // @hella:compose
              [content, cls]
              // @hella:end
            }
            hook:afterMount={(node) => {
              // The exit's animationend (state already "closed") unmounts the
              // panel and reports onExited; the entry's animationend is ignored.
              if (!(node instanceof HTMLElement)) return;
              const onAnimationEnd = (): void => {
                if (!active()) {
                  visible(false);
                  onExited?.();
                }
              };
              node.addEventListener("animationend", onAnimationEnd);
              teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
            }}
            hook:beforeDestroy={() => {
              while (teardown.length) teardown.pop()!();
            }}
            {...attrs}
          >
            {children}
          </div>
        </Portal>
      )}
    </div>
  );
}

interface NavigationMenuLinkProps extends HTMLAttributes<"a"> {
  /** Renders `data-active="true"` and its accent styles (the ref's data-[active=true] set). */
  active?: boolean;
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuLink({ active, children, class: cls, ...attrs }: NavigationMenuLinkProps): JSX.Element {
  return (
    <a
      data-slot="navigation-menu-link"
      data-active={active ? "true" : undefined}
      class={
        // @hella:compose
        [link, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </a>
  );
}

interface NavigationMenuViewportProps extends HTMLAttributes<"div"> {
  /** Resolves the open state for the viewport's enter/exit `data-state`; the composed root wires its own store. */
  active?: () => boolean;
  class?: string;
}

export function NavigationMenuViewport({ active: activeProp, id, class: cls, ...attrs }: NavigationMenuViewportProps): JSX.Element {
  const active = (): boolean => activeProp?.() ?? false;
  return (
    <div
      class={
        // @hella:compose
        [viewportWrapper, cls]
        // @hella:end
      }
      {...attrs}
    >
      <div
        data-slot="navigation-menu-viewport"
        id={id}
        data-state={active() ? "open" : "closed"}
        class={
          // @hella:compose
          [viewport]
          // @hella:end
        }
      />
    </div>
  );
}

interface NavigationMenuIndicatorProps extends HTMLAttributes<"div"> {
  /** Resolves the visible state (any panel open); manual wiring threads it from the owning signal. */
  active?: () => boolean;
  /** Resolves the trigger the indicator sits under; defaults to the trigger announced by the activation stream. */
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuIndicator({ active: activeProp, anchor, class: cls, ...attrs }: NavigationMenuIndicatorProps): JSX.Element {
  const activeId = signal("");
  const visible = (): boolean => activeProp?.() ?? activeId() !== "";
  const wirings: (() => void)[] = [];
  let node: HTMLElement | undefined;

  // The trigger to sit under: the manual anchor when given, else the active
  // trigger found by the announcement stream's id.
  const resolveTrigger = (): Element | undefined => {
    if (anchor) return anchor();
    const id = activeId();
    return id === "" ? undefined : document.querySelector(`[data-slot='navigation-menu-trigger'][data-value='${id}']`) ?? undefined;
  };

  // The underline/box position: measured against the root bar, moved with a
  // 200ms transform transition (upstream approximates its spring the same way).
  const measure = (): void => {
    if (!node) return;
    const anchorEl = resolveTrigger();
    const root = node.closest("[data-slot='navigation-menu']");
    if (!anchorEl || !root) return;
    const t = anchorEl.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    node.style.width = `${t.width}px`;
    node.style.transform = `translateX(${t.left - r.left}px)`;
  };

  // Re-measure when visibility flips (the trigger just changed), on mount,
  // and on viewport resizes.
  effect(() => {
    visible();
    measure();
  });

  return (
    <div
      data-slot="navigation-menu-indicator"
      data-state={visible() ? "visible" : "hidden"}
      class={
        // @hella:compose
        [indicator, cls]
        // @hella:end
      }
      hook:afterMount={(mounted) => {
        if (!(mounted instanceof HTMLElement)) return;
        node = mounted;
        measure();
        const onActivate = (event: Event): void => {
          const detail = (event as CustomEvent).detail;
          if (typeof detail?.id !== "string" || typeof detail?.open !== "boolean") return;
          activeId(detail.open ? detail.id : "");
        };
        document.addEventListener(ACTIVATE_EVENT, onActivate);
        wirings.push(() => document.removeEventListener(ACTIVATE_EVENT, onActivate));
        const onResize = (): void => measure();
        window.addEventListener("resize", onResize);
        wirings.push(() => window.removeEventListener("resize", onResize));
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
        node = undefined;
      }}
      {...attrs}
    >
      <div
        class={
          // @hella:compose
          [diamond]
          // @hella:end
        }
      />
    </div>
  );
}

interface NavigationMenuProps extends HTMLAttributes<"div"> {
  /** Controlled id of the open panel ("" when closed), fed by trigger announcements; the root never writes it when given. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  /** Renders the shared viewport slot as the last child (default true); set false to render `NavigationMenuViewport` manually. */
  viewport?: boolean;
  children?: HellaChildren;
  class?: string;
}

export default function NavigationMenu({ value: valueProp, onValueChange, viewport: viewportProp, children, class: cls, ...attrs }: NavigationMenuProps): JSX.Element {
  const internal = signal("");
  const active = (): string => (valueProp !== undefined ? valueProp() : internal());
  const setActive = (value: string): void => {
    if (valueProp === undefined) internal(value);
    onValueChange?.(value);
  };
  const wirings: (() => void)[] = [];

  // Mirror trigger announcements into the bar's open-value store; the announce
  // carries the requested state, so this never re-toggles an owner's write.
  const onActivate = (event: Event): void => {
    const detail = (event as CustomEvent).detail;
    if (typeof detail?.id !== "string" || typeof detail?.open !== "boolean") return;
    setActive(detail.open ? detail.id : active() === detail.id ? "" : active());
  };

  return (
    <div
      data-slot="navigation-menu"
      data-viewport={viewportProp === false ? "false" : "true"}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      hook:afterMount={() => {
        document.addEventListener(ACTIVATE_EVENT, onActivate);
        wirings.push(() => document.removeEventListener(ACTIVATE_EVENT, onActivate));
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
      }}
      {...attrs}
    >
      {children}
      {() => (viewportProp === false ? null : <NavigationMenuViewport active={() => active() !== ""} />)}
    </div>
  );
}
