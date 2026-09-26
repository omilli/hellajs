import { signal } from "@hellajs/core";
import { onDrag } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const scrollbar: string;
declare const thumb: string;
declare const viewport: string;
// @hella:end

interface ScrollBarProps {
  /** Axis the bar tracks and drags. Both orientations may be composed into one root. */
  orientation?: "vertical" | "horizontal";
  /** Injectable content watcher returning its own dispose; defaults to a ResizeObserver on the viewport's content. */
  observe?: (target: Element, onGrow: () => void) => () => void;
  class?: string;
}

export function ScrollBar(props: ScrollBarProps): JSX.Element {
  const orientation = (): "vertical" | "horizontal" => props.orientation ?? "vertical";
  const vertical = (): boolean => orientation() === "vertical";

  const length = signal(0);
  const position = signal(0);

  let bar: HTMLElement | undefined;
  let viewport: HTMLElement | undefined;
  const teardown: (() => void)[] = [];

  const defaultObserve = (target: Element, onGrow: () => void): (() => void) => {
    if (typeof ResizeObserver === "undefined") return () => undefined;
    const observer = new ResizeObserver(onGrow);
    observer.observe(target);
    return () => observer.disconnect();
  };

  const measure = (): void => {
    const trackEl = bar;
    const view = viewport;
    if (!trackEl || !view) return;
    const track = vertical() ? trackEl.clientHeight : trackEl.clientWidth;
    const scrollSize = vertical() ? view.scrollHeight : view.scrollWidth;
    const clientSize = vertical() ? view.clientHeight : view.clientWidth;
    const maxScroll = scrollSize - clientSize;
    const ratio = scrollSize > 0 && clientSize > 0 ? Math.min(1, clientSize / scrollSize) : 1;
    const thumb = Math.min(track, Math.max(20, ratio * track));
    const travel = Math.max(0, track - thumb);
    const at = maxScroll > 0 ? (vertical() ? view.scrollTop : view.scrollLeft) / maxScroll : 0;
    length(thumb);
    position(Math.min(travel, Math.max(0, at * travel)));
  };

  const thumbStyle = (): Record<string, string> =>
    vertical()
      ? { flex: "none", height: `${length()}px`, transform: `translateY(${position()}px)` }
      : { flex: "none", width: `${length()}px`, transform: `translateX(${position()}px)` };

  return (
    <div
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation()}
      class={
        // @hella:compose
        [scrollbar, props.class]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        bar = node;
        const root = node.closest('[data-slot="scroll-area"]');
        const view = root?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
        if (!view) return;
        viewport = view;
        view.addEventListener("scroll", measure, { passive: true });
        teardown.push(() => view.removeEventListener("scroll", measure));
        const content = view.firstElementChild;
        if (content) teardown.push((props.observe ?? defaultObserve)(content, measure));
        const thumb = node.querySelector<HTMLElement>("[data-slot='scroll-area-thumb']");
        if (thumb) {
          let startScroll = 0;
          let span = 0;
          let maxScroll = 0;
          teardown.push(onDrag(thumb, {
            onStart: () => {
              const track = vertical() ? node.clientHeight : node.clientWidth;
              const scrollSize = vertical() ? view.scrollHeight : view.scrollWidth;
              const clientSize = vertical() ? view.clientHeight : view.clientWidth;
              maxScroll = Math.max(0, scrollSize - clientSize);
              span = Math.max(0, track - length());
              startScroll = vertical() ? view.scrollTop : view.scrollLeft;
            },
            onMove: (delta) => {
              if (maxScroll <= 0 || span <= 0) return;
              const moved = vertical() ? delta.dy : delta.dx;
              const next = Math.min(maxScroll, Math.max(0, startScroll + (moved / span) * maxScroll));
              if (vertical()) view.scrollTop = next;
              else view.scrollLeft = next;
            },
          }));
        }
        measure();
      }}
      hook:beforeDestroy={() => {
        while (teardown.length) teardown.pop()!();
        bar = undefined;
        viewport = undefined;
      }}
    >
      <div
        data-slot="scroll-area-thumb"
        style={thumbStyle}
        class={
          // @hella:compose
          [thumb]
          // @hella:end
        }
      />
    </div>
  );
}

interface ScrollAreaProps {
  children?: HellaChildren;
  /** Injectable content watcher forwarded to the internal vertical ScrollBar. */
  observe?: (target: Element, onGrow: () => void) => () => void;
  class?: string;
}

/**
 * Native-scroll viewport with shadcn's custom scrollbar chrome: the root wraps
 * a real scrolling viewport plus a vertical ScrollBar, and a horizontal bar
 * composes in as a child for both-axes scrolling.
 */
export default function ScrollArea(props: ScrollAreaProps): JSX.Element {
  return (
    <div
      data-slot="scroll-area"
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      <div
        data-slot="scroll-area-viewport"
        class={
          // @hella:compose
          [viewport]
          // @hella:end
        }
      >
        <div data-slot="scroll-area-content">{props.children}</div>
      </div>
      <ScrollBar observe={props.observe} />
      <div data-slot="scroll-area-corner" />
    </div>
  );
}
