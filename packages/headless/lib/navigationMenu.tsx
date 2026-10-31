import { effect, isBoolean, isString, signal } from "@hellajs/core";
import { Portal } from "@hellajs/dom";
import { createExitMachine } from "./internal/exitMachine";
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

/** Document-level activation event: triggers carrying a `value` announce clicks and hover-opens (the announce carries the trigger node, so roots scope the mirror to their own bar); content announces hover enter/leave to drive the root's close grace. */
const ACTIVATE_EVENT = "hella:navigation-menu-activate";

/** Grace between a pointer leaving the trigger or open panel and the panel closing, long enough to travel into the portaled panel. */
const HOVER_CLOSE_GRACE = 100;

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
 * on the open trigger closes it. A pointer entering a value-carrying trigger
 * (non-touch) opens its panel the same way; leaving the trigger or the open
 * panel closes it through a short grace that entering the panel cancels, and
 * a pointerdown outside the bar (and any viewport slot) closes the open
 * panel. Mirroring is scoped: announcements carrying a trigger node are
 * mirrored only by the bar containing that node, so independent bars on one
 * page keep independent state. `Content` portals into the shared
 * `Viewport` — the root appends one as its last child (or the `viewport`
 * selector prop names another slot) — and, on mount, publishes its measured
 * size to that slot through the `--radix-navigation-menu-viewport-width/height`
 * vars the viewport css reads, and aligns the viewport wrapper under its
 * trigger (clamped so the panel stays inside the bar). It exits through `animationend` (or
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

  const Root = (props: NavigationMenuRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    const wirings: (() => void)[] = [];
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    return (
      <div
        data-slot="navigation-menu"
        data-viewport={rendersViewport ? "true" : "false"}
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          const cancelClose = (): void => {
            if (closeTimer !== undefined) {
              clearTimeout(closeTimer);
              closeTimer = undefined;
            }
          };
          const armClose = (): void => {
            cancelClose();
            closeTimer = setTimeout(() => {
              closeTimer = undefined;
              setActive("");
            }, HOVER_CLOSE_GRACE);
          };
          const onActivate = (event: Event): void => {
            const detail = (event as CustomEvent).detail;
            // Trigger-carried announcements scope to the bar containing the
            // trigger; node-less dispatches stay manual/global commands.
            if (detail?.el instanceof Node && !node.contains(detail.el)) return;
            if (detail?.kind === "hover-enter") {
              cancelClose();
              return;
            }
            if (detail?.kind === "hover-leave") {
              if (isString(detail.id) && current() !== detail.id) return;
              if (current() === "") return;
              armClose();
              return;
            }
            if (!isString(detail?.id) || !isBoolean(detail?.open)) return;
            cancelClose();
            setActive(detail.open ? detail.id : current() === detail.id ? "" : current());
          };
          const onOutsidePointerDown = (event: Event): void => {
            if (current() === "") return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (node.contains(target)) return;
            if (target.closest("[data-slot='navigation-menu-viewport']")) return;
            cancelClose();
            setActive("");
          };
          document.addEventListener(ACTIVATE_EVENT, onActivate);
          document.addEventListener("pointerdown", onOutsidePointerDown);
          wirings.push(() => document.removeEventListener(ACTIVATE_EVENT, onActivate));
          wirings.push(() => document.removeEventListener("pointerdown", onOutsidePointerDown));
        }}
        hook:beforeDestroy={() => {
          while (wirings.length) wirings.pop()!();
          if (closeTimer !== undefined) clearTimeout(closeTimer);
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
    const wirings: (() => void)[] = [];
    let triggerNode: HTMLElement | undefined;
    const announce = (detail: Record<string, unknown>): void => {
      if (id === undefined) return;
      document.dispatchEvent(
        new CustomEvent(ACTIVATE_EVENT, { detail: { id, el: triggerNode, ...detail } }),
      );
    };

    return (
      <button
        type="button"
        data-slot="navigation-menu-trigger"
        data-value={id}
        data-state={isOpen() ? "open" : "closed"}
        aria-expanded={isOpen() ? "true" : "false"}
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          triggerNode = node;
          // pointerenter/leave do not bubble, so they wire directly instead of
          // through the delegated on: prefix; touch stays click-only.
          const onPointerEnter = (event: Event): void => {
            if ((event as PointerEvent).pointerType === "touch" || isOpen()) return;
            onActivate?.();
            announce({ open: true });
          };
          const onPointerLeave = (event: Event): void => {
            if ((event as PointerEvent).pointerType === "touch") return;
            announce({ kind: "hover-leave" });
          };
          node.addEventListener("pointerenter", onPointerEnter);
          node.addEventListener("pointerleave", onPointerLeave);
          wirings.push(() => node.removeEventListener("pointerenter", onPointerEnter));
          wirings.push(() => node.removeEventListener("pointerleave", onPointerLeave));
        }}
        hook:beforeDestroy={() => {
          while (wirings.length) wirings.pop()!();
          triggerNode = undefined;
        }}
        on:click={function (e) {
          userClick?.call(this, e);
          // The announce carries the requested state (computed before the owner
          // toggle runs), so the root's store mirrors instead of re-toggling.
          const open = !isOpen();
          onActivate?.();
          announce({ open });
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
    // The shared visible/exit machine: `visible` alone gates the render so an
    // open→closed flip never unmounts before the exit starts; the panel stays
    // mounted under data-state="closed" until its animationend (or the
    // fallback budget) removes it.
    const { visible, state, finishExit } = createExitMachine(isOpen);
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
                      finishExit();
                      onExited?.();
                    }
                  };
                  node.addEventListener("animationend", onAnimationEnd);
                  teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
                  // Pointer wiring drives the root's close grace: entering the
                  // open panel cancels the pending close, leaving arms it.
                  const onPointerEnter = (event: Event): void => {
                    if ((event as PointerEvent).pointerType === "touch") return;
                    document.dispatchEvent(
                      new CustomEvent(ACTIVATE_EVENT, { detail: { kind: "hover-enter" } }),
                    );
                  };
                  const onPointerLeave = (event: Event): void => {
                    if ((event as PointerEvent).pointerType === "touch") return;
                    document.dispatchEvent(
                      new CustomEvent(ACTIVATE_EVENT, { detail: { kind: "hover-leave" } }),
                    );
                  };
                  node.addEventListener("pointerenter", onPointerEnter);
                  node.addEventListener("pointerleave", onPointerLeave);
                  teardown.push(() => node.removeEventListener("pointerenter", onPointerEnter));
                  teardown.push(() => node.removeEventListener("pointerleave", onPointerLeave));
                  // Publish the measured size to the viewport slot: the viewport css
                  // reads these vars for its width/height, and the closing panel
                  // keeps the last values through the exit hold.
                  const vp = node.parentElement;
                  if (vp?.getAttribute("data-slot") === "navigation-menu-viewport") {
                    vp.style.setProperty(
                      "--radix-navigation-menu-viewport-width",
                      `${node.offsetWidth}px`,
                    );
                    vp.style.setProperty(
                      "--radix-navigation-menu-viewport-height",
                      `${node.offsetHeight}px`,
                    );
                    // Align the panel under its trigger: the wrapper spans the bar
                    // (width: 100% + justify-center is the centering base), so the
                    // offset shifts from center toward the trigger, clamped to keep
                    // the panel inside the bar. The transform rides the wrapper (the
                    // slot's enter/exit keyframes animate transform) and the closing
                    // panel keeps the last alignment through the exit hold.
                    const wrapper = vp.parentElement;
                    // Trigger resolution: the id query for store-driven usage; the
                    // sole expanded trigger for active-accessor wiring (ids omitted),
                    // where scoped stores keep exactly one trigger open.
                    const trigger =
                      (id !== undefined
                        ? document.querySelector(
                            `[data-slot='navigation-menu-trigger'][data-value='${id}']`,
                          )
                        : null) ??
                      document.querySelector(
                        "[data-slot='navigation-menu-trigger'][aria-expanded='true']",
                      );
                    if (wrapper instanceof HTMLElement && trigger) {
                      const w = wrapper.getBoundingClientRect();
                      const t = trigger.getBoundingClientRect();
                      const half = Math.max(0, (w.width - node.offsetWidth) / 2);
                      const raw = t.left + t.width / 2 - (w.left + w.width / 2);
                      const offset = Math.max(-half, Math.min(half, raw));
                      wrapper.style.transform = `translateX(${offset}px)`;
                    }
                  }
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
