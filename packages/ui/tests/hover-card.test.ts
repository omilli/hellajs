import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, resetDom } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  hoverCardPartVariants,
  hoverCardVariants,
  renderVariant,
} from "./helpers/variants";
import {
  awaitDetached,
  awaitPortaled,
  newestPortaled,
  pinRect,
  pointerDownOutside,
  pointerEnter,
  pointerLeave,
} from "./helpers/anchored";

// resetTestState resets the @hellajs/dom/bundle instance; the compiled registry
// components import the bare specifier, whose shared hoverIntent clock and layer
// stack need the bare instance's own reset.
beforeEach(() => {
  resetTestState();
  resetDom();
});

/** Mock clock for the shared skip-delay window (hoverIntent reads Date.now); captured here, restored in afterEach. */
let now: number;
let originalNow: () => number;

beforeEach(() => {
  originalNow = Date.now;
  now = originalNow();
  Date.now = () => now;
});

afterEach(() => {
  Date.now = originalNow;
});

/** Opens the hover-card by hovering the trigger (200ms upstream open delay) and resolves the portaled content. */
async function openHoverCard(variant: (typeof hoverCardVariants)[number]) {
  const trigger = renderVariant(variant, { content: "Card" });
  pointerEnter(trigger);
  await delay(260);
  return { trigger, content: await awaitPortaled("hover-card-content") };
}

describe("hover-card", () => {
  test.each(hoverCardVariants)("$format/$style opens on hover of the trigger after the open delay", async (variant) => {
    const trigger = renderVariant(variant, { content: "Card" });
    pointerEnter(trigger);
    expect(newestPortaled("hover-card-content")).toBeUndefined();
    await delay(260);
    const content = await awaitPortaled("hover-card-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.textContent).toBe("Card");
  });

  test.each(hoverCardVariants)("$format/$style stays open when the pointer moves into the content", async (variant) => {
    const { trigger, content } = await openHoverCard(variant);
    pointerLeave(trigger);
    pointerEnter(content);
    await delay(320);
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.isConnected).toBe(true);
  });

  test.each(hoverCardVariants)("$format/$style closes when the pointer leaves both trigger and content", async (variant) => {
    const { trigger, content } = await openHoverCard(variant);
    pointerLeave(trigger);
    pointerEnter(content);
    pointerLeave(content);
    await delay(30);
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(hoverCardVariants)("$format/$style returns to the trigger from the content without closing", async (variant) => {
    const { trigger, content } = await openHoverCard(variant);
    pointerLeave(trigger);
    pointerEnter(content);
    pointerLeave(content);
    pointerEnter(trigger);
    await delay(320);
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(hoverCardVariants)("$format/$style closes on an outside pointerdown while open", async (variant) => {
    const { content } = await openHoverCard(variant);
    pointerDownOutside();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(hoverCardVariants)("$format/$style opens on focus and closes on blur", async (variant) => {
    const trigger = renderVariant(variant, { content: "Card" });
    trigger.dispatchEvent(new FocusEvent("focus"));
    await delay(260);
    const content = await awaitPortaled("hover-card-content");
    expect(content.getAttribute("data-state")).toBe("open");
    trigger.dispatchEvent(new FocusEvent("blur"));
    await delay(320);
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(hoverCardVariants)("$format/$style anchors below the trigger with the upstream offset", async (variant) => {
    const trigger = renderVariant(variant, { content: "Card" });
    pinRect(trigger, 100, 50, 200, 20);
    pointerEnter(trigger);
    await delay(260);
    const content = await awaitPortaled("hover-card-content");
    expect(content.style.left).toBe("150px");
    expect(content.style.top).toBe("124px");
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.getAttribute("data-align")).toBe("center");
  });

  test.each(hoverCardVariants)("$format/$style reports opens and closes through onOpenChange", async (variant) => {
    const onOpenChange = mock<(open: boolean) => void>(() => {});
    const trigger = renderVariant(variant, { onOpenChange, content: "Card" });
    pointerEnter(trigger);
    await delay(260);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    pointerDownOutside();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test.each(hoverCardVariants)("$format/$style unmounts portal content on disposal", async (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({ content: "Card" }), container);
    const trigger = container.firstElementChild as HTMLElement;
    pointerEnter(trigger);
    await delay(260);
    const content = await awaitPortaled("hover-card-content");
    handle.unmount();
    await awaitDetached(content);
    expect(trigger.isConnected).toBe(false);
  });

  test.each(hoverCardVariants)("$format/$style keeps the content mounted under data-state closed until its animationend", async (variant) => {
    const { content } = await openHoverCard(variant);
    pointerDownOutside();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(content.isConnected).toBe(true);
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
  });

  test.each(hoverCardPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part positions against the anchor and drains its wirings on disposal", async (variant) => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    pinRect(anchor, 100, 50, 200, 20);
    const onOpen = mock(() => {});
    const onClose = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ anchor: () => anchor, side: "right", onOpen, onClose, children: [] }), container);
    const content = container.firstElementChild as HTMLElement;
    expect(content.style.left).toBe("254px");
    expect(content.style.top).toBe("110px");
    pointerEnter(content);
    await delay(10);
    expect(onOpen).toHaveBeenCalledTimes(1);
    handle.unmount();
    expect(content.isConnected).toBe(false);
  });

  test.each(hoverCardVariants)("$format/$style forwards user attrs onto the trigger root across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Card", "aria-label": "trigger" });
    expect(trigger.getAttribute("aria-label")).toBe("trigger");
  });

  test.each(hoverCardVariants)("$format/$style fires a user on:click handler on the trigger root across all four variants", (variant) => {
    const userClick = mock(() => {});
    const trigger = renderVariant(variant, { content: "Card", "on:click": userClick });
    trigger.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
  });

  test.each(hoverCardVariants)("$format/$style merges a user class into the trigger root's class across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Card", class: "user-class" });
    expect(classTokens(trigger).at(-1)).toBe("user-class");
  });

  test.each(hoverCardPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part forwards user attrs", (variant) => {
    const container = setupContainer();
    mount(variant.render({ "aria-label": "panel", children: [] }), container);
    expect(container.firstElementChild!.getAttribute("aria-label")).toBe("panel");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(hoverCardVariants, { content: "Parity" });
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of hoverCardPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const el = container.firstElementChild!;
      expect(el.getAttribute("data-slot")).toBe(`hover-card-${variant.part.toLowerCase()}`);
      expect(el.tagName).toBe(variant.part === "Trigger" ? "SPAN" : "DIV");
    }
  });
});
