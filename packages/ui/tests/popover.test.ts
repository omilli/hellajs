import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  popoverPartVariants,
  popoverVariants,
  renderVariant,
} from "./helpers/variants";
import {
  awaitDetached,
  awaitPortaled,
  pinRect,
  pointerDownOutside,
  pressEscape,
} from "./helpers/anchored";

beforeEach(() => {
  resetTestState();
});

/** Opens the popover by clicking the trigger and resolves the portaled content once the mount walk finished. */
async function openPopover(variant: (typeof popoverVariants)[number]) {
  const onOpenChange = mock<(open: boolean) => void>(() => {});
  const trigger = renderVariant(variant, { content: "Body", onOpenChange });
  trigger.dispatchEvent(new Event("click"));
  const content = await awaitPortaled("popover-content");
  return { onOpenChange, trigger, content };
}

describe("popover", () => {
  test.each(popoverVariants)("$format/$style opens on click with data-state and aria-expanded on the trigger", async (variant) => {
    const { trigger, content } = await openPopover(variant);
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.textContent).toBe("Body");
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(content.getAttribute("role")).toBe("dialog");
  });

  test.each(popoverVariants)("$format/$style closes on a pointerdown outside the content", async (variant) => {
    const { trigger, content } = await openPopover(variant);
    pointerDownOutside();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test.each(popoverVariants)("$format/$style closes on Escape", async (variant) => {
    const { content } = await openPopover(variant);
    pressEscape();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(popoverVariants)("$format/$style toggles closed when the trigger is clicked again", async (variant) => {
    const { trigger, content } = await openPopover(variant);
    trigger.dispatchEvent(new Event("click"));
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(popoverVariants)("$format/$style closes only the top layer of stacked popovers on Escape", async (variant) => {
    const first = await openPopover(variant);
    const second = renderVariant(variant, { content: "Top" });
    second.dispatchEvent(new Event("click"));
    const secondContent = await awaitPortaled("popover-content");
    expect(secondContent.textContent).toBe("Top");
    pressEscape();
    expect(secondContent.getAttribute("data-state")).toBe("closed");
    expect(first.content.getAttribute("data-state")).toBe("open");
    pressEscape();
    expect(first.content.getAttribute("data-state")).toBe("closed");
  });

  test.each(popoverVariants)("$format/$style positions against the injected anchor rect", async (variant) => {
    const trigger = renderVariant(variant, { content: "Body" });
    pinRect(trigger, 100, 50, 200, 20);
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("popover-content");
    expect(content.style.left).toBe("150px");
    expect(content.style.top).toBe("124px");
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.getAttribute("data-align")).toBe("center");
  });

  test.each(popoverVariants)("$format/$style reports toggles through onOpenChange", async (variant) => {
    const { onOpenChange } = await openPopover(variant);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  test.each(popoverVariants)("$format/$style moves focus to the content on open", async (variant) => {
    const { content } = await openPopover(variant);
    expect(document.activeElement).toBe(content);
    expect(content.getAttribute("tabindex")).toBe("-1");
  });

  test.each(popoverVariants)("$format/$style unmounts portal content on disposal", async (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({ content: "Body" }), container);
    const trigger = container.firstElementChild as HTMLElement;
    expect(peekState(trigger)?.isMounted).toBe(true);
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("popover-content");
    handle.unmount();
    await awaitDetached(content);
    expect(trigger.isConnected).toBe(false);
  });

  test.each(popoverVariants)("$format/$style reopens cleanly across open and close cycles", async (variant) => {
    const trigger = renderVariant(variant, { content: "Body" });
    trigger.dispatchEvent(new Event("click"));
    const first = await awaitPortaled("popover-content");
    pressEscape();
    expect(first.getAttribute("data-state")).toBe("closed");
    first.dispatchEvent(new Event("animationend"));
    await awaitDetached(first);
    trigger.dispatchEvent(new Event("click"));
    const second = await awaitPortaled("popover-content");
    expect(second).not.toBe(first);
    expect(second.getAttribute("data-state")).toBe("open");
  });

  test.each(popoverPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part positions with sideOffset and alignOffset, takes focus, and drains its wirings on disposal", (variant) => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    pinRect(anchor, 100, 50, 200, 20);
    const onDismiss = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ anchor: () => anchor, side: "top", sideOffset: 6, alignOffset: 8, onDismiss, children: [] }), container);
    const content = container.firstElementChild as HTMLElement;
    expect(content.style.left).toBe("150px");
    expect(content.style.top).toBe("94px");
    expect(content.style.translate).toBe("8px 0");
    expect(content.getAttribute("data-side")).toBe("top");
    expect(document.activeElement).toBe(content);
    pressEscape();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    handle.unmount();
    expect(content.isConnected).toBe(false);
  });

  test.each(popoverVariants)("$format/$style forwards user attrs onto the trigger root across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Body", "aria-label": "trigger" });
    expect(trigger.getAttribute("aria-label")).toBe("trigger");
  });

  test.each(popoverVariants)("$format/$style chains a user on:click with the owned toggle across all four variants", (variant) => {
    const userClick = mock(() => {});
    const onOpenChange = mock<(open: boolean) => void>(() => {});
    const trigger = renderVariant(variant, { content: "Body", onOpenChange, "on:click": userClick });
    trigger.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  test.each(popoverVariants)("$format/$style merges a user class into the trigger root's class across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Body", class: "user-class" });
    expect(classTokens(trigger).at(-1)).toBe("user-class");
  });

  test.each(popoverVariants)("$format/$style wires aria-controls to the generated content id", async (variant) => {
    const { trigger, content } = await openPopover(variant);
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
  });

  test.each(popoverPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part respects a user-supplied id", (variant) => {
    const container = setupContainer();
    mount(variant.render({ id: "custom-popover", children: [] }), container);
    expect(container.firstElementChild!.getAttribute("id")).toBe("custom-popover");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(popoverVariants, { content: "Parity" }, ["aria-controls"]);
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of popoverPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const el = container.firstElementChild!;
      if (variant.part === "Title") {
        expect(el.getAttribute("data-slot")).toBe("popover-title");
        expect(el.tagName).toBe("DIV");
      } else if (variant.part === "Description") {
        expect(el.getAttribute("data-slot")).toBe("popover-description");
        expect(el.tagName).toBe("P");
      } else if (variant.part === "Trigger") {
        expect(el.getAttribute("data-slot")).toBe("popover-trigger");
        expect(el.tagName).toBe("BUTTON");
      } else {
        expect(el.getAttribute("data-slot")).toBe(`popover-${variant.part.toLowerCase()}`);
      }
    }
  });
});
