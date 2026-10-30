import { effect, isBoolean, isString, signal } from "@hellajs/core";
import { Portal } from "@hellajs/dom";
import type {
  NavigationMenuContentProps,
  NavigationMenuIndicatorProps,
  NavigationMenuItemProps,
  NavigationMenuLinkProps,
  NavigationMenuListProps,
  NavigationMenuOptions,
  NavigationMenuComponents,
  NavigationMenuRootProps,
  NavigationMenuTriggerProps,
  NavigationMenuViewportProps,
} from "./types/components";

/** Document-level activation event: triggers carrying a `value` announce clicks so the root's store and its appended viewport follow without context. */
const ACTIVATE_EVENT = "hella:navigation-menu-activate";

/** The default portal target every Content renders into: the first viewport slot in the document. */
const VIEWPORT_SELECTOR = "[data-slot='navigation-menu-viewport']";

/** The chevron-down icon (refs/icons/chevron-down.svg), created per call so reactive swaps never share nodes between clones. */
const chevronDownIcon = (): JSX.Element => (
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
    data-slot="navigation-menu-chevron"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * Creates the navigation menu part set: `Root`, `List`, `Item`, `Trigger`,
 * `Content`, `Link`, `Viewport`, `Indicator`. The closure owns the open-value
 * store — controlled through a `value` accessor when passed, an internal
 * signal when omitted. Value-carrying `Trigger`s
 * announce clicks on a document-level event; `Root` mirrors the announcement
 * into the store, so exactly one panel is open at a time and a second click
 * on the open trigger closes it. `Content` portals into the shared
 * `Viewport` — the root appends one as its last child (or the `viewport`
 * selector prop names another slot) — and exits through `animationend` (or
 * the 250ms budget) after the close flip. `Indicator` tracks the active
 * trigger's position with a measured transform. Call in component scope so
 * the state signals dispose with the component.
 *
 * ```tsx
 * const Nav = navigationMenu({ value, onValueChange });
 *
 * <Nav.Root>
 *   <Nav.List>
 *     <Nav.Item>
 *       <Nav.Trigger value="learn">Learn</Nav.Trigger>
 *       <Nav.Content value="learn">...</Nav.Content>
 *     </Nav.Item>
 *   </Nav.List>
 *   <Nav.Indicator />
 * </Nav.Root>
 * ```
 * @param options controlled `value`, `onValueChange`, and `viewport` toggle; an omitted `value` keeps state internal.
 * @returns The part set, composed as `Nav.Root`-style members.
 */
export function navigationMenu(options: NavigationMenuOptions = {}): NavigationMenuComponents {
  const value = options.value;
  const onValueChange = options.onValueChange;
  const rendersViewport = options.viewport !== false;
  const internal = signal("");
  const current = (): string => (value !== undefined ? value() : internal());
  const setActive = (next: string): void => {
    if (value === undefined) internal(next);
    onValueChange?.(next);
  };

  // Mirror trigger announcements into the bar's open-value store; the announce
  // carries the requested state, so this never re-toggles an owner's write.
  const onActivate = (event: Event): void => {
    const detail = (event as CustomEvent).detail;
    if (!isString(detail?.id) || !isBoolean(detail?.open)) return;
    setActive(detail.open ? detail.id : current() === detail.id ? "" : current());
  };

  const Root = (props: NavigationMenuRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div
        data-slot="navigation-menu"
        data-viewport={rendersViewport ? "true" : "false"}
        class={cls}
        hook:afterMount={() => {
          document.addEventListener(ACTIVATE_EVENT, onActivate);
        }}
        hook:beforeDestroy={() => {
          document.removeEventListener(ACTIVATE_EVENT, onActivate);
        }}
        {...attrs}
      >
        {children}
        {() => (rendersViewport ? <Viewport active={() => current() !== ""} /> : null)}
      </div>
    );
  };

  const List = (props: NavigationMenuListProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <ul data-slot="navigation-menu-list" class={cls} {...attrs}>
        {children}
      </ul>
    );
  };

  const Item = (props: NavigationMenuItemProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <li data-slot="navigation-menu-item" class={cls} {...attrs}>
        {children}
      </li>
    );
  };

  const Trigger = (props: NavigationMenuTriggerProps): JSX.Element => {
    const {
      value: id,
      active,
      onActivate,
      children,
      class: cls,
      "on:click": userClick,
      ...attrs
    } = props;
    const isOpen = (): boolean =>
      active !== undefined ? active() : id !== undefined && current() === id;

    return (
      <button
        type="button"
        data-slot="navigation-menu-trigger"
        data-value={id}
        data-state={isOpen() ? "open" : "closed"}
        aria-expanded={isOpen() ? "true" : "false"}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          // The announce carries the requested state (computed before the owner
          // toggle runs), so the root's store mirrors instead of re-toggling.
          const open = !isOpen();
          onActivate?.();
          if (id !== undefined)
            document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: { id, open } }));
        }}
        {...attrs}
      >
        {children}
        {chevronDownIcon()}
      </button>
    );
  };

  const Content = (props: NavigationMenuContentProps): JSX.Element => {
    const {
      value: id,
      active,
      viewport: viewportSlot,
      onExited,
      children,
      class: cls,
      ...attrs
    } = props;
    const isOpen = (): boolean =>
      active !== undefined ? active() : id !== undefined && current() === id;
    const portalTarget = viewportSlot ?? VIEWPORT_SELECTOR;
    // `visible` alone gates the render so an open→closed flip never unmounts
    // before this watcher starts the exit; the panel stays mounted under
    // data-state="closed" until its animationend (or the copied duration
    // budget) removes it.
    const visible = signal(false);
    let wasOpen = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      if (isOpen()) {
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
    const state = (): "open" | "closed" => (isOpen() ? "open" : "closed");
    const teardown: (() => void)[] = [];
    return (
      <div data-slot="navigation-menu-content-anchor">
        {() =>
          visible() && (
            <Portal to={portalTarget}>
              <div
                data-slot="navigation-menu-content"
                data-state={state()}
                class={cls}
                hook:afterMount={(node) => {
                  // The exit's animationend (state already "closed") unmounts the
                  // panel and reports onExited; the entry's animationend is ignored.
                  if (!(node instanceof HTMLElement)) return;
                  const onAnimationEnd = (): void => {
                    if (!isOpen()) {
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
          )
        }
      </div>
    );
  };

  const Link = (props: NavigationMenuLinkProps): JSX.Element => {
    const { active, children, class: cls, ...attrs } = props;
    return (
      <a
        data-slot="navigation-menu-link"
        data-active={active ? "true" : undefined}
        class={cls}
        {...attrs}
      >
        {children}
      </a>
    );
  };

  const Viewport = (props: NavigationMenuViewportProps): JSX.Element => {
    const { active, id, class: cls, ...attrs } = props;
    const isOpen = (): boolean => (active !== undefined ? active() : current() !== "");
    return (
      <div class={cls} {...attrs}>
        <div
          data-slot="navigation-menu-viewport"
          id={id}
          data-state={isOpen() ? "open" : "closed"}
        />
      </div>
    );
  };

  const Indicator = (props: NavigationMenuIndicatorProps): JSX.Element => {
    const { active, anchor, class: cls, ...attrs } = props;
    const activeId = signal("");
    const visible = (): boolean => (active !== undefined ? active() : activeId() !== "");
    const wirings: (() => void)[] = [];
    let node: HTMLElement | undefined;

    // The trigger to sit under: the manual anchor when given, else the active
    // trigger found by the announcement stream's id.
    const resolveTrigger = (): Element | undefined => {
      if (anchor) return anchor();
      const id = activeId();
      return id === ""
        ? undefined
        : (document.querySelector(`[data-slot='navigation-menu-trigger'][data-value='${id}']`) ??
            undefined);
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
        class={cls}
        hook:afterMount={(mounted) => {
          if (!(mounted instanceof HTMLElement)) return;
          node = mounted;
          measure();
          const onActivate = (event: Event): void => {
            const detail = (event as CustomEvent).detail;
            if (!isString(detail?.id) || !isBoolean(detail?.open)) return;
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
        <div data-slot="navigation-menu-diamond" />
      </div>
    );
  };

  return { Root, List, Item, Trigger, Content, Link, Viewport, Indicator };
}
