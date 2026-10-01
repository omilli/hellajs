import { effect, signal } from "@hellajs/core";
import { html, Portal } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

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
      // @hella:compose
      [chevron]
      // @hella:end
    }"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>` as HellaNode;

interface NavigationMenuListProps {
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuList(props: NavigationMenuListProps): HellaNode {
  return html`
    <ul
      data-slot="navigation-menu-list"
      class="${
        // @hella:compose
        [list, props.class]
        // @hella:end
      }"
    >${() => props.children}</ul>
  ` as HellaNode;
}

interface NavigationMenuItemProps {
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuItem(props: NavigationMenuItemProps): HellaNode {
  return html`
    <li
      data-slot="navigation-menu-item"
      class="${
        // @hella:compose
        [item, props.class]
        // @hella:end
      }"
    >${() => props.children}</li>
  ` as HellaNode;
}

interface NavigationMenuTriggerProps {
  /** This trigger's id in the root's open-value store; clicks announce it when no `onActivate` stands in. */
  value?: string;
  /** Resolves the open state for `aria-expanded`/`data-state`; manual wiring threads it from the owning signal. */
  active?: () => boolean;
  onActivate?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuTrigger(props: NavigationMenuTriggerProps): HellaNode {
  const active = (): boolean => props.active?.() ?? false;
  return html`
    <button
      type="button"
      data-slot="navigation-menu-trigger"
      data-value="${props.value}"
      data-state="${() => (active() ? "open" : "closed")}"
      aria-expanded="${() => (active() ? "true" : "false")}"
      class="${
        // @hella:compose
        [trigger, props.class]
        // @hella:end
      }"
      on:click="${() => {
        // The announce carries the requested state (computed before the owner
        // toggle runs), so the root's store mirrors instead of re-toggling.
        const open = !active();
        props.onActivate?.();
        if (props.value !== undefined) document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: { id: props.value, open } }));
      }}"
    >
      ${() => props.children}${chevronIcon()}
    </button>
  ` as HellaNode;
}

interface NavigationMenuContentProps {
  /** Resolves the open state; manual wiring threads it from the owning signal. */
  active?: () => boolean;
  /** Portal target for the shared viewport slot; defaults to the first `[data-slot="navigation-menu-viewport"]` in the document. */
  viewport?: string;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuContent(props: NavigationMenuContentProps): HellaNode {
  const active = (): boolean => props.active?.() ?? false;
  const portalTarget = props.viewport ?? VIEWPORT_SELECTOR;
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
  return html`
    <div
      data-slot="navigation-menu-content-anchor"
      class="${
        // @hella:compose
        [contentAnchor]
        // @hella:end
      }"
    >${() => visible() && Portal({
      to: portalTarget,
      children: [
        html`<div
          data-slot="navigation-menu-content"
          data-state="${() => state()}"
          class="${
            // @hella:compose
            [content, props.class]
            // @hella:end
          }"
          hook:afterMount="${(node: Element) => {
            // The exit's animationend (state already "closed") unmounts the
            // panel and reports onExited; the entry's animationend is ignored.
            if (!(node instanceof HTMLElement)) return;
            const onAnimationEnd = (): void => {
              if (!active()) {
                visible(false);
                props.onExited?.();
              }
            };
            node.addEventListener("animationend", onAnimationEnd);
            teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
          }}"
          hook:beforeDestroy="${() => {
            while (teardown.length) teardown.pop()!();
          }}"
        >${() => props.children}</div>` as HellaChild,
      ],
    })}
    </div>
  ` as HellaNode;
}

