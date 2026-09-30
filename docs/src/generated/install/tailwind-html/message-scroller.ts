import { html } from "@hellajs/dom";
import { signal as coreSignal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const base =
  "group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden";

const viewport =
  "size-full min-h-0 min-w-0 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-none data-pending-scroll:invisible";

const content = "flex h-max min-h-full flex-col gap-8";

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

const srOnly = "sr-only";

interface MessageScrollerProviderProps {
  children?: HellaChildren;
}

/**
 * Drop-in composition wrapper kept for API parity with the upstream provider.
 * Hella has no context: state lives on signals the composer owns and passes to
 * the viewport and button explicitly (see MessageScrollerViewport).
 */
export function MessageScrollerProvider(props: MessageScrollerProviderProps): HellaNode {
  return html`${() => props.children}` as HellaNode;
}

interface MessageScrollerViewportProps {
  children?: HellaChildren;
  /** Shared at-bottom state; the viewport flips it and owns an internal signal when absent. */
  atBottom?: Signal<boolean>;
  /** Overrides the scroll-to-bottom action used for auto-stick and the jump button. */
  scrollToBottom?: () => void;
  /** Distance in px from the bottom still counted as at-bottom. */
  threshold?: number;
  /** Injectable content watcher returning its own dispose; defaults to a ResizeObserver. */
  observe?: (target: Element, onGrow: () => void) => () => void;
  class?: string;
}

export function MessageScrollerViewport(props: MessageScrollerViewportProps): HellaNode {
  const fallback = coreSignal(true);
  const teardown: (() => void)[] = [];
  let el: HTMLElement | undefined;

  const state = (): Signal<boolean> => props.atBottom ?? fallback;

  const scrollToBottom = (): void => {
    if (props.scrollToBottom) props.scrollToBottom();
    else if (el) {
      el.scrollTop = el.scrollHeight;
      state()(true);
    }
  };

  const sync = (): void => {
    const node = el;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    state()(distance <= (props.threshold ?? 80));
  };

  const defaultObserve = (target: Element, onGrow: () => void): (() => void) => {
    if (typeof ResizeObserver === "undefined") return () => undefined;
    const observer = new ResizeObserver(onGrow);
    observer.observe(target);
    return () => observer.disconnect();
  };

  const onGrow = (): void => {
    if (state()()) scrollToBottom();
    sync();
  };

  return html`
    <div
      data-slot="message-scroller-viewport"
      class="${
        cn(viewport, props.class)
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        el = node;
        node.addEventListener("scroll", sync, { passive: true });
        teardown.push(() => node.removeEventListener("scroll", sync));
        const content = node.firstElementChild;
        if (content) teardown.push((props.observe ?? defaultObserve)(content, onGrow));
        if (state()()) node.scrollTop = node.scrollHeight;
      }}"
      hook:beforeDestroy="${() => {
        while (teardown.length) teardown.pop()!();
        el = undefined;
      }}"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageScrollerContentProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageScrollerContent(props: MessageScrollerContentProps): HellaNode {
  return html`
    <div
      data-slot="message-scroller-content"
      class="${
        cn(content, props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageScrollerItemProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageScrollerItem(props: MessageScrollerItemProps): HellaNode {
  return html`
    <div
      data-slot="message-scroller-item"
      class="${
        cn(item, props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageScrollerButtonProps {
  /** Shared at-bottom state driving data-active; the default scroll action writes it back to true. */
  atBottom?: Signal<boolean>;
  scrollToBottom?: () => void;
  direction?: "start" | "end";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  onclick?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function MessageScrollerButton(props: MessageScrollerButtonProps): HellaNode {
  const direction = (): "start" | "end" => props.direction ?? "end";

  const active = (): "true" | "false" => {
    const atBottom = props.atBottom?.() ?? true;
    const isActive = direction() === "end" ? !atBottom : atBottom;
    return isActive ? "true" : "false";
  };

  const click = (event: Event): void => {
    if (props.onclick) return props.onclick();
    if (props.scrollToBottom) {
      props.scrollToBottom();
      props.atBottom?.(true);
      return;
    }
    if (!(event.target instanceof Element)) return;
    const viewport = event.target.closest('[data-slot="message-scroller"]')?.querySelector('[data-slot="message-scroller-viewport"]');
    if (viewport instanceof HTMLElement) {
      viewport.scrollTop = viewport.scrollHeight;
      props.atBottom?.(true);
    }
  };

  return html`
    <button
      type="button"
      data-slot="message-scroller-button"
      data-direction="${direction()}"
      data-variant="${props.variant ?? "secondary"}"
      data-size="${props.size ?? "icon-sm"}"
      data-active="${active}"
      class="${
        cn(
          buttonBase,
          buttonVariants[props.variant ?? "secondary"],
          buttonSizes[props.size ?? "icon-sm"],
          overlay,
          props.class,
        )
      }"
      e:click="${click}"
    >${() => props.children ?? [
      html`
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
        </svg>`,
      html`<span class="${srOnly}">${direction() === "end" ? "Scroll to end" : "Scroll to start"}</span>`,
    ] as HellaChildren}</button>
  ` as HellaNode;
}

interface MessageScrollerProps {
  children?: HellaChildren;
  atBottom?: Signal<boolean>;
  scrollToBottom?: () => void;
  threshold?: number;
  observe?: (target: Element, onGrow: () => void) => () => void;
  showScrollButton?: boolean;
  class?: string;
}

/**
 * Composed root: owns the at-bottom signal (or adopts the caller's), wraps the
 * children in a viewport + content stack, and renders the jump-to-end button
 * whose visibility the at-bottom state drives.
 */
export function MessageScroller(props: MessageScrollerProps): HellaNode {
  const atBottom = props.atBottom ?? coreSignal(true);
  return html`
    <div
      data-slot="message-scroller"
      class="${
        cn(base, props.class)
      }"
    >
      ${() => MessageScrollerViewport({
        atBottom,
        scrollToBottom: props.scrollToBottom,
        threshold: props.threshold,
        observe: props.observe,
        children: [MessageScrollerContent({ children: props.children }) as HellaChild],
      })}
      ${() => (props.showScrollButton !== false) && MessageScrollerButton({ atBottom, scrollToBottom: props.scrollToBottom })}
    </div>
  ` as HellaNode;
}
