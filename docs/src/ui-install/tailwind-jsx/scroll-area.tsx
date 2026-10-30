import { scrollArea } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface ScrollBarProps extends HTMLAttributes<"div"> {
  class?: string;
  /** Axis the bar tracks and drags. Both orientations may be composed into one root. */
  orientation?: "vertical" | "horizontal";
  /** Injectable content watcher returning its own dispose; defaults to a ResizeObserver on the viewport's content. */
  observe?: (target: Element, onGrow: () => void) => () => void;
}

interface ScrollAreaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  /** Injectable content watcher forwarded to the internal vertical ScrollBar. */
  observe?: (target: Element, onGrow: () => void) => () => void;
}
import { cn } from "./cn.js";

/**
 * The scrollbar chrome for one axis: a wiring-wrapped bar whose thumb sizes
 * and positions itself from the paired viewport, draggable through its track
 * span. Compose it as a child of `ScrollArea` for a second (horizontal) axis.
 */
export function ScrollBar({
  orientation,
  observe,
  class: cls,
  ...attrs
}: ScrollBarProps): JSX.Element {
  const { Scrollbar, Thumb } = scrollArea({ observe });
  return (
    <Scrollbar
      orientation={orientation}
      class={
        cn("flex touch-none p-px transition-colors select-none absolute data-[orientation=vertical]:top-0 data-[orientation=vertical]:right-0 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-l-transparent data-[orientation=horizontal]:bottom-0 data-[orientation=horizontal]:left-0 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-t-transparent", cls)
      }
      {...attrs}
    >
      <Thumb
        class={
          cn("relative flex-1 rounded-full bg-border")
        }
      />
    </Scrollbar>
  );
}

/**
 * Native-scroll viewport with shadcn's custom scrollbar chrome: the root wraps
 * a real scrolling viewport plus a vertical ScrollBar, and a horizontal bar
 * composes in as a child for both-axes scrolling.
 */
export function ScrollArea({
  observe,
  children,
  class: cls,
  ...attrs
}: ScrollAreaProps): JSX.Element {
  const { Root, Viewport, Scrollbar, Thumb } = scrollArea({ observe });
  return (
    <Root
      class={
        cn("relative", cls)
      }
      {...attrs}
    >
      <Viewport
        class={
          cn("size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 overflow-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")
        }
      >
        {children}
      </Viewport>
      <Scrollbar>
        <Thumb
          class={
            cn("relative flex-1 rounded-full bg-border")
          }
        />
      </Scrollbar>
      <div data-slot="scroll-area-corner" />
    </Root>
  );
}