interface NavigationMenuLinkProps {
  /** Renders `data-active="true"` and its accent styles (the ref's data-[active=true] set). */
  active?: boolean;
  href?: string;
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuLink(props: NavigationMenuLinkProps): HellaNode {
  return html`
    <a
      data-slot="navigation-menu-link"
      data-active="${props.active ? "true" : undefined}"
      href="${props.href}"
      class="${
        // @hella:compose
        [link, props.class]
        // @hella:end
      }"
    >${() => props.children}</a>
  ` as HellaNode;
}

interface NavigationMenuViewportProps {
  /** Resolves the open state for the viewport's enter/exit `data-state`; the composed root wires its own store. */
  active?: () => boolean;
  /** Anchors manual Content wiring: give the slot an id and pass `#<id>` as each Content's `viewport` selector. */
  id?: string;
  class?: string;
}

export function NavigationMenuViewport(props: NavigationMenuViewportProps): HellaNode {
  const active = (): boolean => props.active?.() ?? false;
  return html`
    <div
      class="${
        // @hella:compose
        [viewportWrapper, props.class]
        // @hella:end
      }"
    >
      <div
        data-slot="navigation-menu-viewport"
        id="${props.id}"
        data-state="${() => (active() ? "open" : "closed")}"
        class="${
          // @hella:compose
          [viewport]
          // @hella:end
        }"
      />
    </div>
  ` as HellaNode;
}

interface NavigationMenuIndicatorProps {
  /** Resolves the visible state (any panel open); manual wiring threads it from the owning signal. */
  active?: () => boolean;
  /** Resolves the trigger the indicator sits under; defaults to the trigger announced by the activation stream. */
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  class?: string;
}

export function NavigationMenuIndicator(props: NavigationMenuIndicatorProps): HellaNode {
  const activeId = signal("");
  const visible = (): boolean => props.active?.() ?? activeId() !== "";
  const wirings: (() => void)[] = [];
  let node: HTMLElement | undefined;

  // The trigger to sit under: the manual anchor when given, else the active
  // trigger found by the announcement stream's id.
  const resolveTrigger = (): Element | undefined => {
    if (props.anchor) return props.anchor();
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
    node.style.width = t.width + "px";
    node.style.transform = "translateX(" + (t.left - r.left) + "px)";
  };

  // Re-measure when visibility flips (the trigger just changed), on mount,
  // and on viewport resizes.
  effect(() => {
    visible();
    measure();
  });

  return html`
    <div
      data-slot="navigation-menu-indicator"
      data-state="${() => (visible() ? "visible" : "hidden")}"
      class="${
        // @hella:compose
        [indicator, props.class]
        // @hella:end
      }"
      hook:afterMount="${(mounted: Element) => {
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
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
        node = undefined;
      }}"
    >
      <div
        class="${
          // @hella:compose
          [diamond]
          // @hella:end
        }"
      />
    </div>
  ` as HellaNode;
}

interface NavigationMenuProps {
  /** Controlled id of the open panel ("" when closed), fed by trigger announcements; the root never writes it when given. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  /** Renders the shared viewport slot as the last child (default true); set false to render `NavigationMenuViewport` manually. */
  viewport?: boolean;
  children?: HellaChildren;
  class?: string;
}

export default function NavigationMenu(props: NavigationMenuProps): HellaNode {
  const internal = signal("");
  const active = (): string => (props.value !== undefined ? props.value() : internal());
  const setActive = (value: string): void => {
    if (props.value === undefined) internal(value);
    props.onValueChange?.(value);
  };
  const wirings: (() => void)[] = [];

  // Mirror trigger announcements into the bar's open-value store; the announce
  // carries the requested state, so this never re-toggles an owner's write.
  const onActivate = (event: Event): void => {
    const detail = (event as CustomEvent).detail;
    if (typeof detail?.id !== "string" || typeof detail?.open !== "boolean") return;
    setActive(detail.open ? detail.id : active() === detail.id ? "" : active());
  };

  return html`
    <div
      data-slot="navigation-menu"
      data-viewport="${props.viewport === false ? "false" : "true"}"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
      hook:afterMount="${() => {
        document.addEventListener(ACTIVATE_EVENT, onActivate);
        wirings.push(() => document.removeEventListener(ACTIVATE_EVENT, onActivate));
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
      }}"
    >
      ${() => props.children}${() => (props.viewport === false ? null : NavigationMenuViewport({ active: () => active() !== "" }))}
    </div>
  ` as HellaNode;
}
