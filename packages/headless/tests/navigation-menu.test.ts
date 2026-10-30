import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { navigationMenu } from "@hellajs/headless";

beforeEach(() => {
  resetTestState();
});

/** Pins a rect on the element - the injectable seam the indicator's measurement assertions read through. */
function pinRect(el: Element, top: number, left: number, width: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** Polls (microtask hops) until the newest portaled content finished its observer-driven mount walk. */
async function openContent(): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const nodes = document.querySelectorAll("[data-slot='navigation-menu-content']");
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && peekState(node)?.isMounted) return node;
    await delay();
  }
  throw new Error("portaled navigation-menu content never mounted");
}

/** Polls (microtask hops) until the node detaches from the document. */
async function awaitDetached(node: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!node.isConnected) return;
    await delay();
  }
  expect(node.isConnected).toBe(false);
}

/** Polls (microtask hops) until the observer-driven mount walk has wired the node's hooks. */
async function awaitWiring(root: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(root)?.isMounted) return;
    await delay();
  }
  expect(peekState(root)?.isMounted).toBe(true);
}

interface NavFixture {
  root: HTMLElement;
  viewport: HTMLElement;
  learnTrigger: HTMLElement;
  referenceTrigger: HTMLElement;
  clickTrigger: (trigger: HTMLElement) => Promise<HTMLElement>;
}

/** Mounts a coordinated two-item bar (one factory instance, no manual wiring) and returns its handles. */
function mountNav(
  parts: ReturnType<typeof navigationMenu>,
  options?: { viewport?: boolean },
): NavFixture {
  const container = document.createElement("div");
  document.body.append(container);
  mount(
    parts.Root({
      children: [
        parts.List({
          children: [
            parts.Item({
              children: [
                parts.Trigger({ value: "learn", children: "Learn" }),
                parts.Content({ value: "learn", children: "Learn body" }),
              ],
            }),
            parts.Item({
              children: [
                parts.Trigger({ value: "reference", children: "Reference" }),
                parts.Content({ value: "reference", children: "Reference body" }),
              ],
            }),
          ],
        }),
        parts.Indicator({}),
      ],
      ...(options ? { viewport: options.viewport } : {}),
    }),
    container,
  );
  const root = container.firstElementChild as HTMLElement;
  const learnTrigger = root.querySelector("[data-value='learn']") as HTMLElement;
  const referenceTrigger = root.querySelector("[data-value='reference']") as HTMLElement;
  const clickTrigger = async (trigger: HTMLElement): Promise<HTMLElement> => {
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    return openContent();
  };
  return {
    root,
    viewport: root.querySelector("[data-slot='navigation-menu-viewport']") as HTMLElement,
    learnTrigger,
    referenceTrigger,
    clickTrigger,
  };
}

