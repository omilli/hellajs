import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { peekState } from "@hellajs/dom";
import {
  assertAttrForwarded,
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
function withGeometry(
  el: HTMLElement,
  scrollHeight: number,
  clientHeight: number,
  scrollTop: number,
): void {
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
  test.each(messageScrollerPartVariants.filter((variant) => variant.part === "Item"))(
    "$part $style renders the item row",
    (variant) => {
      const root = renderVariant(variant, { children: ["x"] });
      expect(root.getAttribute("data-slot")).toBe("message-scroller-item");
      expect(root.textContent).toBe("x");
      if (variant.style === "css") {
        expect(classTokens(root)[0]!.startsWith("message-scroller-item")).toBe(true);
      } else {
        expect(classTokens(root)).toContain("[content-visibility:auto]");
      }
    },
  );

  test.each(messageScrollerVariants)(
    "$style keeps atBottom true through mount",
    async (variant) => {
      const atBottom = signal(true);
      const root = renderVariant(variant, { atBottom, children: ["m1"] });
      await awaitWiring(root);
      expect(atBottom()).toBe(true);
    },
  );

  test.each(messageScrollerVariants)(
    "$style flips atBottom false when the user scrolls up and back on the jump click",
    async (variant) => {
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
    },
  );

  test.each(messageScrollerVariants)(
    "$style pins the scroll position when content grows while at the bottom",
    async (variant) => {
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
    },
  );

  test.each(messageScrollerVariants)(
    "$style leaves the scroll position alone when content grows off the bottom",
    async (variant) => {
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
    },
  );

  test.each(messageScrollerVariants)(
    "$style honors a shared atBottom signal and scrollToBottom override",
    async (variant) => {
      const atBottom = signal(true);
      const props: MessageScrollerVariantProps = { atBottom, children: ["m1"] };
      const root = renderVariant(variant, props) as HTMLElement;
      await awaitWiring(root);
      const viewport = root.querySelector('[data-slot="message-scroller-viewport"]') as HTMLElement;
      withGeometry(viewport, 300, 50, 10);
      viewport.dispatchEvent(new Event("scroll"));
      expect(atBottom()).toBe(false);
    },
  );

  test.each(messageScrollerVariants)(
    "$style disposes the viewport wiring on removal",
    async (variant) => {
      const root = renderVariant(variant, { children: ["m1"] }) as HTMLElement;
      await awaitWiring(root);
      root.remove();
      for (let i = 0; i < 50; i++) {
        if (peekState(root) === undefined) break;
        await delay();
      }
      expect(peekState(root)).toBeUndefined();
    },
  );

  test.each(messageScrollerVariants)(
    "$style routes the button click through a scrollToBottom override",
    async (variant) => {
      const atBottom = signal(false);
      const override = vi.fn(() => {});
      const root = renderVariant(variant, { atBottom, scrollToBottom: override }) as HTMLElement;
      await awaitWiring(root);
      const button = root.querySelector('[data-slot="message-scroller-button"]') as HTMLElement;
      button.dispatchEvent(new Event("click"));
      expect(override).toHaveBeenCalledTimes(1);
      expect(atBottom()).toBe(true);
      flush();
      expect(button.getAttribute("data-active")).toBe("false");
    },
  );

  test.each(messageScrollerVariants)(
    "$style renders no start-direction button",
    async (variant) => {
      const atBottom = signal(true);
      const root = renderVariant(variant, { atBottom, children: ["m1"] }) as HTMLElement;
      await awaitWiring(root);
      const start = root.querySelector(
        '[data-slot="message-scroller-button"][data-direction="start"]',
      );
      expect(start).toBeNull();
    },
  );

  test.each(messageScrollerVariants)(
    "$style routes auto-stick through a scrollToBottom override",
    async (variant) => {
      const override = vi.fn(() => {});
      let grow: (() => void) | undefined;
      const observe: ScrollerObserve = (_target, onGrow) => {
        grow = onGrow;
        return () => undefined;
      };
      const root = renderVariant(variant, {
        scrollToBottom: override,
        observe,
        children: ["m1"],
      }) as HTMLElement;
      await awaitWiring(root);
      const viewport = root.querySelector('[data-slot="message-scroller-viewport"]') as HTMLElement;
      withGeometry(viewport, 300, 50, 0);
      grow!();
      expect(override).toHaveBeenCalledTimes(1);
    },
  );

  test("forwards user attrs onto the root across both styles", () => {
    assertAttrForwarded(messageScrollerVariants, { title: "Hella" }, "title", "Hella");
  });

  test("merges the user class last on the root across both styles", () => {
    for (const variant of messageScrollerVariants) {
      const root = renderVariant(variant, { class: "my-scroller", children: ["m1"] });
      expect(classTokens(root).at(-1)).toBe("my-scroller");
    }
  });

  test("both styles agree on tag and attributes", () => {
    assertStructuralParity(
      messageScrollerPartVariants.filter((candidate) => candidate.part === "Item"),
      { children: ["x"] },
    );
  });
});
