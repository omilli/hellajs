import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { assertStructuralParity, classTokens, renderVariant } from "../../helpers/variants-core";
import { dropdownMenuPartVariants, dropdownMenuVariants } from "./variants";
import {
  awaitDetached,
  awaitPortaled,
  pinRect,
  pointerDownOutside,
  pressEscape,
  pointerEnter,
  pointerLeave,
  pressKey,
} from "../../helpers/anchored";
import { Item, Sub, openMenu } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dropdown-menu", () => {
  test.each(dropdownMenuVariants)(
    "$style opens on click with data-state and aria state on the trigger",
    async (variant) => {
      const { trigger, content } = await openMenu(variant);
      expect(content.getAttribute("data-state")).toBe("open");
      expect(content.getAttribute("role")).toBe("menu");
      expect(content.getAttribute("tabindex")).toBe("-1");
      expect(trigger.getAttribute("data-state")).toBe("open");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style closes on Escape and restores focus to the trigger",
    async (variant) => {
      const { trigger, content } = await openMenu(variant);
      pressEscape();
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(trigger);
    },
  );

  test.each(dropdownMenuVariants)(
    "$style closes on a pointerdown outside the content",
    async (variant) => {
      const { trigger, content } = await openMenu(variant);
      pointerDownOutside();
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style toggles closed when the trigger is clicked again",
    async (variant) => {
      const { trigger, content } = await openMenu(variant);
      trigger.dispatchEvent(new Event("click"));
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(dropdownMenuVariants)("$style reports flips through onOpenChange", async (variant) => {
    const { onOpenChange } = await openMenu(variant);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  test.each(dropdownMenuVariants)(
    "$style closes the menu when an item activates",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Item(variant, { children: "Alpha" }),
        Item(variant, { children: "Beta" }),
      ]);
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      items[0]!.dispatchEvent(new Event("click", { bubbles: true }));
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style positions content against the trigger rect",
    async (variant) => {
      const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
      const trigger = renderVariant(variant, {
        content: Item(variant, { children: "One" }),
        onOpenChange,
      });
      pinRect(trigger, 50, 100, 200, 20);
      trigger.dispatchEvent(new Event("click"));
      const content = await awaitPortaled("dropdown-menu-content");
      expect(content.style.left).toBe("100px");
      expect(content.style.top).toBe("74px");
      expect(content.getAttribute("data-side")).toBe("bottom");
      expect(content.getAttribute("data-align")).toBe("start");
    },
  );

  test.each(dropdownMenuVariants)("$style respects a controlled open accessor", async (variant) => {
    const open = signal(false);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const trigger = renderVariant(variant, {
      open: () => open(),
      onOpenChange: (next) => {
        open(next);
        onOpenChange(next);
      },
      content: Item(variant, { children: "One" }),
    });
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("dropdown-menu-content");
    expect(open()).toBe(true);
    expect(content.getAttribute("data-state")).toBe("open");
    pressEscape();
    expect(open()).toBe(false);
    flush();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test.each(dropdownMenuVariants)("$style closes under Tab", async (variant) => {
    const { content } = await openMenu(variant);
    pressKey(content, "Tab");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(dropdownMenuVariants)("$style unmounts all layers on disposal", async (variant) => {
    const container = setupContainer();
    const handle = mount(
      variant.render({
        content: Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      }),
      container,
    );
    const trigger = container.firstElementChild as HTMLElement;
    expect(peekState(trigger)?.isMounted).toBe(true);
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("dropdown-menu-content");
    const subTrigger = content.querySelector(
      "[data-slot='dropdown-menu-sub-trigger']",
    ) as HTMLElement;
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("dropdown-menu-sub-content");
    handle.unmount();
    await awaitDetached(subContent);
    await awaitDetached(content);
    expect(trigger.isConnected).toBe(false);
    // Disposed wiring: Escape and outside presses are inert on the detached tree.
    pressEscape();
    pointerDownOutside();
    expect(content.isConnected).toBe(false);
  });

  test.each(dropdownMenuVariants)(
    "$style reopens cleanly across open and close cycles",
    async (variant) => {
      const trigger = renderVariant(variant, { content: Item(variant, { children: "One" }) });
      trigger.dispatchEvent(new Event("click"));
      const first = await awaitPortaled("dropdown-menu-content");
      pressEscape();
      flush();
      expect(first.getAttribute("data-state")).toBe("closed");
      first.dispatchEvent(new Event("animationend"));
      await awaitDetached(first);
      trigger.dispatchEvent(new Event("click"));
      const second = await awaitPortaled("dropdown-menu-content");
      expect(second).not.toBe(first);
      expect(second.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style forwards user attrs onto the trigger root across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { content: "Inspect", "aria-label": "actions" });
      expect(trigger.getAttribute("aria-label")).toBe("actions");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style merges a user class into the trigger root's class across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { content: "Inspect", class: "user-class" });
      expect(classTokens(trigger).at(-1)).toBe("user-class");
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(dropdownMenuVariants, { content: "Parity" }, ["aria-controls"]);
    assertStructuralParity(
      dropdownMenuPartVariants.filter((variant) => variant.part === "RadioGroup"),
      {
        items: [
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ],
      },
    );
  });

  test("renders every named part with its data-slot across both styles", async () => {
    for (const variant of dropdownMenuPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const slot =
        variant.part === "CheckboxItem"
          ? "dropdown-menu-checkbox-item"
          : variant.part === "RadioItem"
            ? "dropdown-menu-radio-item"
            : variant.part === "RadioGroup"
              ? "dropdown-menu-radio-group"
              : variant.part === "Sub"
                ? "dropdown-menu-sub-trigger"
                : `dropdown-menu-${variant.part.toLowerCase()}`;
      expect(container.firstElementChild!.getAttribute("data-slot")).toBe(slot);
    }
  });
});
