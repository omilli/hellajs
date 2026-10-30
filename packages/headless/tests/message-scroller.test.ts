import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { messageScroller } from "@hellajs/headless";
import type { MessageScrollerOptions } from "@hellajs/headless";

beforeEach(() => {
  resetTestState();
});

/** Mounts a rendered node into a fresh body container and returns its root element. */
function mountPart(node: JSX.Element): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(node, container);
  return container.firstElementChild as HTMLElement;
}

/** Polls (microtask hops) until the observer-driven mount walk has wired the node's hooks. */
async function awaitWiring(viewport: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(viewport)?.isMounted) return;
    await delay();
  }
  expect(peekState(viewport)?.isMounted).toBe(true);
}

/** Overrides the viewport's scroll geometry; HappyDOM computes none of it from layout. */
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

interface MountedScroller {
  parts: ReturnType<typeof messageScroller>;
  root: HTMLElement;
  viewport: HTMLElement;
  button: HTMLElement;
}

/** Mounts Root > Viewport > Content + Button via direct part invocation and resolves the elements. */
function mountScroller(options: MessageScrollerOptions = {}): MountedScroller {
  const parts = messageScroller(options);
  const root = mountPart(
    parts.Root({
      children: [
        parts.Viewport({ children: [parts.Content({ children: ["m1"] })] }),
        parts.Button({}),
      ],
    }),
  );
  const viewport = root.querySelector<HTMLElement>("[data-slot='message-scroller-viewport']")!;
  const button = root.querySelector<HTMLElement>("[data-slot='message-scroller-button']")!;
  return { parts, root, viewport, button };
}

/** Puts the viewport 250px from the bottom (300 scrollHeight, 50 client, scrollTop 10). */
function withScrollableViewport(viewport: HTMLElement, scrollTop = 10): void {
  withGeometry(viewport, 300, 50, scrollTop);
}

