import { signal } from "@hellajs/core";
import type {
  MessageScrollerButtonProps,
  MessageScrollerContentProps,
  MessageScrollerItemProps,
  MessageScrollerOptions,
  MessageScrollerParts,
  MessageScrollerProviderProps,
  MessageScrollerRootProps,
  MessageScrollerViewportProps,
} from "./types/parts";

/**
 * Creates the message-scroller part set: `Provider` + `Root` + `Viewport` +
 * `Content` + `Item` + `Button`. The closure owns the at-bottom state —
 * the `atBottom` signal when passed, an internal signal seeded `true` when
 * omitted — and the scroll action: `Viewport` flips the state as the user
 * scrolls, sticks to the bottom on content growth while at-bottom (leaving the
 * position alone when scrolled away), and `Button` reports the state through
 * `data-active` and jumps back to the bottom on click. Compose `Content`
 * inside `Viewport`; compose `Button` beside it. Call in component scope so
 * the internal state signal disposes with the component.
 *
 * ```tsx
 * const Scroller = messageScroller({ atBottom });
 *
 * <Scroller.Root>
 *   <Scroller.Viewport>
 *     <Scroller.Content>{messages}</Scroller.Content>
 *   </Scroller.Viewport>
 *   <Scroller.Button>Jump to bottom</Scroller.Button>
 * </Scroller.Root>
 * ```
 * @param options controlled `atBottom` signal, the `scrollToBottom` override for the auto-stick and jump actions, the `threshold` distance still counted as at-bottom, and the injected `observe` content watcher.
 * @returns The part set, composed as `Scroller.Root`-style members.
 */
export function messageScroller(options: MessageScrollerOptions = {}): MessageScrollerParts {
  const bottom = options.atBottom ?? signal(true);
  const scrollToBottom = options.scrollToBottom;
  const threshold = options.threshold;
  const observe = options.observe;

  let viewportEl: HTMLElement | undefined;

  const defaultObserve = (target: Element, onGrow: () => void): (() => void) => {
    const observerCtor = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    if (!observerCtor) return () => undefined;
    const observer = new observerCtor(onGrow);
    observer.observe(target);
    return () => observer.disconnect();
  };

  const Provider = (props: MessageScrollerProviderProps): JSX.Element => {
    return <>{props.children}</>;
  };

  const Viewport = (props: MessageScrollerViewportProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    const teardown: (() => void)[] = [];

    const jump = (): void => {
      if (scrollToBottom) scrollToBottom();
      else if (viewportEl) {
        viewportEl.scrollTop = viewportEl.scrollHeight;
        bottom(true);
      }
    };

    const sync = (): void => {
      const node = viewportEl;
      if (!node) return;
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      bottom(distance <= (threshold ?? 80));
    };

    const onGrow = (): void => {
      if (bottom()) jump();
      sync();
    };

    return (
      <div
        data-slot="message-scroller-viewport"
        class={cls}
        {...attrs}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          viewportEl = node;
          node.addEventListener("scroll", sync, { passive: true });
          teardown.push(() => node.removeEventListener("scroll", sync));
          const inner = node.firstElementChild;
          if (inner) teardown.push((observe ?? defaultObserve)(inner, onGrow));
          if (bottom()) node.scrollTop = node.scrollHeight;
        }}
        hook:beforeDestroy={() => {
          while (teardown.length) teardown.pop()!();
          viewportEl = undefined;
        }}
      >
        {children}
      </div>
    );
  };

  const Content = (props: MessageScrollerContentProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="message-scroller-content" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Item = (props: MessageScrollerItemProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="message-scroller-item" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Button = (props: MessageScrollerButtonProps): JSX.Element => {
    const {
      direction: dir,
      variant,
      size,
      "on:click": userClick,
      children,
      class: cls,
      ...attrs
    } = props;
    const direction = (): "start" | "end" => dir ?? "end";

    // Babel compiles a JSX child expression to a one-element array, so a
    // passthrough child slot arrives as `[undefined]` when the wrapper had no
    // children; unwrap one level before the default-content check.
    const slotted = Array.isArray(children) && children.length === 1 ? children[0] : children;

    const active = (): "true" | "false" => {
      const isActive = direction() === "end" ? !bottom() : bottom();
      return isActive ? "true" : "false";
    };

    const click = (event: Event): void => {
      if (scrollToBottom) {
        scrollToBottom();
        bottom(true);
        return;
      }
      let viewport = viewportEl;
      if (!viewport && event.target instanceof Element) {
        const found = event.target
          .closest('[data-slot="message-scroller"]')
          ?.querySelector('[data-slot="message-scroller-viewport"]');
        if (found instanceof HTMLElement) viewport = found;
      }
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
        bottom(true);
      }
    };

    return (
      <button
        type="button"
        data-slot="message-scroller-button"
        data-direction={direction()}
        data-variant={variant ?? "secondary"}
        data-size={size ?? "icon-sm"}
        data-active={active}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          click(e);
        }}
        {...attrs}
      >
        {slotted == null ? (
          <>
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
              <path d="M12 5v14" />
              <path d="m19 12-7 7-7-7" />
            </svg>
            <span data-slot="message-scroller-sr">
              {direction() === "end" ? "Scroll to end" : "Scroll to start"}
            </span>
          </>
        ) : (
          children
        )}
      </button>
    );
  };

  const Root = (props: MessageScrollerRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="message-scroller" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  return { Provider, Root, Viewport, Content, Item, Button };
}
