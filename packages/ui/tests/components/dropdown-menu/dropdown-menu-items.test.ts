import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";
import { menuModulePart, type MenuRadioEntryVariant } from "../../helpers/variants-core";
import { dropdownMenuModules, dropdownMenuVariants } from "./variants";
import { Item, openMenu, type RadioGroupProps } from "./helpers";
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});

describe("dropdown-menu", () => {
  test.each(dropdownMenuVariants)(
    "$style renders destructive, inset, and shortcut item states",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Item(variant, { children: "Delete", destructive: true, shortcut: "⌫" }),
        Item(variant, { children: "Indented", inset: true }),
        Item(variant, { children: "Rename", shortcut: "⌘R" }),
      ]);
      const destructive = content.querySelector("[data-variant='destructive']")!;
      expect(destructive.getAttribute("data-slot")).toBe("dropdown-menu-item");
      expect(destructive.textContent).toContain("Delete");
      expect(destructive.querySelector("[data-slot='menu-shortcut']")!.textContent).toBe("⌫");
      const inset = content.querySelector("[data-inset]")!;
      expect(inset.textContent).toContain("Indented");
      const rename = [...content.querySelectorAll("[role='menuitem']")].find((el) =>
        el.textContent?.includes("Rename"),
      )!;
      expect(rename.querySelector("[data-slot='menu-shortcut']")!.textContent).toBe("⌘R");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style toggles checkbox items with the check icon and closes on select",
    async (variant) => {
      const onCheckedChange = vi.fn<(checked: boolean) => void>(() => {});
      const CheckboxItem = menuModulePart<{
        children?: HellaChildren;
        checked?: boolean | (() => boolean);
        onCheckedChange?: (checked: boolean) => void;
      }>(dropdownMenuModules, variant, "DropdownMenuCheckboxItem");
      const { content } = await openMenu(
        variant,
        CheckboxItem({ children: "Bold", onCheckedChange }),
      );
      const checkbox = content.querySelector("[role='menuitemcheckbox']")!;
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
      expect(checkbox.querySelector("svg")).toBeNull();
      checkbox.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onCheckedChange).toHaveBeenCalledWith(true);
      expect(checkbox.getAttribute("aria-checked")).toBe("true");
      expect(checkbox.getAttribute("data-state")).toBe("checked");
      expect(checkbox.querySelector("svg")).not.toBeNull();
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style radio groups single-select through the items table",
    async (variant) => {
      const onValueChange = vi.fn<(value: string) => void>(() => {});
      const RadioGroup = menuModulePart<{
        items?: Array<{ value: string; label?: HellaChildren }>;
        onValueChange?: (value: string) => void;
      }>(dropdownMenuModules, variant, "DropdownMenuRadioGroup");
      const { content } = await openMenu(
        variant,
        RadioGroup({
          items: [
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ],
          onValueChange,
        }),
      );
      const radios = [...content.querySelectorAll("[role='menuitemradio']")] as HTMLElement[];
      expect(radios).toHaveLength(2);
      radios[0]!.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onValueChange).toHaveBeenCalledWith("light");
      expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
      expect(radios[0]!.getAttribute("data-state")).toBe("checked");
      expect(radios[1]!.getAttribute("aria-checked")).toBe("false");
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style re-renders a signal radio items list across append, remove, and reorder",
    async (variant) => {
      const RadioGroup = menuModulePart<RadioGroupProps>(
        dropdownMenuModules,
        variant,
        "DropdownMenuRadioGroup",
      );
      const liveItems = signal<MenuRadioEntryVariant[]>([
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]);
      const { content } = await openMenu(variant, RadioGroup({ items: liveItems }));
      const values = () =>
        [...content.querySelectorAll("[role='menuitemradio']")].map((el) =>
          el.getAttribute("data-value"),
        );
      expect(values()).toEqual(["light", "dark"]);
      liveItems([...liveItems(), { value: "system", label: "System" }]);
      expect(values()).toEqual(["light", "dark", "system"]);
      liveItems(liveItems().filter((entry) => entry.value !== "dark"));
      expect(values()).toEqual(["light", "system"]);
      liveItems([liveItems()[1]!, liveItems()[0]!]);
      expect(values()).toEqual(["system", "light"]);
    },
  );

  test.each(dropdownMenuVariants)(
    "$style reuses the checked radio item's node through a reorder when keyBy is value",
    async (variant) => {
      const RadioGroup = menuModulePart<RadioGroupProps>(
        dropdownMenuModules,
        variant,
        "DropdownMenuRadioGroup",
      );
      const liveItems = signal<MenuRadioEntryVariant[]>([
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]);
      const { content } = await openMenu(
        variant,
        RadioGroup({ items: liveItems, keyBy: "value", value: () => "light" }),
      );
      const radios = () => [...content.querySelectorAll("[role='menuitemradio']")] as HTMLElement[];
      const lightBefore = radios()[0]!;
      expect(lightBefore.getAttribute("aria-checked")).toBe("true");
      liveItems([liveItems()[1]!, liveItems()[0]!]);
      expect(radios().map((el) => el.getAttribute("data-value"))).toEqual(["dark", "light"]);
      const lightAfter = radios()[1]!;
      expect(lightAfter).toBe(lightBefore);
      expect(lightAfter.getAttribute("aria-checked")).toBe("true");
      expect(lightAfter.getAttribute("data-state")).toBe("checked");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style keeps the reconciliation key out of the markup when keyBy is value",
    async (variant) => {
      const RadioGroup = menuModulePart<RadioGroupProps>(
        dropdownMenuModules,
        variant,
        "DropdownMenuRadioGroup",
      );
      const { content } = await openMenu(
        variant,
        RadioGroup({
          items: [
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ],
          keyBy: "value",
        }),
      );
      expect(content.outerHTML).not.toContain("key=");
    },
  );
});
