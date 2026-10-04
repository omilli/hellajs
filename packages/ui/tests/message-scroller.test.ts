import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { html, mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  messageScrollerPartVariants,
  messageScrollerVariants,
  renderVariant,
} from "./helpers/variants";
import type { MessageScrollerVariantProps, ScrollerObserve } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** Overrides an element's scroll geometry; HappyDOM computes none of it from layout. */
function withGeometry(el: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number): void {
  Object.defineProperty(el, "scrollHeight", { get: () => scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { get: () => clientHeight, configurable: true });
  Object.defineProperty(el, "scrollTop", { value: scrollTop, writable: true, configurable: true });
}

/**
 * Resolves once the observer-driven mount walk (and the viewport's afterMount wiring) has run.
 * Verified at execution: HappyDOM ships the ResizeObserver global but never delivers callbacks,
 * so the growth scenarios inject the observe seam; the default wiring is a real ResizeObserver.
 */
async function awaitWiring(el: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(el)?.isMounted) return;
    await delay();
  }
}

describe("message-scroller", () => {
  test.each(messageScrollerPartVariants.filter((variant) => variant.part === "Provider"))("$part $format/$style passes children through", (variant) => {
    const container = setupContainer();
    mount(html`<div>${variant.render({ children: ["x"] })}</div>`, container);
    expect(container.textContent).toBe("x");
  });

  test.each(messageScrollerPartVariants.filter((variant) => variant.part === "Content"))("$part $format/$style renders the content stack", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("message-scroller-content");
    expect(root.textContent).toBe("x");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("message-scroller-content")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("gap-8");
    }
  });

  test.each(messageScrollerPartVariants.filter((variant) => variant.part === "Item"))("$part $format/$style renders the item row", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("message-scroller-item");
    expect(root.textContent).toBe("x");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("message-scroller-item")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("[content-visibility:auto]");
    }
  });

  test.each(messageScrollerPartVariants.filter((variant) => variant.part === "Button"))("$part $format/$style renders the jump button with the arrow glyph", (variant) => {
    const root = renderVariant(variant, {});
    expect(root.tagName).toBe("BUTTON");
    expect(root.getAttribute("data-slot")).toBe("message-scroller-button");
    expect(root.getAttribute("data-direction")).toBe("end");
    expect(root.getAttribute("data-variant")).toBe("secondary");
    expect(root.getAttribute("data-size")).toBe("icon-sm");
    expect(root.getAttribute("data-active")).toBe("false");
    expect(root.querySelector("svg path")).not.toBeNull();
    expect(root.querySelector("span")!.textContent).toBe("Scroll to end");
    if (variant.style === "css") {
      const tokens = classTokens(root);
      expect(tokens.some((token) => token.startsWith("message-scroller-overlay"))).toBe(true);
      expect(tokens.some((token) => token.startsWith("message-scroller-button-secondary"))).toBe(true);
    } else {
      expect(classTokens(root)).toContain("data-[direction=end]:bottom-4");
    }
  });

  test.each(messageScrollerPartVariants.filter((variant) => variant.part === "Button"))("$part $format/$style drives data-active from the atBottom state", (variant) => {
    const atBottom = signal(true);
    const root = renderVariant(variant, { atBottom });
    expect(root.getAttribute("data-active")).toBe("false");
    atBottom(false);
    flush();
    expect(root.getAttribute("data-active")).toBe("true");
  });

  test.each(messageScrollerVariants)("$format/$style keeps atBottom true through mount", async (variant) => {
    const atBottom = signal(true);
    const root = renderVariant(variant, { atBottom, children: ["m1"] });
    await awaitWiring(root);
    expect(atBottom()).toBe(true);
  });

  test.each(messageScrollerVariants)("$format/$style flips atBottom false when the user scrolls up and back on the jump click", async (variant) => {
    const root = renderVariant(variant, { children: ["m1"] }) as HTMLElement;
    await awaitWiring(root);
    const viewport = root.querySelector('[data-slot="message-scroller-viewport"]') as HTMLElement;
    const button = root.querySelector('[data-slot="message-scroller-button"]') as HTMLElement;
    withGeometry(viewport, 300, 50, 10);
    viewport.dispatchEvent(new Event("scroll"));
    flush();
    expect(button.getAttribute("data-active")).toBe("true");
    button.dispatchEvent(new Event("click"));
    expect(viewport.scrollTop).toBe(300);
    flush();
    expect(button.getAttribute("data-active")).toBe("false");
  });

  test.each(messageScrollerVariants)("$format/$style pins the scroll position when content grows while at the bottom", async (variant) => {
    let grow: (() => void) | undefined;
    const observe: ScrollerObserve = (_target, onGrow) => {
      grow = onGrow;
      return () => undefined;
    };
    const root = renderVariant(variant, { observe, children: ["m1"] }) as HTMLElement;
    await awaitWiring(root);
    const viewport = root.querySelector('[data-slot="message-scroller-viewport"]') as HTMLElement;
    const button = root.querySelector('[data-slot="message-scroller-button"]') as HTMLElement;
    withGeometry(viewport, 300, 50, 0);
    grow!();
    expect(viewport.scrollTop).toBe(300);
    viewport.dispatchEvent(new Event("scroll"));
    flush();
    expect(button.getAttribute("data-active")).toBe("false");
  });

  test.each(messageScrollerVariants)("$format/$style leaves the scroll position alone when content grows off the bottom", async (variant) => {
    let grow: (() => void) | undefined;
    const observe: ScrollerObserve = (_target, onGrow) => {
      grow = onGrow;
      return () => undefined;
    };
    const atBottom = signal(false);
    const root = renderVariant(variant, { atBottom, observe, children: ["m1"] }) as HTMLElement;
    await awaitWiring(root);
    const viewport = root.querySelector('[data-slot="message-scroller-viewport"]') as HTMLElement;
    withGeometry(viewport, 300, 50, 10);
    grow!();
    expect(viewport.scrollTop).toBe(10);
  });

  test.each(messageScrollerVariants)("$format/$style honors a shared atBottom signal and scrollToBottom override", async (variant) => {
    const atBottom = signal(true);
    const props: MessageScrollerVariantProps = { atBottom, children: ["m1"] };
    const root = renderVariant(variant, props) as HTMLElement;
    await awaitWiring(root);
    const viewport = root.querySelector('[data-slot="message-scroller-viewport"]') as HTMLElement;
    withGeometry(viewport, 300, 50, 10);
    viewport.dispatchEvent(new Event("scroll"));
    expect(atBottom()).toBe(false);
  });

  test.each(messageScrollerVariants)("$format/$style disposes the viewport wiring on removal", async (variant) => {
    const root = renderVariant(variant, { children: ["m1"] }) as HTMLElement;
    await awaitWiring(root);
    root.remove();
    for (let i = 0; i < 50; i++) {
      if (peekState(root) === undefined) break;
      await delay();
    }
    expect(peekState(root)).toBeUndefined();
  });

  test.each(messageScrollerVariants)("$format/$style routes the button click through a scrollToBottom override", async (variant) => {
    const atBottom = signal(false);
    const override = mock(() => {});
    const root = renderVariant(variant, { atBottom, scrollToBottom: override }) as HTMLElement;
    await awaitWiring(root);
    const button = root.querySelector('[data-slot="message-scroller-button"]') as HTMLElement;
    button.dispatchEvent(new Event("click"));
    expect(override).toHaveBeenCalledTimes(1);
    expect(atBottom()).toBe(true);
    flush();
    expect(button.getAttribute("data-active")).toBe("false");
  });

  test.each(messageScrollerVariants)("$format/$style derives start-direction activity from the at-bottom state", async (variant) => {
    const atBottom = signal(true);
    const root = renderVariant(variant, { atBottom, children: ["m1"] }) as HTMLElement;
    await awaitWiring(root);
    const start = root.querySelector('[data-slot="message-scroller-button"][data-direction="start"]');
    expect(start).toBeNull();
    const button = renderVariant(messageScrollerPartVariants.find((candidate) => candidate.part === "Button")!, { atBottom, direction: "start" });
    expect(button.getAttribute("data-direction")).toBe("start");
    expect(button.getAttribute("data-active")).toBe("true");
    atBottom(false);
    flush();
    expect(button.getAttribute("data-active")).toBe("false");
    expect(button.querySelector("span")!.textContent).toBe("Scroll to start");
  });

  test.each(messageScrollerVariants)("$format/$style routes auto-stick through a scrollToBottom override", async (variant) => {
    const override = mock(() => {});
    let grow: (() => void) | undefined;
    const observe: ScrollerObserve = (_target, onGrow) => {
      grow = onGrow;
      return () => undefined;
    };
    const root = renderVariant(variant, { scrollToBottom: override, observe, children: ["m1"] }) as HTMLElement;
    await awaitWiring(root);
    const viewport = root.querySelector('[data-slot="message-scroller-viewport"]') as HTMLElement;
    withGeometry(viewport, 300, 50, 0);
    grow!();
    expect(override).toHaveBeenCalledTimes(1);
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(messageScrollerPartVariants.filter((candidate) => candidate.part === "Button"), { atBottom: () => false });
    assertStructuralParity(messageScrollerPartVariants.filter((candidate) => candidate.part === "Viewport"), { children: ["x"] });
    assertStructuralParity(messageScrollerPartVariants.filter((candidate) => candidate.part === "Item"), { children: ["x"] });
  });
});
