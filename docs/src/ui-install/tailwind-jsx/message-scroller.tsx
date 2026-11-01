import { messageScroller, ScrollerRows } from "@hellajs/headless";
import type { Signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface MessageScrollerItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

interface MessageScrollerProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  atBottom?: Signal<boolean>;
  scrollToBottom?: () => void;
  threshold?: number;
  observe?: (target: Element, onGrow: () => void) => () => void;
  showScrollButton?: boolean;
}
import { cn } from "./cn.js";

const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
  outline:
    "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline",
};

const buttonSizes = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
  lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
  icon: "size-9",
  "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-8",
  "icon-lg": "size-10",
};

export function MessageScrollerItem({
  children,
  class: cls,
  ...attrs
}: MessageScrollerItemProps): JSX.Element {
  return (
    <ScrollerRows.Item
      class={
        cn("min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]", cls)
      }
      {...attrs}
    >
      {children}
    </ScrollerRows.Item>
  );
}

/**
 * Composed root: owns the at-bottom signal (or adopts the caller's), wraps the
 * children in a viewport + content stack, and renders the jump-to-end button
 * whose visibility the at-bottom state drives.
 */
export function MessageScroller({
  atBottom,
  scrollToBottom,
  threshold,
  observe,
  showScrollButton,
  children,
  class: cls,
  ...attrs
}: MessageScrollerProps): JSX.Element {
  const { Root, Viewport, Content, Button } = messageScroller({
    atBottom,
    scrollToBottom,
    threshold,
    observe,
  });
  return (
    <Root
      class={
        cn("group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden", cls)
      }
      {...attrs}
    >
      <Viewport
        class={
          cn("size-full min-h-0 min-w-0 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-none data-pending-scroll:invisible")
        }
      >
        <Content
          class={
            cn("flex h-max min-h-full flex-col gap-8")
          }
        >
          {children}
        </Content>
      </Viewport>
      {showScrollButton !== false && (
        <Button
          class={
            cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-slot='message-scroller-sr']]:sr-only", buttonVariants.secondary, buttonSizes["icon-sm"], "absolute inset-s-1/2 -translate-x-1/2 border-border bg-background text-foreground transition-[translate,scale,opacity] duration-200 hover:bg-muted hover:text-foreground data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=false]:duration-400 data-[active=false]:ease-[cubic-bezier(0.7,0,0.84,0)] data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full rtl:translate-x-1/2 data-[direction=start]:[&_svg]:rotate-180")
          }
        />
      )}
    </Root>
  );
}
