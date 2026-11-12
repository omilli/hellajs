import { describe, test, expect, beforeEach, afterEach, vi } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState, resetDom } from "@hellajs/dom";
import { resetHeadless } from "@hellajs/headless";
import { assertStructuralParity, classTokens, renderVariant } from "../../helpers/variants-core";
import { tooltipVariants } from "./variants";
import type { TooltipVariantProps } from "./variants";
import {
  awaitDetached,
  awaitPortaled,
  newestPortaled,
  pinRect,
  pointerDownOutside,
  pointerEnter,
  pointerLeave,
} from "../../helpers/anchored";

/** Mock clock for the shared skip-delay window (hoverIntent reads Date.now); captured here, restored in afterEach. */
let now: number;
let originalNow: () => number;

// resetTestState resets the harness's instances; the compiled registry
// components import the bare specifiers, so the bare dom and headless
// instances get their own resets here — headless owns the shared hoverIntent
// clock and layer stack.
beforeEach(() => {
  resetTestState();
  resetDom();
  resetHeadless();
  originalNow = Date.now;
  now = originalNow();
  Date.now = () => now;
});

afterEach(() => {
  Date.now = originalNow;
});

/** Opens a tooltip through its trigger and resolves the portaled content once the mount walk finished. */
async function openTooltip(
  variant: (typeof tooltipVariants)[number],
  props: Partial<TooltipVariantProps> = {},
) {
  const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5, ...props });
  pointerEnter(trigger);
  await delay(30);
  return { trigger, content: await awaitPortaled("tooltip-content") };
}

describe("tooltip", () => {
  test.each(tooltipVariants)("$style opens after the open delay", async (variant) => {
    const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5 });
    pointerEnter(trigger);
    flush();
    expect(newestPortaled("tooltip-content")).toBeUndefined();
    await delay(30);
    const content = await awaitPortaled("tooltip-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.textContent).toBe("Hi");
  });

  test.each(tooltipVariants)(
    "$style opens instantly inside the shared skip-delay window after a recent tooltip",
    async (variant) => {
      const first = await openTooltip(variant);
      pointerDownOutside();
      flush();
      expect(first.content.getAttribute("data-state")).toBe("closed");
      const second = renderVariant(variant, { content: "Two", delayDuration: 5000 });
      now += 100;
      pointerEnter(second);
      const secondContent = await awaitPortaled("tooltip-content", 2);
      expect(secondContent.textContent).toBe("Two");
    },
  );

  test.each(tooltipVariants)(
    "$style delays again once the skip-delay window has passed",
    async (variant) => {
      await openTooltip(variant);
      pointerDownOutside();
      const second = renderVariant(variant, { content: "Two", delayDuration: 40 });
      now += 600;
      pointerEnter(second);
      await delay();
      expect(newestPortaled("tooltip-content")?.textContent).not.toBe("Two");
      await delay(80);
      expect((await awaitPortaled("tooltip-content")).textContent).toBe("Two");
    },
  );

  test.each(tooltipVariants)("$style closes immediately on pointer leave", async (variant) => {
    const { trigger, content } = await openTooltip(variant);
    pointerLeave(trigger);
    await delay(10);
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(tooltipVariants)("$style wires aria-describedby to the content id", async (variant) => {
    const { trigger, content } = await openTooltip(variant);
    const describedBy = trigger.getAttribute("aria-describedby");
    expect(describedBy).toMatch(/^hella-tooltip-content-/);
    expect(content.getAttribute("id")).toBe(describedBy);
    expect(content.getAttribute("role")).toBe("tooltip");
    expect(content.getAttribute("data-slot")).toBe("tooltip-content");
  });

  test.each(tooltipVariants)("$style anchors above the trigger by default", async (variant) => {
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

  test.each(tooltipVariants)(
    "$style anchors below with side bottom and start alignment",
    async (variant) => {
      const trigger = renderVariant(variant, {
        content: "Hi",
        delayDuration: 5,
        side: "bottom",
        align: "start",
      });
      pinRect(trigger, 100, 50, 200, 20);
      pointerEnter(trigger);
      await delay(30);
      const content = await awaitPortaled("tooltip-content");
      expect(content.style.left).toBe("50px");
      expect(content.style.top).toBe("120px");
      expect(content.getAttribute("data-side")).toBe("bottom");
      expect(content.getAttribute("data-align")).toBe("start");
    },
  );

  test.each(tooltipVariants)("$style opens on focus", async (variant) => {
    const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5 });
    trigger.dispatchEvent(new FocusEvent("focus"));
    await delay(30);
    const content = await awaitPortaled("tooltip-content");
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(tooltipVariants)("$style unmounts portal content on disposal", async (variant) => {
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

  test.each(tooltipVariants)(
    "$style reopens cleanly across open and close cycles",
    async (variant) => {
      const trigger = renderVariant(variant, { content: "Hi", delayDuration: 5 });
      pointerEnter(trigger);
      await delay(30);
      const first = await awaitPortaled("tooltip-content");
      pointerDownOutside();
      flush();
      expect(first.getAttribute("data-state")).toBe("closed");
      first.dispatchEvent(new Event("animationend"));
      await awaitDetached(first);
      pointerEnter(trigger);
      const second = await awaitPortaled("tooltip-content");
      expect(second).not.toBe(first);
      expect(second.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(tooltipVariants)(
    "$style pins the content open when controlled open returns true",
    async (variant) => {
      renderVariant(variant, { content: "Hi", open: () => true });
      const content = await awaitPortaled("tooltip-content");
      expect(content.getAttribute("data-state")).toBe("open");
      expect(content.textContent).toBe("Hi");
    },
  );

  test.each(tooltipVariants)(
    "$style reports hover through onOpenChange without self-opening in controlled mode",
    async (variant) => {
      const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
      const trigger = renderVariant(variant, {
        content: "Hi",
        delayDuration: 5,
        open: () => false,
        onOpenChange,
      });
      pointerEnter(trigger);
      await delay(30);
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(newestPortaled("tooltip-content")).toBeUndefined();
    },
  );

  test.each(tooltipVariants)(
    "$style forwards user attrs onto the trigger root across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { content: "Hi", "aria-label": "trigger" });
      expect(trigger.getAttribute("aria-label")).toBe("trigger");
    },
  );

  test.each(tooltipVariants)(
    "$style fires a user on:click handler on the trigger root across both styles",
    (variant) => {
      const userClick = vi.fn(() => {});
      const trigger = renderVariant(variant, { content: "Hi", "on:click": userClick });
      trigger.dispatchEvent(new Event("click"));
      flush();
      expect(userClick).toHaveBeenCalledTimes(1);
    },
  );

  test.each(tooltipVariants)(
    "$style merges a user class into the trigger root's class across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { content: "Hi", class: "user-class" });
      expect(classTokens(trigger).at(-1)).toBe("user-class");
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(tooltipVariants, { content: "Parity" }, ["aria-describedby"]);
  });
});