describe("message-scroller", () => {
  test("derives the button state from the internal at-bottom seed", async () => {
    const scroller = mountScroller();
    await awaitWiring(scroller.viewport);
    expect(scroller.button.getAttribute("data-active")).toBe("false");
    withScrollableViewport(scroller.viewport);
    scroller.viewport.dispatchEvent(new Event("scroll"));
    expect(scroller.button.getAttribute("data-active")).toBe("true");
  });

  test("flips atBottom false when the user scrolls beyond the threshold", async () => {
    const atBottom = signal(true);
    const scroller = mountScroller({ atBottom });
    await awaitWiring(scroller.viewport);
    withScrollableViewport(scroller.viewport);
    scroller.viewport.dispatchEvent(new Event("scroll"));
    expect(atBottom()).toBe(false);
    expect(scroller.button.getAttribute("data-active")).toBe("true");
  });

  test("counts distances within the threshold as at-bottom", async () => {
    const atBottom = signal(true);
    const scroller = mountScroller({ atBottom, threshold: 100 });
    await awaitWiring(scroller.viewport);
    withGeometry(scroller.viewport, 300, 50, 190);
    scroller.viewport.dispatchEvent(new Event("scroll"));
    expect(atBottom()).toBe(true);
  });

  test("sticks to the bottom when content grows while at-bottom", async () => {
    let grow: (() => void) | undefined;
    const scroller = mountScroller({
      observe: (_target, onGrow) => {
        grow = onGrow;
        return () => undefined;
      },
    });
    await awaitWiring(scroller.viewport);
    withScrollableViewport(scroller.viewport, 0);
    grow!();
    expect(scroller.viewport.scrollTop).toBe(300);
  });

  test("preserves the scroll position when content grows off the bottom", async () => {
    let grow: (() => void) | undefined;
    const atBottom = signal(false);
    const scroller = mountScroller({
      atBottom,
      observe: (_target, onGrow) => {
        grow = onGrow;
        return () => undefined;
      },
    });
    await awaitWiring(scroller.viewport);
    withScrollableViewport(scroller.viewport);
    grow!();
    expect(scroller.viewport.scrollTop).toBe(10);
  });

  test("routes auto-stick through the scrollToBottom override", async () => {
    const override = vi.fn(() => {});
    let grow: (() => void) | undefined;
    const scroller = mountScroller({
      scrollToBottom: override,
      observe: (_target, onGrow) => {
        grow = onGrow;
        return () => undefined;
      },
    });
    await awaitWiring(scroller.viewport);
    withScrollableViewport(scroller.viewport, 0);
    grow!();
    expect(override).toHaveBeenCalledTimes(1);
  });

  test("jumps to the bottom and flips at-bottom on button click", async () => {
    const atBottom = signal(true);
    const scroller = mountScroller({ atBottom });
    await awaitWiring(scroller.viewport);
    withScrollableViewport(scroller.viewport);
    scroller.viewport.dispatchEvent(new Event("scroll"));
    expect(atBottom()).toBe(false);
    scroller.button.dispatchEvent(new Event("click"));
    expect(scroller.viewport.scrollTop).toBe(300);
    expect(atBottom()).toBe(true);
  });

  test("chains a user on:click before the owned jump", async () => {
    const atBottom = signal(false);
    const userClick = vi.fn(() => {});
    const parts = messageScroller({ atBottom });
    const root = mountPart(
      parts.Root({
        children: [parts.Viewport({ children: ["m1"] }), parts.Button({ "on:click": userClick })],
      }),
    );
    const viewport = root.querySelector<HTMLElement>("[data-slot='message-scroller-viewport']")!;
    await awaitWiring(viewport);
    withScrollableViewport(viewport);
    root
      .querySelector<HTMLElement>("[data-slot='message-scroller-button']")!
      .dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
    expect(viewport.scrollTop).toBe(300);
    expect(atBottom()).toBe(true);
  });

  test("routes the button jump through the scrollToBottom override", () => {
    const atBottom = signal(false);
    const override = vi.fn(() => {});
    const parts = messageScroller({ atBottom, scrollToBottom: override });
    const button = mountPart(parts.Button({})) as HTMLElement;
    button.dispatchEvent(new Event("click"));
    expect(override).toHaveBeenCalledTimes(1);
    expect(atBottom()).toBe(true);
  });

  test("derives start-direction activity and label from the at-bottom state", () => {
    const atBottom = signal(true);
    const parts = messageScroller({ atBottom });
    const button = mountPart(parts.Button({ direction: "start" })) as HTMLElement;
    expect(button.getAttribute("data-direction")).toBe("start");
    expect(button.getAttribute("data-active")).toBe("true");
    atBottom(false);
    expect(button.getAttribute("data-active")).toBe("false");
    expect(button.querySelector("span")!.textContent).toBe("Scroll to start");
  });

  test("renders the default arrow glyph and screen-reader label", () => {
    const parts = messageScroller();
    const button = mountPart(parts.Button({})) as HTMLElement;
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.querySelector("svg path")).not.toBeNull();
    expect(button.querySelector("span")!.textContent).toBe("Scroll to end");
  });

  test("renders slotted children and falls back to the default when the slot is empty", () => {
    const parts = messageScroller();
    const slotted = mountPart(
      parts.Root({
        children: [
          parts.Button({ children: ["Go down"] }),
          parts.Button({ children: [undefined] }),
        ],
      }),
    );
    const buttons = slotted.querySelectorAll<HTMLElement>("[data-slot='message-scroller-button']");
    expect(buttons[0]!.textContent).toBe("Go down");
    expect(buttons[1]!.querySelector("svg path")).not.toBeNull();
  });

  test("renders the content stack and item rows inside the viewport", () => {
    const parts = messageScroller();
    const root = mountPart(
      parts.Root({
        children: [
          parts.Viewport({
            children: [parts.Content({ children: [parts.Item({ children: ["m1"] })] })],
          }),
        ],
      }),
    );
    const viewport = root.querySelector("[data-slot='message-scroller-viewport']")!;
    const content = viewport.querySelector("[data-slot='message-scroller-content']")!;
    const item = content.querySelector("[data-slot='message-scroller-item']")!;
    expect(item.textContent).toBe("m1");
  });

  test("passes children through the provider untouched", () => {
    const parts = messageScroller();
    const root = mountPart(parts.Root({ children: [parts.Provider({ children: ["x"] })] }));
    expect(root.textContent).toBe("x");
  });

  test("forwards class and user attrs onto every part", () => {
    const parts = messageScroller();
    const root = mountPart(
      parts.Root({
        title: "scroller",
        class: "scroller-root",
        children: [
          parts.Viewport({ title: "view", class: "scroller-view", children: ["m1"] }),
          parts.Button({ title: "jump", class: "scroller-jump" }),
        ],
      }),
    );
    expect(root.getAttribute("title")).toBe("scroller");
    expect(root.className).toBe("scroller-root");
    const viewport = root.querySelector("[data-slot='message-scroller-viewport']")!;
    expect(viewport.getAttribute("title")).toBe("view");
    expect(viewport.className).toBe("scroller-view");
    const button = root.querySelector("[data-slot='message-scroller-button']")!;
    expect(button.getAttribute("title")).toBe("jump");
    expect(button.className).toBe("scroller-jump");
  });

  test("disposes the viewport wiring at unmount", async () => {
    const dispose = vi.fn(() => {});
    const atBottom = signal(true);
    const scroller = mountScroller({ atBottom, observe: () => dispose });
    await awaitWiring(scroller.viewport);
    scroller.root.remove();
    for (let i = 0; i < 50; i++) {
      if (peekState(scroller.viewport) === undefined) break;
      await delay();
    }
    expect(peekState(scroller.viewport)).toBeUndefined();
    expect(dispose).toHaveBeenCalledTimes(1);
    withScrollableViewport(scroller.viewport);
    scroller.viewport.dispatchEvent(new Event("scroll"));
    expect(atBottom()).toBe(true);
  });
});
