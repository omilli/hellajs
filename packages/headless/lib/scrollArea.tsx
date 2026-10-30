import { onDrag } from "./onDrag";
import type {
  ScrollAreaOptions,
  ScrollAreaParts,
  ScrollAreaRootProps,
  ScrollAreaScrollbarProps,
  ScrollAreaThumbProps,
  ScrollAreaViewportProps,
} from "./types/parts";

/**
 * Creates the scroll-area part set: `Root` + `Viewport` + `Scrollbar` + `Thumb`.
 * `Viewport` renders the native-scroll viewport over its content wrapper;
 * `Scrollbar` owns the thumb geometry per instance: it measures the paired
 * viewport on scroll and content growth, positions and sizes the `Thumb`
 * rendered inside it, and arms the thumb drag that maps pointer travel back to
 * `scrollTop`/`scrollLeft`. Compose one `Scrollbar` per axis; each measures and
 * drags its own. The factory holds no reactive state, so the call site needs no
 * disposal; every `Scrollbar` drains its wiring at unmount.
 *
 * ```tsx
 * const Area = scrollArea();
 *
 * <Area.Root>
 *   <Area.Viewport>{content}</Area.Viewport>
 *   <Area.Scrollbar>
 *     <Area.Thumb />
 *   </Area.Scrollbar>
 * </Area.Root>
 * ```
 * @param options `observe` replaces the default `ResizeObserver` content watcher the `Scrollbar` arms.
 * @returns The part set, composed as `Area.Root`-style members.
 */
export function scrollArea(options: ScrollAreaOptions = {}): ScrollAreaParts {
  const watch = options.observe;

  const Root = (props: ScrollAreaRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="scroll-area" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Viewport = (props: ScrollAreaViewportProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="scroll-area-viewport" class={cls} {...attrs}>
        <div data-slot="scroll-area-content">{children}</div>
      </div>
    );
  };

  const Thumb = (props: ScrollAreaThumbProps): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return <div data-slot="scroll-area-thumb" class={cls} {...attrs} />;
  };

  const Scrollbar = (props: ScrollAreaScrollbarProps): JSX.Element => {
    const { orientation: orientationProp, observe, children, class: cls, ...attrs } = props;
    const orientation = (): "vertical" | "horizontal" => orientationProp ?? "vertical";
    const vertical = (): boolean => orientation() === "vertical";
    const watchContent = observe ?? watch;

    let bar: HTMLElement | undefined;
    let viewportEl: HTMLElement | undefined;
    let thumbEl: HTMLElement | undefined;
    let thumbLength = 0;
    const teardown: (() => void)[] = [];

    const defaultObserve = (target: Element, onGrow: () => void): (() => void) => {
      const observerCtor = (globalThis as { ResizeObserver?: typeof ResizeObserver })
        .ResizeObserver;
      if (!observerCtor) return () => undefined;
      const observer = new observerCtor(onGrow);
      observer.observe(target);
      return () => observer.disconnect();
    };

    const measure = (): void => {
      const trackEl = bar;
      const view = viewportEl;
      const thumb = thumbEl;
      if (!trackEl || !view || !thumb) return;
      const track = vertical() ? trackEl.clientHeight : trackEl.clientWidth;
      const scrollSize = vertical() ? view.scrollHeight : view.scrollWidth;
      const clientSize = vertical() ? view.clientHeight : view.clientWidth;
      const maxScroll = scrollSize - clientSize;
      const ratio = scrollSize > 0 && clientSize > 0 ? Math.min(1, clientSize / scrollSize) : 1;
      const size = Math.min(track, Math.max(20, ratio * track));
      const travel = Math.max(0, track - size);
      const at = maxScroll > 0 ? (vertical() ? view.scrollTop : view.scrollLeft) / maxScroll : 0;
      thumbLength = size;
      const position = Math.min(travel, Math.max(0, at * travel));
      thumb.setAttribute(
        "style",
        vertical()
          ? `flex: none; height: ${size}px; transform: translateY(${position}px)`
          : `flex: none; width: ${size}px; transform: translateX(${position}px)`,
      );
    };

    return (
      <div
        data-slot="scroll-area-scrollbar"
        data-orientation={orientation()}
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          bar = node;
          const root = node.closest('[data-slot="scroll-area"]');
          const view = root?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
          if (!view) return;
          viewportEl = view;
          view.addEventListener("scroll", measure, { passive: true });
          teardown.push(() => view.removeEventListener("scroll", measure));
          const content = view.firstElementChild;
          if (content) teardown.push((watchContent ?? defaultObserve)(content, measure));
          const thumb = node.querySelector<HTMLElement>("[data-slot='scroll-area-thumb']");
          if (thumb) {
            thumbEl = thumb;
            let startScroll = 0;
            let span = 0;
            let maxScroll = 0;
            teardown.push(
              onDrag(thumb, {
                onStart: () => {
                  const track = vertical() ? node.clientHeight : node.clientWidth;
                  const scrollSize = vertical() ? view.scrollHeight : view.scrollWidth;
                  const clientSize = vertical() ? view.clientHeight : view.clientWidth;
                  maxScroll = Math.max(0, scrollSize - clientSize);
                  span = Math.max(0, track - thumbLength);
                  startScroll = vertical() ? view.scrollTop : view.scrollLeft;
                },
                onMove: (delta) => {
                  if (maxScroll <= 0 || span <= 0) return;
                  const moved = vertical() ? delta.dy : delta.dx;
                  const next = Math.min(
                    maxScroll,
                    Math.max(0, startScroll + (moved / span) * maxScroll),
                  );
                  if (vertical()) view.scrollTop = next;
                  else view.scrollLeft = next;
                },
              }),
            );
          }
          measure();
        }}
        hook:beforeDestroy={() => {
          while (teardown.length) teardown.pop()!();
          bar = undefined;
          viewportEl = undefined;
          thumbEl = undefined;
        }}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  return { Root, Viewport, Scrollbar, Thumb };
}
