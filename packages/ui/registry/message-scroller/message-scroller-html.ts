import { html } from "@hellajs/dom";
import { signal as coreSignal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

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
        // @hella:compose
        [viewport, props.class]
        // @hella:end
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
        // @hella:compose
        [content, props.class]
        // @hella:end
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
        // @hella:compose
        [item, props.class]
        // @hella:end
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
        // @hella:compose
        [
          buttonBase,
          buttonVariants[props.variant ?? "secondary"],
          buttonSizes[props.size ?? "icon-sm"],
          overlay,
          props.class,
        ]
        // @hella:end
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
        // @hella:compose
        [base, props.class]
        // @hella:end
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
