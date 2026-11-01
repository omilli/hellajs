import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { type MenuRadioEntryVariant } from "../../helpers/variants-core";
import { menubarVariants } from "./variants";
import { Item, Menu, Part, renderBar, triggers, openMenu } from "./helpers";
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});

describe("menubar", () => {
  test.each(menubarVariants)(
    "$style toggles checkbox items with the check indicator",
    async (variant) => {
      const onCheckedChange = vi.fn<(checked: boolean) => void>(() => {});
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "edit",
          content: Part(variant, "CheckboxItem")({ children: "Bold", onCheckedChange }),
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const checkbox = content.querySelector("[role='menuitemcheckbox']")!;
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
      expect(checkbox.querySelector("svg")).toBeNull();
      checkbox.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onCheckedChange).toHaveBeenCalledWith(true);
      expect(checkbox.getAttribute("aria-checked")).toBe("true");
      expect(checkbox.getAttribute("data-state")).toBe("checked");
      expect(checkbox.querySelector("svg")).not.toBeNull();
    },
  );

  test.each(menubarVariants)(
    "$style radio groups single-select through the items table",
    async (variant) => {
      const onValueChange = vi.fn<(value: string) => void>(() => {});
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "theme",
          content: Part(
            variant,
            "RadioGroup",
          )({
            items: [
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ],
            onValueChange,
          }),
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const radios = [...content.querySelectorAll("[role='menuitemradio']")] as HTMLElement[];
      expect(radios).toHaveLength(2);
      radios[0]!.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onValueChange).toHaveBeenCalledWith("light");
      expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
      expect(radios[0]!.getAttribute("data-state")).toBe("checked");
      expect(radios[1]!.getAttribute("aria-checked")).toBe("false");
    },
  );

  test.each(menubarVariants)(
    "$style re-renders a signal radio items list across appends",
    async (variant) => {
      const liveItems = signal<MenuRadioEntryVariant[]>([{ value: "light", label: "Light" }]);
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "theme",
          content: Part(variant, "RadioGroup")({ items: liveItems }),
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const values = () =>
        [...content.querySelectorAll("[role='menuitemradio']")].map((el) =>
          el.getAttribute("data-value"),
        );
      expect(values()).toEqual(["light"]);
      liveItems([...liveItems(), { value: "dark", label: "Dark" }]);
      expect(values()).toEqual(["light", "dark"]);
    },
  );

  test.each(menubarVariants)(
    "$style renders inset, destructive, and shortcut item states",
    async (variant) => {
      const bar = renderBar(variant, [
        Menu(variant, {
          value: "file",
          content: [
            Item(variant, { children: "Delete", destructive: true, shortcut: "⌫" }),
            Item(variant, { children: "Indented", inset: true }),
          ],
        }),
      ]);
      const [file] = triggers(bar);
      const content = await openMenu(file!);
      const destructive = content.querySelector("[data-variant='destructive']")!;
      expect(destructive.textContent).toContain("Delete");
      expect(destructive.querySelector("[data-slot='menu-shortcut']")!.textContent).toBe("⌫");
      expect(content.querySelector("[data-inset]")!.textContent).toContain("Indented");
    },
  );

  test.each(menubarVariants)("$style blocks activation on disabled items", async (variant) => {
    const onclick = vi.fn(() => {});
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "file",
        content: [
          Item(variant, { children: "Locked", disabled: true, "on:click": onclick }),
          Item(variant, { children: "Free" }),
        ],
      }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    const locked = content.querySelector("[data-disabled]")!;
    expect(locked.getAttribute("aria-disabled")).toBe("true");
    locked.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onclick).not.toHaveBeenCalled();
    expect(content.getAttribute("data-state")).toBe("open");
  });
});
