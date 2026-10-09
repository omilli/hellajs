import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState, resetDom } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  renderVariant,
  tooltipPartVariants,
  tooltipVariants,
} from "./helpers/variants";
import type { TooltipVariantProps } from "./helpers/variants";
import {
  awaitDetached,
  awaitPortaled,
  newestPortaled,
  pinRect,
  pointerDownOutside,
  pointerEnter,
  pointerLeave,
} from "./helpers/anchored";

/** Mock clock for the shared skip-delay window (hoverIntent reads Date.now); captured here, restored in afterEach. */
let now: number;
let originalNow: () => number;

// resetTestState resets the @hellajs/dom/bundle instance; the compiled registry
// components import the bare specifier, whose shared hoverIntent clock and layer
// stack need the bare instance's own reset.
beforeEach(() => {
  resetTestState();
  resetDom();
  originalNow = Date.now;
  now = originalNow();
  Date.now = () => now;
});

afterEach(() => {
  Date.now = originalNow;
});

/** Opens a tooltip through its trigger and resolves the portaled content once the mount walk finished. */
async function openTooltip(variant: (typeof tooltipVariants)[number], props: Partial<TooltipVariantProps> = {}) {
  const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5, ...props });
  pointerEnter(trigger);
  await delay(30);
  return { trigger, content: await awaitPortaled("tooltip-content") };
}

