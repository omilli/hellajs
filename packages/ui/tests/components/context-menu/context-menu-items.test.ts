import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";
import { menuModulePart, type MenuRadioEntryVariant } from "../../helpers/variants-core";
import { contextMenuModules, contextMenuVariants } from "./variants";
import { openContextMenu } from "./helpers";
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});

describe("context-menu", () => {
  test.each(contextMenuVariants)(
    "$style toggles checkbox items with the check icon",
    async (variant) => {
      const onCheckedChange = vi.fn<(checked: boolean) => void>(() => {});
      const CheckboxItem = menuModulePart<{
        children?: HellaChildren;
        checked?: boolean | (() => boolean);
        onCheckedChange?: (checked: boolean) => void;
      }>(contextMenuModules, variant, "ContextMenuCheckboxItem");
      const { content } = await openContextMenu(
        variant,
        CheckboxItem({ children: "Snap to Grid", onCheckedChange }),
      );
      const checkbox = content.querySelector("[role='menuitemcheckbox']")!;
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
      checkbox.dispatchEvent(new Event("click", { bubbles: true }));
      flush();
      expect(onCheckedChange).toHaveBeenCalledWith(true);
      expect(checkbox.getAttribute("data-state")).toBe("checked");
      expect(checkbox.querySelector("svg")).not.toBeNull();
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(contextMenuVariants)(
    "$style radio groups single-select through the items table",
    async (variant) => {
      const onValueChange = vi.fn<(value: string) => void>(() => {});
      const RadioGroup = menuModulePart<{
        items?: Array<{ value: string; label?: HellaChildren }>;
        onValueChange?: (value: string) => void;
      }>(contextMenuModules, variant, "ContextMenuRadioGroup");
      const { content } = await openContextMenu(
        variant,
        RadioGroup({
          items: [
            { value: "small", label: "Small" },
            { value: "large", label: "Large" },
          ],
          onValueChange,
        }),
      );
      const radios = [...content.querySelectorAll("[role='menuitemradio']")] as HTMLElement[];
      radios[1]!.dispatchEvent(new Event("click", { bubbles: true }));
      flush();
      expect(onValueChange).toHaveBeenCalledWith("large");
      expect(radios[0]!.getAttribute("aria-checked")).toBe("false");
      expect(radios[1]!.getAttribute("aria-checked")).toBe("true");
    },
  );

  test.each(contextMenuVariants)(
    "$style re-renders a signal radio items list across appends",
    async (variant) => {
      const RadioGroup = menuModulePart<{
        items?: MenuRadioEntryVariant[] | (() => MenuRadioEntryVariant[]);
      }>(contextMenuModules, variant, "ContextMenuRadioGroup");
      const liveItems = signal<MenuRadioEntryVariant[]>([{ value: "small", label: "Small" }]);
      const { content } = await openContextMenu(variant, RadioGroup({ items: liveItems }));
      const values = () =>
        [...content.querySelectorAll("[role='menuitemradio']")].map((el) =>
          el.getAttribute("data-value"),
        );
      expect(values()).toEqual(["small"]);
      liveItems([...liveItems(), { value: "large", label: "Large" }]);
      flush();
      expect(values()).toEqual(["small", "large"]);
    },
  );
});
