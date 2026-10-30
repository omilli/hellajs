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

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("scroll-area", {
  position: "relative",
});

const viewport = style("scroll-area-viewport", {
  height: "100%",
  width: "100%",
  borderRadius: "inherit",
  outlineStyle: "none",
  overflow: "scroll",
  scrollbarWidth: "none",
  transitionProperty: "color, box-shadow",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&::-webkit-scrollbar": {
    display: "none",
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    outline: "1px solid",
  },
});

const scrollbar = style("scroll-area-scrollbar", {
  display: "flex",
  padding: "1px",
  touchAction: "none",
  userSelect: "none",
  transitionProperty:
    "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-orientation='vertical']": {
    position: "absolute",
    top: "0",
    right: "0",
    height: "100%",
    width: "0.625rem",
    borderLeft: "1px solid transparent",
  },
  "&[data-orientation='horizontal']": {
    position: "absolute",
    bottom: "0",
    left: "0",
    width: "100%",
    height: "0.625rem",
    flexDirection: "column",
    borderTop: "1px solid transparent",
  },
});

const thumb = style("scroll-area-thumb", {
  position: "relative",
  flex: "1 1 0%",
  borderRadius: "9999px",
  backgroundColor: tokens.border,
});

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
        [scrollbar, cls]
      }
      {...attrs}
    >
      <Thumb
        class={
          [thumb]
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
        [base, cls]
      }
      {...attrs}
    >
      <Viewport
        class={
          [viewport]
        }
      >
        {children}
      </Viewport>
      <Scrollbar>
        <Thumb
          class={
            [thumb]
          }
        />
      </Scrollbar>
      <div data-slot="scroll-area-corner" />
    </Root>
  );
}
