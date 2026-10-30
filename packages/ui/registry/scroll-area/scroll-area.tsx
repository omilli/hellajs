import { scrollArea } from "@hellajs/headless";
import type { ScrollAreaProps, ScrollBarProps } from "./scroll-area-types.js";

// @hella:styles
declare const base: string;
declare const scrollbar: string;
declare const thumb: string;
declare const viewport: string;
// @hella:end

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
        // @hella:compose
        [scrollbar, cls]
        // @hella:end
      }
      {...attrs}
    >
      <Thumb
        class={
          // @hella:compose
          [thumb]
          // @hella:end
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
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      <Viewport
        class={
          // @hella:compose
          [viewport]
          // @hella:end
        }
      >
        {children}
      </Viewport>
      <Scrollbar>
        <Thumb
          class={
            // @hella:compose
            [thumb]
            // @hella:end
          }
        />
      </Scrollbar>
      <div data-slot="scroll-area-corner" />
    </Root>
  );
}