describe("tooltip", () => {
  test.each(tooltipVariants)("$format/$style opens after the open delay", async (variant) => {
    const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5 });
    pointerEnter(trigger);
    expect(newestPortaled("tooltip-content")).toBeUndefined();
    await delay(30);
    const content = await awaitPortaled("tooltip-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.textContent).toBe("Hi");
  });

  test.each(tooltipVariants)("$format/$style opens instantly inside the shared skip-delay window after a recent tooltip", async (variant) => {
    const first = await openTooltip(variant);
    pointerDownOutside();
    expect(first.content.getAttribute("data-state")).toBe("closed");
    const second = renderVariant(variant, { content: "Two", delayDuration: 5000 });
    now += 100;
    pointerEnter(second);
    const secondContent = await awaitPortaled("tooltip-content");
    expect(secondContent.textContent).toBe("Two");
  });

  test.each(tooltipVariants)("$format/$style delays again once the skip-delay window has passed", async (variant) => {
    await openTooltip(variant);
    pointerDownOutside();
    const second = renderVariant(variant, { content: "Two", delayDuration: 40 });
    now += 600;
    pointerEnter(second);
    await delay();
    expect(newestPortaled("tooltip-content")?.textContent).not.toBe("Two");
    await delay(80);
    expect((await awaitPortaled("tooltip-content")).textContent).toBe("Two");
  });

  test.each(tooltipVariants)("$format/$style closes after the close delay", async (variant) => {
    const { trigger, content } = await openTooltip(variant);
    pointerLeave(trigger);
    expect(content.getAttribute("data-state")).toBe("open");
    await delay(320);
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(tooltipVariants)("$format/$style wires aria-describedby to the content id", async (variant) => {
    const { trigger, content } = await openTooltip(variant);
    const describedBy = trigger.getAttribute("aria-describedby");
    expect(describedBy).toMatch(/^hella-tooltip-content-/);
    expect(content.getAttribute("id")).toBe(describedBy);
    expect(content.getAttribute("role")).toBe("tooltip");
    expect(content.getAttribute("data-slot")).toBe("tooltip-content");
  });

  test.each(tooltipVariants)("$format/$style anchors above the trigger by default", async (variant) => {
    const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5 });
    pinRect(trigger, 100, 50, 200, 20);
    pointerEnter(trigger);
    await delay(30);
    const content = await awaitPortaled("tooltip-content");
    expect(content.style.position).toBe("fixed");
    expect(content.style.left).toBe("150px");
    expect(content.style.top).toBe("100px");
    expect(content.getAttribute("data-side")).toBe("top");
    expect(content.getAttribute("data-align")).toBe("center");
  });

  test.each(tooltipVariants)("$format/$style anchors below with side bottom and start alignment", async (variant) => {
    const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5, side: "bottom", align: "start" });
    pinRect(trigger, 100, 50, 200, 20);
    pointerEnter(trigger);
    await delay(30);
    const content = await awaitPortaled("tooltip-content");
    expect(content.style.left).toBe("50px");
    expect(content.style.top).toBe("120px");
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.getAttribute("data-align")).toBe("start");
  });

  test.each(tooltipVariants)("$format/$style opens on focus", async (variant) => {
    const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5 });
    trigger.dispatchEvent(new FocusEvent("focus"));
    await delay(30);
    const content = await awaitPortaled("tooltip-content");
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(tooltipVariants)("$format/$style unmounts portal content on disposal", async (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({ content: "Hi", delayDuration: 5 }), container);
    const trigger = container.firstElementChild as HTMLElement;
    expect(peekState(trigger)?.isMounted).toBe(true);
    pointerEnter(trigger);
    await delay(30);
    const content = await awaitPortaled("tooltip-content");
    handle.unmount();
    await awaitDetached(content);
    expect(trigger.isConnected).toBe(false);
  });

  test.each(tooltipVariants)("$format/$style reopens cleanly across open and close cycles", async (variant) => {
    const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5 });
    pointerEnter(trigger);
    await delay(30);
    const first = await awaitPortaled("tooltip-content");
    pointerDownOutside();
    expect(first.getAttribute("data-state")).toBe("closed");
    first.dispatchEvent(new Event("animationend"));
    await awaitDetached(first);
    pointerEnter(trigger);
    const second = await awaitPortaled("tooltip-content");
    expect(second).not.toBe(first);
    expect(second.getAttribute("data-state")).toBe("open");
  });

  test.each(tooltipPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part positions against the anchor and drains its wirings on disposal", (variant) => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    pinRect(anchor, 100, 50, 200, 20);
    const container = setupContainer();
    const handle = mount(variant.render({ anchor: () => anchor, side: "left", children: [] }), container);
    const content = container.firstElementChild as HTMLElement;
    expect(content.style.left).toBe("50px");
    expect(content.style.top).toBe("110px");
    handle.unmount();
    expect(content.isConnected).toBe(false);
  });

  test.each(tooltipVariants)("$format/$style forwards user attrs onto the trigger root across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Hi", "aria-label": "trigger" });
    expect(trigger.getAttribute("aria-label")).toBe("trigger");
  });

  test.each(tooltipVariants)("$format/$style fires a user on:click handler on the trigger root across all four variants", (variant) => {
    const userClick = mock(() => {});
    const trigger = renderVariant(variant, { content: "Hi", "on:click": userClick });
    trigger.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
  });

  test.each(tooltipVariants)("$format/$style merges a user class into the trigger root's class across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Hi", class: "user-class" });
    expect(classTokens(trigger).at(-1)).toBe("user-class");
  });

  test.each(tooltipPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part respects a user-supplied id", (variant) => {
    const container = setupContainer();
    mount(variant.render({ id: "custom-tooltip", children: [] }), container);
    expect(container.firstElementChild!.getAttribute("id")).toBe("custom-tooltip");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(tooltipVariants, { content: "Parity" }, ["aria-describedby"]);
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of tooltipPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const el = container.firstElementChild!;
      if (variant.part === "Content") {
        expect(el.getAttribute("data-slot")).toBe("tooltip-content");
        expect(el.getAttribute("role")).toBe("tooltip");
      } else if (variant.part === "Trigger") {
        expect(el.getAttribute("data-slot")).toBe("tooltip-trigger");
        expect(el.tagName).toBe("SPAN");
      } else {
        expect(el.getAttribute("data-slot")).toBe("tooltip-provider");
        expect(el.tagName).toBe("DIV");
      }
    }
  });
});
