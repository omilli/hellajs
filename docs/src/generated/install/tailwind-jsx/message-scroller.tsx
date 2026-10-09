import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";
const base =
  "group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden";

const viewport =
  "size-full min-h-0 min-w-0 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-none data-pending-scroll:invisible";

const item =
  "min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]";

const overlay =
  "absolute inset-s-1/2 -translate-x-1/2 border-border bg-background text-foreground transition-[translate,scale,opacity] duration-200 hover:bg-muted hover:text-foreground data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=false]:duration-400 data-[active=false]:ease-[cubic-bezier(0.7,0,0.84,0)] data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full rtl:translate-x-1/2 data-[direction=start]:[&_svg]:rotate-180";

const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
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

interface MessageScrollerProviderProps {
  children?: HellaChildren;
}

/**
 * Drop-in composition wrapper kept for API parity with the upstream provider.
 * Hella has no context: state lives on signals the composer owns and passes to
 * the viewport and button explicitly (see MessageScrollerViewport).
 */
export function MessageScrollerProvider(props: MessageScrollerProviderProps): JSX.Element {
  return <>{props.children}</>;
}

interface MessageScrollerViewportProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  /** Shared at-bottom state; the viewport flips it and owns an internal signal when absent. */
  atBottom?: Signal<boolean>;
  /** Overrides the scroll-to-bottom action used for auto-stick and the jump button. */
  scrollToBottom?: () => void;
  /** Distance in px from the bottom still counted as at-bottom. */
  threshold?: number;
  /** Injectable content watcher returning its own dispose; defaults to a ResizeObserver. */
  observe?: (target: Element, onGrow: () => void) => () => void;
}

export function MessageScrollerViewport({ atBottom, scrollToBottom, threshold, observe, children, class: cls, ...attrs }: MessageScrollerViewportProps): JSX.Element {
  const fallback = signal(true);
  const teardown: (() => void)[] = [];
  let el: HTMLElement | undefined;

  const state = (): Signal<boolean> => atBottom ?? fallback;

  const jump = (): void => {
    if (scrollToBottom) scrollToBottom();
    else if (el) {
      el.scrollTop = el.scrollHeight;
      state()(true);
    }
  };

  const sync = (): void => {
    const node = el;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    state()(distance <= (threshold ?? 80));
  };

  const defaultObserve = (target: Element, onGrow: () => void): (() => void) => {
    if (typeof ResizeObserver === "undefined") return () => undefined;
    const observer = new ResizeObserver(onGrow);
    observer.observe(target);
    return () => observer.disconnect();
  };

  const onGrow = (): void => {
    if (state()()) jump();
    sync();
  };

  return (
    <div
      data-slot="message-scroller-viewport"
      class={
        cn(viewport, cls)
      }
      {...attrs}
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        el = node;
        node.addEventListener("scroll", sync, { passive: true });
        teardown.push(() => node.removeEventListener("scroll", sync));
        const inner = node.firstElementChild;
        if (inner) teardown.push((observe ?? defaultObserve)(inner, onGrow));
        if (state()()) node.scrollTop = node.scrollHeight;
      }}
      hook:beforeDestroy={() => {
        while (teardown.length) teardown.pop()!();
        el = undefined;
      }}
    >
      {children}
    </div>
  );
}

interface MessageScrollerContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageScrollerContent({ children, class: cls, ...attrs }: MessageScrollerContentProps): JSX.Element {
  return (
    <div
      data-slot="message-scroller-content"
      class={
        cn("flex h-max min-h-full flex-col gap-8", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MessageScrollerItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageScrollerItem({ children, class: cls, ...attrs }: MessageScrollerItemProps): JSX.Element {
  return (
    <div
      data-slot="message-scroller-item"
      class={
        cn(item, cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface MessageScrollerButtonProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  /** Shared at-bottom state driving data-active; the default scroll action writes it back to true. */
  atBottom?: Signal<boolean>;
  scrollToBottom?: () => void;
  direction?: "start" | "end";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export function MessageScrollerButton({ atBottom, scrollToBottom, direction: dir, variant, size, "on:click": userClick, children, class: cls, ...attrs }: MessageScrollerButtonProps): JSX.Element {
  const direction = (): "start" | "end" => dir ?? "end";

  const active = (): "true" | "false" => {
    const bottom = atBottom?.() ?? true;
    const isActive = direction() === "end" ? !bottom : bottom;
    return isActive ? "true" : "false";
  };

  const click = (event: Event): void => {
    if (scrollToBottom) {
      scrollToBottom();
      atBottom?.(true);
      return;
    }
    if (!(event.target instanceof Element)) return;
    const viewport = event.target.closest('[data-slot="message-scroller"]')?.querySelector('[data-slot="message-scroller-viewport"]');
    if (viewport instanceof HTMLElement) {
      viewport.scrollTop = viewport.scrollHeight;
      atBottom?.(true);
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
      class={
        cn(
          buttonBase,
          buttonVariants[variant ?? "secondary"],
          buttonSizes[size ?? "icon-sm"],
          overlay,
          cls,
        )
      }
      on:click={function (e) { userClick?.call(this, e); click(e); }}
      {...attrs}
    >
      {children ?? (
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
          <span class="sr-only">{direction() === "end" ? "Scroll to end" : "Scroll to start"}</span>
        </>
      )}
    </button>
  );
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

/**
 * Composed root: owns the at-bottom signal (or adopts the caller's), wraps the
 * children in a viewport + content stack, and renders the jump-to-end button
 * whose visibility the at-bottom state drives.
 */
export function MessageScroller({ atBottom, scrollToBottom, threshold, observe, showScrollButton, children, class: cls, ...attrs }: MessageScrollerProps): JSX.Element {
  const bottom = atBottom ?? signal(true);
  return (
    <div
      data-slot="message-scroller"
      class={
        cn(base, cls)
      }
      {...attrs}
    >
      <MessageScrollerViewport
        atBottom={bottom}
        scrollToBottom={scrollToBottom}
        threshold={threshold}
        observe={observe}
      >
        <MessageScrollerContent children={flattenChildren(children)} />
      </MessageScrollerViewport>
      {showScrollButton !== false && (
        <MessageScrollerButton atBottom={bottom} scrollToBottom={scrollToBottom} />
      )}
    </div>
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
