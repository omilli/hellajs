import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { assertStructuralParity, classTokens, renderVariant } from "../../helpers/variants-core";
import { menubarPartVariants, menubarVariants } from "./variants";
import {
  awaitDetached,
  awaitPortaled,
  pointerDownOutside,
  pressEscape,
} from "../../helpers/anchored";
import { Item, Menu, renderBar, triggers, openMenu } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("menubar", () => {
  test.each(menubarVariants)(
    "$style opens one menu and closes the first when the second trigger clicks",
    async (variant) => {
      const onValueChange = vi.fn<(value: string) => void>(() => {});
      const bar = renderBar(
        variant,
        [
          Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
          Menu(variant, { value: "edit", content: Item(variant, { children: "Copy" }) }),
        ],
        { onValueChange },
      );
      const [file, edit] = triggers(bar);
      const first = await openMenu(file!);
      expect(first.getAttribute("data-state")).toBe("open");
      expect(first.getAttribute("role")).toBe("menu");
      expect(file!.getAttribute("data-state")).toBe("open");
      expect(file!.getAttribute("aria-expanded")).toBe("true");
      expect(file!.getAttribute("aria-haspopup")).toBe("menu");
      expect(onValueChange).toHaveBeenCalledWith("file");
      flush();
      const second = await openMenu(edit!, 2);
      expect(second.getAttribute("data-state")).toBe("open");
      expect(first.getAttribute("data-state")).toBe("closed");
      expect(file!.getAttribute("aria-expanded")).toBe("false");
      expect(onValueChange).toHaveBeenLastCalledWith("edit");
    },
  );

  test.each(menubarVariants)(
    "$style closes on Escape and returns focus to its trigger",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      pressEscape();
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(file!.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(file!);
    },
  );

  test.each(menubarVariants)(
    "$style activates items and closes the whole bar menu",
    async (variant) => {
      const onclick = vi.fn(() => {});
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "file",
          content: Item(variant, { children: "Open", "on:click": onclick }),
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const item = content.querySelector("[role='menuitem']") as HTMLElement;
      item.dispatchEvent(new Event("click", { bubbles: true }));
      flush();
      expect(onclick).toHaveBeenCalledTimes(1);
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(menubarVariants)("$style dismisses on an outside pointerdown", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    pointerDownOutside();
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(menubarVariants)(
    "$style unmounts content through its exit and reopens cleanly",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
      ]);
      const [file] = triggers(bar);
      const first = await openMenu(file!);
      pressEscape();
      first.dispatchEvent(new Event("animationend"));
      await awaitDetached(first);
      const second = await openMenu(file!);
      expect(second).not.toBe(first);
      expect(second.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(menubarVariants)(
    "$style reports controlled bar value through the root accessor",
    async (variant) => {
      const onValueChange = vi.fn<(value: string) => void>(() => {});
      const bar = renderVariant(variant, {
        onValueChange,
        children: Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
      }) as HTMLElement;
      const [file] = triggers(bar);
      await openMenu(file!);
      expect(onValueChange).toHaveBeenCalledWith("file");
      pressEscape();
      flush();
      expect(onValueChange).toHaveBeenLastCalledWith("");
    },
  );

  test.each(menubarVariants)("$style drops bar and menu wiring on unmount", async (variant) => {
    const container = setupContainer();
    const handle = mount(
      variant.render({
        children: [Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) })],
      }),
      container,
    );
    const bar = container.firstElementChild as HTMLElement;
    const [file] = triggers(bar);
    await openMenu(file!);
    handle.unmount();
    flush();
    expect(bar.isConnected).toBe(false);
    // Drained coordination listeners: announcements after unmount are inert.
    document.dispatchEvent(new CustomEvent("hella:menubar-open", { detail: { id: "other" } }));
    flush();
    expect(bar.isConnected).toBe(false);
  });

  test.each(menubarVariants)(
    "$style forwards user attrs onto the bar root across both styles",
    (variant) => {
      const bar = renderVariant(variant, { "aria-label": "main" });
      expect(bar.getAttribute("aria-label")).toBe("main");
    },
  );

  test.each(menubarVariants)(
    "$style fires a user on:click handler on the bar root across both styles",
    (variant) => {
      const userClick = vi.fn(() => {});
      const bar = renderVariant(variant, { "on:click": userClick });
      bar.dispatchEvent(new Event("click"));
      flush();
      expect(userClick).toHaveBeenCalledTimes(1);
    },
  );

  test.each(menubarVariants)(
    "$style merges a user class into the bar root's class across both styles",
    (variant) => {
      const bar = renderVariant(variant, { class: "user-class" });
      expect(classTokens(bar).at(-1)).toBe("user-class");
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(menubarVariants, { children: [] });
    assertStructuralParity(
      menubarPartVariants.filter((variant) => variant.part === "RadioGroup"),
      {
        items: [
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ],
      },
    );
  });

  test("renders every named part with its data-slot across both styles", () => {
    for (const variant of menubarPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const slot =
        variant.part === "CheckboxItem"
          ? "menubar-checkbox-item"
          : variant.part === "RadioItem"
            ? "menubar-radio-item"
            : variant.part === "RadioGroup"
              ? "menubar-radio-group"
              : variant.part === "Sub"
                ? "menubar-sub-trigger"
                : `menubar-${variant.part.toLowerCase()}`;
      expect(container.firstElementChild!.getAttribute("data-slot")).toBe(slot);
    }
  });
});