describe("navigationMenu", () => {
  test("a trigger click announces its value and opens the content in the appended viewport", async () => {
    const parts = navigationMenu();
    const nav = mountNav(parts);
    await awaitWiring(nav.root);
    expect(nav.viewport).not.toBeNull();
    expect(nav.viewport.getAttribute("data-state")).toBe("closed");
    expect(nav.learnTrigger.getAttribute("data-state")).toBe("closed");
    expect(nav.learnTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(nav.learnTrigger.querySelector("[data-slot='navigation-menu-chevron']")).not.toBeNull();
    const content = await nav.clickTrigger(nav.learnTrigger);
    expect(nav.viewport.contains(content)).toBe(true);
    expect(content.textContent).toBe("Learn body");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(nav.viewport.getAttribute("data-state")).toBe("open");
    expect(nav.learnTrigger.getAttribute("data-state")).toBe("open");
    expect(nav.learnTrigger.getAttribute("aria-expanded")).toBe("true");
  });

  test("moving between items swaps the viewport content, one panel open at a time", async () => {
    const parts = navigationMenu();
    const nav = mountNav(parts);
    await awaitWiring(nav.root);
    const first = await nav.clickTrigger(nav.learnTrigger);
    const second = await nav.clickTrigger(nav.referenceTrigger);
    expect(nav.viewport.contains(second)).toBe(true);
    expect(second.textContent).toBe("Reference body");
    expect(first.getAttribute("data-state")).toBe("closed");
    expect(second.getAttribute("data-state")).toBe("open");
    expect(nav.learnTrigger.getAttribute("data-state")).toBe("closed");
    expect(nav.referenceTrigger.getAttribute("data-state")).toBe("open");
  });

  test("a second click on the open trigger closes the bar", async () => {
    const parts = navigationMenu();
    const nav = mountNav(parts);
    await awaitWiring(nav.root);
    await nav.clickTrigger(nav.learnTrigger);
    nav.learnTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(nav.learnTrigger.getAttribute("data-state")).toBe("closed");
    expect(nav.viewport.getAttribute("data-state")).toBe("closed");
  });

  test("the exit keeps the panel mounted under data-state=closed until its animationend", async () => {
    const onExited = vi.fn(() => {});
    const parts = navigationMenu();
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.Root({
        children: [
          parts.Item({
            children: [
              parts.Trigger({ value: "learn", children: "Learn" }),
              parts.Content({ value: "learn", onExited, children: "Learn body" }),
            ],
          }),
        ],
      }),
      container,
    );
    await awaitWiring(container.firstElementChild as HTMLElement);
    const trigger = container.querySelector("[data-value='learn']") as HTMLElement;
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    const content = await openContent();
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(content.isConnected).toBe(true);
    expect(onExited).not.toHaveBeenCalled();
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  test("the exit unmounts through the fallback budget when no animationend fires", async () => {
    const parts = navigationMenu();
    const nav = mountNav(parts);
    await awaitWiring(nav.root);
    const content = await nav.clickTrigger(nav.learnTrigger);
    nav.learnTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(content.getAttribute("data-state")).toBe("closed");
    await delay(300);
    expect(content.isConnected).toBe(false);
  });

  test("a reopen mid-exit dismisses the fallback and keeps the panel mounted", async () => {
    const parts = navigationMenu();
    const nav = mountNav(parts);
    await awaitWiring(nav.root);
    const content = await nav.clickTrigger(nav.learnTrigger);
    nav.learnTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(content.getAttribute("data-state")).toBe("closed");
    nav.learnTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.isConnected).toBe(true);
    await delay(300);
    expect(content.isConnected).toBe(true);
  });

  test("the indicator tracks the announced trigger, re-measures on resize, and hides on close", async () => {
    const parts = navigationMenu();
    const nav = mountNav(parts);
    await awaitWiring(nav.root);
    const indicator = nav.root.querySelector(
      "[data-slot='navigation-menu-indicator']",
    ) as HTMLElement;
    expect(indicator.getAttribute("data-state")).toBe("hidden");
    pinRect(nav.root, 0, 0, 400, 40);
    pinRect(nav.learnTrigger, 0, 40, 120, 40);
    pinRect(nav.referenceTrigger, 0, 150, 80, 40);
    await nav.clickTrigger(nav.learnTrigger);
    expect(indicator.getAttribute("data-state")).toBe("visible");
    expect(indicator.style.width).toBe("120px");
    expect(indicator.style.transform).toBe("translateX(40px)");
    pinRect(nav.learnTrigger, 0, 60, 120, 40);
    window.dispatchEvent(new Event("resize"));
    expect(indicator.style.transform).toBe("translateX(60px)");
    await nav.clickTrigger(nav.referenceTrigger);
    expect(indicator.style.width).toBe("80px");
    expect(indicator.style.transform).toBe("translateX(150px)");
    nav.referenceTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(indicator.getAttribute("data-state")).toBe("hidden");
  });

  test("an anchor override points the indicator at the resolved element", async () => {
    const parts = navigationMenu();
    const anchor = document.createElement("button");
    anchor.setAttribute("data-slot", "navigation-menu-trigger");
    anchor.setAttribute("data-value", "manual");
    document.body.append(anchor);
    pinRect(anchor, 0, 200, 70, 40);
    const container = document.createElement("div");
    document.body.append(container);
    const bar = document.createElement("div");
    bar.setAttribute("data-slot", "navigation-menu");
    container.append(bar);
    pinRect(bar, 0, 0, 400, 40);
    mount(parts.Indicator({ anchor: () => anchor }), bar);
    const indicator = bar.querySelector("[data-slot='navigation-menu-indicator']") as HTMLElement;
    await awaitWiring(indicator);
    expect(indicator.getAttribute("data-state")).toBe("hidden");
    document.dispatchEvent(
      new CustomEvent("hella:navigation-menu-activate", { detail: { id: "manual", open: true } }),
    );
    expect(indicator.getAttribute("data-state")).toBe("visible");
    expect(indicator.style.width).toBe("70px");
    expect(indicator.style.transform).toBe("translateX(200px)");
  });

  test("a controlled value accessor reports without writing; the controller's write reflects", async () => {
    const value = signal("");
    const onValueChange = vi.fn((next: string) => value(next));
    const parts = navigationMenu({ value: () => value(), onValueChange });
    const nav = mountNav(parts);
    await awaitWiring(nav.root);
    await nav.clickTrigger(nav.learnTrigger);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["learn"]);
    expect(value()).toBe("learn");
    expect(nav.learnTrigger.getAttribute("data-state")).toBe("open");
    value("");
    expect(nav.learnTrigger.getAttribute("data-state")).toBe("closed");
    expect(nav.viewport.getAttribute("data-state")).toBe("closed");
  });

  test("a fresh store starts closed with no seed option on the surface", async () => {
    const parts = navigationMenu();
    const nav = mountNav(parts);
    await awaitWiring(nav.root);
    expect(nav.viewport.getAttribute("data-state")).toBe("closed");
    expect(document.querySelectorAll("[data-slot='navigation-menu-content']").length).toBe(0);
  });

  test("viewport=false drops the appended slot; a selector prop targets a manual one", async () => {
    const parts = navigationMenu({ viewport: false });
    const container = document.createElement("div");
    document.body.append(container);
    const slot = document.createElement("div");
    slot.setAttribute("data-slot", "navigation-menu-viewport");
    slot.id = "manual-viewport";
    document.body.append(slot);
    mount(
      parts.Root({
        viewport: false,
        children: parts.Item({
          children: [
            parts.Trigger({ value: "learn", children: "Learn" }),
            parts.Content({ value: "learn", viewport: "#manual-viewport", children: "Learn body" }),
          ],
        }),
      }),
      container,
    );
    await awaitWiring(container.firstElementChild as HTMLElement);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-viewport")).toBe("false");
    expect(root.querySelector("[data-slot='navigation-menu-viewport']")).toBeNull();
    const trigger = root.querySelector("[data-value='learn']") as HTMLElement;
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    const content = await openContent();
    expect(slot.contains(content)).toBe(true);
    slot.remove();
  });

  test("the active and onActivate overrides compose against external state", () => {
    const parts = navigationMenu();
    const onActivate = vi.fn(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.Trigger({ value: "learn", active: () => true, onActivate, children: "Learn" }),
      container,
    );
    const trigger = container.firstElementChild as HTMLElement;
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  test("a link renders data-active and forwards its attributes", () => {
    const parts = navigationMenu();
    const container = document.createElement("div");
    document.body.append(container);
    mount(parts.Link({ href: "#docs", active: true, children: "Docs" }), container);
    const link = container.querySelector("[data-slot='navigation-menu-link']") as HTMLElement;
    expect(link.getAttribute("data-active")).toBe("true");
    expect(link.getAttribute("href")).toBe("#docs");
    const inactive = parts.Link({ href: "#api", children: "API" });
    const scratch = document.createElement("div");
    mount(inactive, scratch);
    expect(
      scratch.querySelector("[data-slot='navigation-menu-link']")!.hasAttribute("data-active"),
    ).toBe(false);
  });

  test("list and item render their slots and forward attributes", () => {
    const parts = navigationMenu();
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.List({ "aria-label": "site", children: parts.Item({ children: "row" }) }),
      container,
    );
    const list = container.firstElementChild as HTMLElement;
    expect(list.getAttribute("data-slot")).toBe("navigation-menu-list");
    expect(list.getAttribute("aria-label")).toBe("site");
    expect(list.tagName).toBe("UL");
    const item = list.firstElementChild as HTMLElement;
    expect(item.getAttribute("data-slot")).toBe("navigation-menu-item");
    expect(item.tagName).toBe("LI");
  });

  test("user attrs and a user on:click chain onto the trigger and the bar root", () => {
    const parts = navigationMenu();
    const userClick = vi.fn(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.Root({
        "aria-label": "site",
        children: parts.Trigger({ value: "learn", "on:click": userClick, children: "Learn" }),
      }),
      container,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-label")).toBe("site");
    const trigger = root.querySelector("[data-value='learn']") as HTMLElement;
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(userClick).toHaveBeenCalledTimes(1);
    root.dispatchEvent(new Event("click"));
  });

  test("viewport re-emits a user id onto the slot and tracks its active override", () => {
    const parts = navigationMenu();
    const container = document.createElement("div");
    document.body.append(container);
    mount(parts.Viewport({ id: "custom-viewport", active: () => true }), container);
    const wrapper = container.firstElementChild as HTMLElement;
    const slot = wrapper.querySelector("[data-slot='navigation-menu-viewport']") as HTMLElement;
    expect(slot.getAttribute("id")).toBe("custom-viewport");
    expect(slot.getAttribute("data-state")).toBe("open");
  });

  test("unmounting the root drops its announcement listener", async () => {
    const onValueChange = vi.fn(() => {});
    const parts = navigationMenu({ onValueChange });
    const container = document.createElement("div");
    document.body.append(container);
    const handle = mount(parts.Root({ children: parts.Item({ children: "row" }) }), container);
    const root = container.firstElementChild as HTMLElement;
    await awaitWiring(root);
    handle.unmount();
    document.dispatchEvent(
      new CustomEvent("hella:navigation-menu-activate", { detail: { id: "learn", open: true } }),
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("unmounting the indicator drops its announcement and resize wiring", async () => {
    const parts = navigationMenu();
    const container = document.createElement("div");
    document.body.append(container);
    const handle = mount(parts.Indicator({}), container);
    const indicator = container.firstElementChild as HTMLElement;
    await awaitWiring(indicator);
    handle.unmount();
    expect(container.contains(indicator)).toBe(false);
    expect(() => {
      window.dispatchEvent(new Event("resize"));
      document.dispatchEvent(
        new CustomEvent("hella:navigation-menu-activate", { detail: { id: "learn", open: true } }),
      );
    }).not.toThrow();
  });
});
