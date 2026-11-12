import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { assertStructuralParity, classTokens, renderVariant } from "../../helpers/variants-core";
import { contextMenuPartVariants, contextMenuVariants } from "./variants";
import {
  awaitDetached,
  awaitPortaled,
  pinRect,
  pointerDownOutside,
  pressEscape,
} from "../../helpers/anchored";
import { Item, openContextMenu } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("context-menu", () => {
  test.each(contextMenuVariants)(
    "$style opens on contextmenu with data-state and aria state",
    async (variant) => {
      const { trigger, content } = await openContextMenu(variant);
      expect(content.getAttribute("data-state")).toBe("open");
      expect(content.getAttribute("role")).toBe("menu");
      expect(trigger.getAttribute("data-state")).toBe("open");
      expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    },
  );

  test.each(contextMenuVariants)(
    "$style anchors the content at the pointer coordinates",
    async (variant) => {
      const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
      const trigger = renderVariant(variant, {
        content: Item(variant, { children: "Inspect" }),
        onOpenChange,
      });
      trigger.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 40,
          clientY: 40,
        }),
      );
      // The zero-size anchor node exists synchronously after the dispatch; pinning
      // its rect before the observer-driven mount walk feeds the fixed-coords path.
      const anchor = document.querySelector("[data-slot='menu-anchor']")!;
      pinRect(anchor, 40, 40, 0, 0);
      const content = await awaitPortaled("context-menu-content");
      expect(content.style.left).toBe("40px");
      expect(content.style.top).toBe("40px");
      expect(content.getAttribute("data-side")).toBe("bottom");
      expect(content.getAttribute("data-align")).toBe("start");
    },
  );

  test.each(contextMenuVariants)("$style moves the zero-size anchor on reopen", async (variant) => {
    await openContextMenu(variant);
    const firstAnchor = document.querySelector("[data-slot='menu-anchor']")!;
    pressEscape();
    await awaitDetached(firstAnchor);
    await openContextMenu(variant, undefined, 10, 20);
    const secondAnchor = document.querySelector("[data-slot='menu-anchor']") as HTMLElement;
    expect(secondAnchor).not.toBe(firstAnchor);
    expect(secondAnchor.style.left).toBe("10px");
    expect(secondAnchor.style.top).toBe("20px");
  });

  test.each(contextMenuVariants)(
    "$style closes on Escape and restores focus to the trigger zone",
    async (variant) => {
      const { trigger, content } = await openContextMenu(variant);
      pressEscape();
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(trigger.getAttribute("aria-expanded")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    },
  );

  test.each(contextMenuVariants)(
    "$style closes on a pointerdown outside the content and unmounts through its exit animationend",
    async (variant) => {
      const { content } = await openContextMenu(variant);
      pointerDownOutside();
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
      content.dispatchEvent(new Event("animationend"));
      await awaitDetached(content);
    },
  );

  test.each(contextMenuVariants)("$style reports flips through onOpenChange", async (variant) => {
    const { onOpenChange } = await openContextMenu(variant);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  test.each(contextMenuVariants)("$style unmounts all layers on disposal", async (variant) => {
    const container = setupContainer();
    const handle = mount(
      variant.render({
        content: Item(variant, { children: "Inspect" }),
      }),
      container,
    );
    const trigger = container.firstElementChild as HTMLElement;
    expect(peekState(trigger)?.isMounted).toBe(true);
    trigger.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }),
    );
    const content = await awaitPortaled("context-menu-content");
    handle.unmount();
    await awaitDetached(content);
    expect(trigger.isConnected).toBe(false);
    // Disposed wiring: Escape and outside presses are inert on the detached tree.
    pressEscape();
    pointerDownOutside();
    expect(content.isConnected).toBe(false);
  });

  test.each(contextMenuVariants)(
    "$style forwards user attrs onto the trigger root across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { content: "Inspect", "aria-label": "zone" });
      expect(trigger.getAttribute("aria-label")).toBe("zone");
    },
  );

  test.each(contextMenuVariants)(
    "$style fires a user on:click handler on the trigger root across both styles",
    (variant) => {
      const userClick = vi.fn(() => {});
      const trigger = renderVariant(variant, { content: "Inspect", "on:click": userClick });
      trigger.dispatchEvent(new Event("click"));
      flush();
      expect(userClick).toHaveBeenCalledTimes(1);
    },
  );

  test.each(contextMenuVariants)(
    "$style merges a user class into the trigger root's class across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { content: "Inspect", class: "user-class" });
      expect(classTokens(trigger).at(-1)).toBe("user-class");
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(contextMenuVariants, { content: "Parity" }, ["aria-controls"]);
    assertStructuralParity(
      contextMenuPartVariants.filter((variant) => variant.part === "RadioGroup"),
      {
        items: [
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ],
      },
    );
  });

  test("renders every named part with its data-slot across both styles", async () => {
    for (const variant of contextMenuPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const slot =
        variant.part === "CheckboxItem"
          ? "context-menu-checkbox-item"
          : variant.part === "RadioItem"
            ? "context-menu-radio-item"
            : variant.part === "RadioGroup"
              ? "context-menu-radio-group"
              : variant.part === "Sub"
                ? "context-menu-sub-trigger"
                : `context-menu-${variant.part.toLowerCase()}`;
      expect(container.firstElementChild!.getAttribute("data-slot")).toBe(slot);
    }
  });
});
