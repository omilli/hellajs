import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";
import { css, style } from "@hellajs/css";

const base = style("message-scroller", {
  position: "relative",
  display: "flex",
  height: "100%",
  width: "100%",
  minHeight: "0",
  flexDirection: "column",
  overflow: "hidden",
});

const viewport = style("message-scroller-viewport", {
  height: "100%",
  width: "100%",
  minHeight: "0",
  minWidth: "0",
  overflowY: "auto",
  overscrollBehavior: "contain",
  contain: "content",
});

const content = style("message-scroller-content", {
  display: "flex",
  height: "max-content",
  minHeight: "100%",
  flexDirection: "column",
  gap: "2rem",
});

const item = style("message-scroller-item", {
  minWidth: "0",
  flexShrink: "0",
  containIntrinsicSize: "auto 10rem",
  contentVisibility: "auto",
});

const buttonBase = style("message-scroller-button", {
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
});

const buttonVariants = {
  default: style("message-scroller-button-default", {
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  }),
  destructive: style("message-scroller-button-destructive", {
    backgroundColor: "var(--destructive)",
    color: "#fff",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 90%, transparent)",
    },
    "&:focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
    },
    "&:is(.dark *)": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 60%, transparent)",
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
    },
  }),
  outline: style("message-scroller-button-outline", {
    background: "var(--background)",
    border: "1px solid var(--border)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *)": {
      borderColor: "var(--input)",
      background: "color-mix(in oklab, var(--input) 30%, transparent)",
    },
    "&:is(.dark *):hover": {
      background: "color-mix(in oklab, var(--input) 50%, transparent)",
    },
  }),
  secondary: style("message-scroller-button-secondary", {
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
    },
  }),
  ghost: style("message-scroller-button-ghost", {
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }),
  link: style("message-scroller-button-link", {
    color: "var(--primary)",
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }),
};

const buttonSizes = {
  default: style("message-scroller-button-size-default", {
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }),
  xs: style("message-scroller-button-size-xs", {
    borderRadius: "calc(var(--radius) * 0.8)",
    fontSize: "0.75rem",
    gap: "0.25rem",
    height: "1.5rem",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    "&:has(> svg)": {
      paddingInline: "0.375rem",
    },
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  sm: style("message-scroller-button-size-sm", {
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  lg: style("message-scroller-button-size-lg", {
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }),
  icon: style("message-scroller-button-size-icon", {
    height: "2.25rem",
    width: "2.25rem",
  }),
  "icon-xs": style("message-scroller-button-size-icon-xs", {
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  "icon-sm": style("message-scroller-button-size-icon-sm", {
    height: "2rem",
    width: "2rem",
  }),
  "icon-lg": style("message-scroller-button-size-icon-lg", {
    height: "2.5rem",
    width: "2.5rem",
  }),
};

const overlay = style("message-scroller-overlay", {
  position: "absolute",
  insetInlineStart: "50%",
  translate: "-50% 0",
  borderColor: "var(--border)",
  backgroundColor: "var(--background)",
  color: "var(--foreground)",
  transitionProperty: "translate, scale, opacity",
  transitionDuration: "200ms",
  "&:hover": {
    backgroundColor: "var(--muted)",
    color: "var(--foreground)",
  },
  "&[data-active='false']": {
    pointerEvents: "none",
    scale: "0.95",
    opacity: "0",
    transitionDuration: "400ms",
    transitionTimingFunction: "cubic-bezier(0.7, 0, 0.84, 0)",
  },
  "&[data-active='true']": {
    translate: "-50% 0",
    scale: "1",
    opacity: "1",
    transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
  },
  "&[data-direction='end']": {
    bottom: "1rem",
  },
  "&[data-direction='end'][data-active='false']": {
    translate: "-50% 100%",
  },
  "&[data-direction='start']": {
    top: "1rem",
  },
  "&[data-direction='start'][data-active='false']": {
    translate: "-50% -100%",
  },
});

const srOnly = style("message-scroller-sr-only", {
  border: "0",
  clip: "rect(0, 0, 0, 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
});

css({
  "[data-slot='message-scroller-button'][data-direction='start'] svg": {
    transform: "rotate(180deg)",
  },
  "[dir='rtl'] [data-slot='message-scroller-button']": {
    translate: "50% 0",
  },
  "[dir='rtl'] [data-slot='message-scroller-button'][data-direction='end'][data-active='false']": {
    translate: "50% 100%",
  },
  "[dir='rtl'] [data-slot='message-scroller-button'][data-direction='start'][data-active='false']": {
    translate: "50% -100%",
  },
});

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
        [viewport, cls]
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
        [content, cls]
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
        [item, cls]
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
        [
          buttonBase,
          buttonVariants[variant ?? "secondary"],
          buttonSizes[size ?? "icon-sm"],
          overlay,
          cls,
        ]
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
          <span class={srOnly}>{direction() === "end" ? "Scroll to end" : "Scroll to start"}</span>
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
        [base, cls]
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
