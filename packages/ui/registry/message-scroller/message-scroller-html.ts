import { html } from "@hellajs/dom";
import { signal as coreSignal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const buttonBase: string;
declare const buttonSizes: Record<string, string>;
declare const buttonVariants: Record<string, string>;
declare const content: string;
declare const item: string;
declare const overlay: string;
declare const srOnly: string;
declare const viewport: string;
// @hella:end

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

export function MessageScrollerViewport({ atBottom, scrollToBottom, threshold, observe, children, class: cls, ...attrs }: MessageScrollerViewportProps): HellaNode {
  const fallback = coreSignal(true);
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

  return html`
    <div
      data-slot="message-scroller-viewport"
      class="${
        // @hella:compose
        [viewport, cls]
        // @hella:end
      }"
      ...${attrs}
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        el = node;
        node.addEventListener("scroll", sync, { passive: true });
        teardown.push(() => node.removeEventListener("scroll", sync));
        const inner = node.firstElementChild;
        if (inner) teardown.push((observe ?? defaultObserve)(inner, onGrow));
        if (state()()) node.scrollTop = node.scrollHeight;
      }}"
      hook:beforeDestroy="${() => {
        while (teardown.length) teardown.pop()!();
        el = undefined;
      }}"
    >${() => children}</div>
  ` as HellaNode;
}

interface MessageScrollerContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageScrollerContent({ children, class: cls, ...attrs }: MessageScrollerContentProps): HellaNode {
  return html`
    <div
      data-slot="message-scroller-content"
      class="${
        // @hella:compose
        [content, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface MessageScrollerItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageScrollerItem({ children, class: cls, ...attrs }: MessageScrollerItemProps): HellaNode {
  return html`
    <div
      data-slot="message-scroller-item"
      class="${
        // @hella:compose
        [item, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
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

export function MessageScrollerButton({ atBottom, scrollToBottom, direction: dir, variant, size, "on:click": userClick, children, class: cls, ...attrs }: MessageScrollerButtonProps): HellaNode {
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

  return html`
    <button
      type="button"
      data-slot="message-scroller-button"
      data-direction="${direction()}"
      data-variant="${variant ?? "secondary"}"
      data-size="${size ?? "icon-sm"}"
      data-active="${active}"
      class="${
        // @hella:compose
        [
          buttonBase,
          buttonVariants[variant ?? "secondary"],
          buttonSizes[size ?? "icon-sm"],
          overlay,
          cls,
        ]
        // @hella:end
      }"
      on:click="${function (this: HTMLElement, e: MouseEvent) { userClick?.call(this, e); click(e); }}"
      ...${attrs}
    >${() => children ?? [
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
export function MessageScroller({ atBottom, scrollToBottom, threshold, observe, showScrollButton, children, class: cls, ...attrs }: MessageScrollerProps): HellaNode {
  const bottom = atBottom ?? coreSignal(true);
  return html`
    <div
      data-slot="message-scroller"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >
      ${() => MessageScrollerViewport({
        atBottom: bottom,
        scrollToBottom,
        threshold,
        observe,
        children: [MessageScrollerContent({ children }) as HellaChild],
      })}
      ${() => (showScrollButton !== false) && MessageScrollerButton({ atBottom: bottom, scrollToBottom })}
    </div>
  ` as HellaNode;
}
