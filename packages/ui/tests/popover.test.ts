import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  menuModulePart,
  popoverModules,
  popoverVariants,
  renderVariant,
  type ComponentVariant,
  type PopoverVariantProps,
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
  const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
  const trigger = renderVariant(variant, { content: "Body", onOpenChange });
  trigger.dispatchEvent(new Event("click"));
  const content = await awaitPortaled("popover-content");
  return { onOpenChange, trigger, content };
}

/** Builds one Header/Title/Description vocabulary part of the same flavor as the composed root under test. */
const VocabularyPart = (
  variant: ComponentVariant<PopoverVariantProps>,
  name: "Header" | "Title" | "Description",
  props: { children?: HellaChildren },
) => menuModulePart<{ children?: HellaChildren }>(popoverModules, variant, `Popover${name}`)(props);

describe("popover", () => {
  test.each(popoverVariants)(
    "$style opens on click with data-state and aria-expanded on the trigger",
    async (variant) => {
      const { trigger, content } = await openPopover(variant);
      expect(content.getAttribute("data-state")).toBe("open");
      expect(content.textContent).toBe("Body");
      expect(trigger.getAttribute("data-state")).toBe("open");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(content.getAttribute("role")).toBe("dialog");
    },
  );

  test.each(popoverVariants)(
    "$style closes on a pointerdown outside the content",
    async (variant) => {
      const { trigger, content } = await openPopover(variant);
      pointerDownOutside();
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    },
  );

  test.each(popoverVariants)("$style closes on Escape", async (variant) => {
    const { content } = await openPopover(variant);
    pressEscape();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(popoverVariants)(
    "$style toggles closed when the trigger is clicked again",
    async (variant) => {
      const { trigger, content } = await openPopover(variant);
      trigger.dispatchEvent(new Event("click"));
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(popoverVariants)(
    "$style closes only the top layer of stacked popovers on Escape",
    async (variant) => {
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
    },
  );

  test.each(popoverVariants)(
    "$style positions against the injected anchor rect",
    async (variant) => {
      const trigger = renderVariant(variant, { content: "Body" });
      pinRect(trigger, 100, 50, 200, 20);
      trigger.dispatchEvent(new Event("click"));
      const content = await awaitPortaled("popover-content");
      expect(content.style.left).toBe("150px");
      expect(content.style.top).toBe("124px");
      expect(content.getAttribute("data-side")).toBe("bottom");
      expect(content.getAttribute("data-align")).toBe("center");
    },
  );

  test.each(popoverVariants)("$style reports toggles through onOpenChange", async (variant) => {
    const { onOpenChange } = await openPopover(variant);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  test.each(popoverVariants)("$style moves focus to the content on open", async (variant) => {
    const { content } = await openPopover(variant);
    expect(document.activeElement).toBe(content);
    expect(content.getAttribute("tabindex")).toBe("-1");
  });

  test.each(popoverVariants)("$style unmounts portal content on disposal", async (variant) => {
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

  test.each(popoverVariants)(
    "$style reopens cleanly across open and close cycles",
    async (variant) => {
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
    },
  );

  test.each(popoverVariants)(
    "$style forwards user attrs onto the trigger root across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { content: "Body", "aria-label": "trigger" });
      expect(trigger.getAttribute("aria-label")).toBe("trigger");
    },
  );

  test.each(popoverVariants)(
    "$style chains a user on:click with the owned toggle across both styles",
    (variant) => {
      const userClick = vi.fn(() => {});
      const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
      const trigger = renderVariant(variant, {
        content: "Body",
        onOpenChange,
        "on:click": userClick,
      });
      trigger.dispatchEvent(new Event("click"));
      expect(userClick).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(true);
    },
  );

  test.each(popoverVariants)(
    "$style carries the base class on the trigger and the content class on the open content",
    async (variant) => {
      const { trigger, content } = await openPopover(variant);
      if (variant.style === "css") {
        expect(classTokens(trigger).some((token) => token.startsWith("popover-trigger"))).toBe(
          true,
        );
        expect(classTokens(content).some((token) => token.startsWith("popover-content"))).toBe(
          true,
        );
      } else {
        expect(classTokens(trigger)).toContain("inline-flex");
        expect(classTokens(content)).toContain("bg-popover");
      }
    },
  );

  test.each(popoverVariants)(
    "$style merges a user class into the trigger root's class across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { content: "Body", class: "user-class" });
      expect(classTokens(trigger).at(-1)).toBe("user-class");
    },
  );

  test.each(popoverVariants)(
    "$style wires aria-controls to the generated content id",
    async (variant) => {
      const { trigger, content } = await openPopover(variant);
      expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    },
  );

  test.each(popoverVariants)(
    "$style renders the header/title/description vocabulary inside the content slot",
    async (variant) => {
      const trigger = renderVariant(variant, {
        content: VocabularyPart(variant, "Header", {
          children: [
            VocabularyPart(variant, "Title", { children: "Dimensions" }),
            VocabularyPart(variant, "Description", { children: "Set the width and height." }),
          ],
        }),
      });
      trigger.dispatchEvent(new Event("click"));
      const content = await awaitPortaled("popover-content");
      const header = content.querySelector('[data-slot="popover-header"]');
      expect(header).not.toBeNull();
      expect(header!.querySelector('[data-slot="popover-title"]')?.tagName).toBe("DIV");
      expect(header!.querySelector('[data-slot="popover-description"]')?.tagName).toBe("P");
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(popoverVariants, { content: "Parity" }, ["aria-controls"]);
  });
});
