import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import "@hellajs/dom/features/routed-props";
import { mount, peekState } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  dropdownMenuModules,
  dropdownMenuPartVariants,
  dropdownMenuVariants,
  menuModulePart,
  renderVariant,
  type ComponentVariant,
  type DropdownMenuVariantProps,
  type MenuRadioEntryVariant,
} from "./helpers/variants";
import {
  awaitDetached,
  awaitPortaled,
  pinRect,
  pointerDownOutside,
  pressEscape,
  pointerEnter,
  pointerLeave,
  pressKey,
} from "./helpers/anchored";

beforeEach(() => {
  resetTestState();
});

/** Local prop bag for building content-tree items through menuModulePart (mirrors the part props). */
interface ItemProps {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  disabled?: boolean;
  "on:click"?: () => void;
  shortcut?: string;
  class?: string;
}

interface SubProps {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

/** Local prop bag for the RadioGroup under test (mirrors the emitted RadioGroupProps). */
interface RadioGroupProps {
  items?: MenuRadioEntryVariant[] | (() => MenuRadioEntryVariant[]);
  keyBy?: "value";
  value?: () => string;
  onValueChange?: (value: string) => void;
}

/** Builds one Item of the same flavor as the composed root under test. */
const Item = (variant: ComponentVariant<DropdownMenuVariantProps>, props: ItemProps) =>
  menuModulePart<ItemProps>(dropdownMenuModules, variant, "DropdownMenuItem")(props);

/** Builds the composed Sub of the same flavor as the composed root under test. */
const Sub = (variant: ComponentVariant<DropdownMenuVariantProps>, props: SubProps) =>
  menuModulePart<SubProps>(dropdownMenuModules, variant, "DropdownMenuSub")(props);

/** Opens the menu by clicking the trigger and resolves the portaled content once the mount walk finished. */
async function openMenu(
  variant: ComponentVariant<DropdownMenuVariantProps>,
  content?: HellaChildren,
) {
  const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
  const trigger = renderVariant(variant, {
    content: content ?? Item(variant, { children: "Open File" }),
    onOpenChange,
  });
  trigger.dispatchEvent(new Event("click"));
  const contentNode = await awaitPortaled("dropdown-menu-content");
  return { onOpenChange, trigger, content: contentNode };
}

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
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style toggles closed when the trigger is clicked again",
    async (variant) => {
      const { trigger, content } = await openMenu(variant);
      trigger.dispatchEvent(new Event("click"));
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(dropdownMenuVariants)("$style reports flips through onOpenChange", async (variant) => {
    const { onOpenChange } = await openMenu(variant);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  test.each(dropdownMenuVariants)(
    "$style opens with ArrowDown on the trigger and focuses the first item",
    async (variant) => {
      const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
      const trigger = renderVariant(variant, {
        content: Item(variant, { children: "One" }),
        onOpenChange,
      });
      pressKey(trigger, "ArrowDown");
      const content = await awaitPortaled("dropdown-menu-content");
      expect(content.getAttribute("data-state")).toBe("open");
      expect(document.activeElement).toBe(content.querySelector("[role='menuitem']"));
    },
  );

  test.each(dropdownMenuVariants)(
    "$style roves arrows with wrap and jumps with Home/End",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Item(variant, { children: "Alpha" }),
        Item(variant, { children: "Beta" }),
        Item(variant, { children: "Gamma" }),
      ]);
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(document.activeElement).toBe(items[0]!);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(items[1]!);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(items[2]!);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(items[0]!);
      pressKey(content, "ArrowUp");
      expect(document.activeElement).toBe(items[2]!);
      pressKey(content, "Home");
      expect(document.activeElement).toBe(items[0]!);
      pressKey(content, "End");
      expect(document.activeElement).toBe(items[2]!);
    },
  );

  test.each(dropdownMenuVariants)("$style activates items on Enter and Space", async (variant) => {
    const onclick = vi.fn(() => {});
    const { content } = await openMenu(variant, [
      Item(variant, { children: "Alpha", "on:click": onclick }),
      Item(variant, { children: "Beta" }),
    ]);
    pressKey(content, "Enter");
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(content.getAttribute("data-state")).toBe("closed");
    const second = await openMenu(variant, [
      Item(variant, { children: "Alpha" }),
      Item(variant, { children: "Beta", "on:click": onclick }),
    ]);
    const items = [...second.content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
    items[1]!.focus();
    pressKey(second.content, " ");
    expect(onclick).toHaveBeenCalledTimes(2);
    expect(second.content.getAttribute("data-state")).toBe("closed");
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
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

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
      expect(destructive.querySelector("[data-slot='dropdown-menu-shortcut']")!.textContent).toBe(
        "⌫",
      );
      const inset = content.querySelector("[data-inset]")!;
      expect(inset.textContent).toContain("Indented");
      const rename = [...content.querySelectorAll("[role='menuitem']")].find((el) =>
        el.textContent?.includes("Rename"),
      )!;
      expect(rename.querySelector("[data-slot='dropdown-menu-shortcut']")!.textContent).toBe("⌘R");
    },
  );

  test.each(dropdownMenuVariants)("$style blocks activation on disabled items", async (variant) => {
    const onclick = vi.fn(() => {});
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const trigger = renderVariant(variant, {
      content: [
        Item(variant, { children: "Locked", disabled: true, "on:click": onclick }),
        Item(variant, { children: "Free" }),
      ],
      onOpenChange,
    });
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("dropdown-menu-content");
    const locked = content.querySelector("[data-disabled]")!;
    expect(locked.getAttribute("aria-disabled")).toBe("true");
    locked.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onclick).not.toHaveBeenCalled();
    expect(content.getAttribute("data-state")).toBe("open");
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  test.each(dropdownMenuVariants)(
    "$style roving and typeahead skip disabled items",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Item(variant, { children: "Alpha" }),
        Item(variant, { children: "Hidden", disabled: true }),
        Item(variant, { children: "Beta" }),
      ]);
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(items).toHaveLength(3);
      expect(menuActiveCount(content)).toBe(2);
      pressKey(content, "ArrowDown");
      expect(document.activeElement).toBe(items[2]!);
    },
  );

  test.each(dropdownMenuVariants)(
    "$style focuses the first matching item on typeahead",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Item(variant, { children: "Cut" }),
        Item(variant, { children: "Select All" }),
        Item(variant, { children: "Paste" }),
      ]);
      pressKey(content, "s");
      const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
      expect(document.activeElement).toBe(items[1]!);
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

  test.each(dropdownMenuVariants)(
    "$style opens submenus on hover after the intent delay",
    async (variant) => {
      const { content } = await openMenu(
        variant,
        Sub(variant, {
          children: "More",
          content: Item(variant, { children: "Deep" }),
        }),
      );
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      pointerEnter(subTrigger);
      await delay(150);
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      expect(subContent.getAttribute("data-state")).toBe("open");
      expect(subTrigger.getAttribute("aria-expanded")).toBe("true");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style cancels the hover intent when the pointer leaves early",
    async (variant) => {
      const { content } = await openMenu(
        variant,
        Sub(variant, {
          children: "More",
          content: Item(variant, { children: "Deep" }),
        }),
      );
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      pointerEnter(subTrigger);
      pointerLeave(subTrigger);
      await delay(150);
      expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style enters submenus with ArrowRight and returns with ArrowLeft",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
        Item(variant, { children: "Plain" }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      expect(document.activeElement).toBe(subTrigger);
      pressKey(content, "ArrowRight");
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      expect(document.activeElement).toBe(subContent.querySelector("[role='menuitem']"));
      pressKey(subContent, "ArrowLeft");
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(document.activeElement).toBe(subTrigger);
      expect(content.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style pops one level per Escape while submenus are open",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      pressEscape();
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(content.getAttribute("data-state")).toBe("open");
      pressEscape();
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style closes every layer when a submenu item selects",
    async (variant) => {
      const { content, onOpenChange } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      const deep = subContent.querySelector("[role='menuitem']") as HTMLElement;
      deep.dispatchEvent(new Event("click", { bubbles: true }));
      expect(subContent.getAttribute("data-state")).toBe("closed");
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    },
  );

  test.each(dropdownMenuVariants)(
    "$style keeps the submenu open when the pointer re-enters the trigger or the content",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      // Leaving arms the close; re-entering the trigger cancels it.
      pointerLeave(subTrigger);
      pointerEnter(subTrigger);
      await delay(400);
      expect(subContent.getAttribute("data-state")).toBe("open");
      // Leaving arms the close again; entering the sub-content cancels it.
      pointerLeave(subTrigger);
      pointerEnter(subContent);
      await delay(400);
      expect(subContent.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style unmounts the sub-content through its exit animationend",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      pressEscape();
      expect(subContent.getAttribute("data-state")).toBe("closed");
      subContent.dispatchEvent(new Event("animationend"));
      await awaitDetached(subContent);
      expect(content.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(dropdownMenuVariants)(
    "$style anchors submenu content against the sub-trigger",
    async (variant) => {
      const { content } = await openMenu(variant, [
        Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      ]);
      const subTrigger = content.querySelector(
        "[data-slot='dropdown-menu-sub-trigger']",
      ) as HTMLElement;
      pinRect(subTrigger, 100, 200, 120, 28);
      subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
      const subContent = await awaitPortaled("dropdown-menu-sub-content");
      expect(subContent.style.left).toBe("320px");
      expect(subContent.style.top).toBe("100px");
      expect(subContent.getAttribute("data-side")).toBe("right");
      expect(subContent.getAttribute("data-align")).toBe("start");
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
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test.each(dropdownMenuVariants)("$style closes under Tab", async (variant) => {
    const { content } = await openMenu(variant);
    pressKey(content, "Tab");
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
    "$style fires a user on:click handler on the trigger root across both styles",
    (variant) => {
      const userClick = vi.fn(() => {});
      const trigger = renderVariant(variant, { content: "Inspect", "on:click": userClick });
      trigger.dispatchEvent(new Event("click"));
      expect(userClick).toHaveBeenCalledTimes(1);
    },
  );

  test.each(dropdownMenuVariants)(
    "$style merges a user class into the trigger root's class across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { content: "Inspect", class: "user-class" });
      expect(classTokens(trigger).at(-1)).toBe("user-class");
    },
  );

  test.each(dropdownMenuPartVariants.filter((variant) => variant.part === "Content"))(
    "$style content part respects a user-supplied id",
    (variant) => {
      const container = setupContainer();
      mount(variant.render({ id: "custom-menu", children: [] }), container);
      expect(container.firstElementChild!.getAttribute("id")).toBe("custom-menu");
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

  test("renders every named part with its data-slot across both styles", () => {
    for (const variant of dropdownMenuPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const el = container.firstElementChild!;
      const slot =
        variant.part === "CheckboxItem"
          ? "dropdown-menu-checkbox-item"
          : variant.part === "RadioItem"
            ? "dropdown-menu-radio-item"
            : variant.part === "RadioGroup"
              ? "dropdown-menu-radio-group"
              : variant.part === "Sub" || variant.part === "SubTrigger"
                ? "dropdown-menu-sub-trigger"
                : variant.part === "SubContent"
                  ? "dropdown-menu-sub-content"
                  : `dropdown-menu-${variant.part.toLowerCase()}`;
      expect(el.getAttribute("data-slot")).toBe(slot);
    }
  });

  test.each(dropdownMenuPartVariants.filter((variant) => variant.part === "Content"))(
    "$style content part anchors, takes focus, and drains its wirings on disposal",
    (variant) => {
      const anchor = document.createElement("button");
      document.body.appendChild(anchor);
      pinRect(anchor, 100, 50, 200, 20);
      const onDismiss = vi.fn(() => {});
      const container = setupContainer();
      const handle = mount(
        variant.render({
          anchor: () => anchor,
          side: "right",
          alignOffset: 8,
          onDismiss,
          children: [],
        }),
        container,
      );
      const content = container.firstElementChild as HTMLElement;
      expect(content.style.left).toBe("254px");
      expect(content.style.translate).toBe("0 8px");
      expect(content.getAttribute("data-side")).toBe("right");
      expect(document.activeElement).toBe(content);
      pressEscape();
      expect(onDismiss).toHaveBeenCalledTimes(1);
      handle.unmount();
      expect(content.isConnected).toBe(false);
    },
  );

  test.each(dropdownMenuPartVariants.filter((variant) => variant.part === "SubTrigger"))(
    "$style sub-trigger part opens through onOpen from click and hover intent",
    async (variant) => {
      const onOpen = vi.fn(() => {});
      const container = setupContainer();
      const handle = mount(variant.render({ children: "More", onOpen }), container);
      const trigger = container.firstElementChild as HTMLElement;
      trigger.dispatchEvent(new Event("click", { bubbles: true }));
      expect(onOpen).toHaveBeenCalledTimes(1);
      // Leaving before the intent delay fires cancels the pending open.
      pointerEnter(trigger);
      pointerLeave(trigger);
      await delay(150);
      expect(onOpen).toHaveBeenCalledTimes(1);
      pointerEnter(trigger);
      await delay(150);
      expect(onOpen).toHaveBeenCalledTimes(2);
      pointerLeave(trigger);
      handle.unmount();
    },
  );
});

/** Counts activatable (non-disabled) menu items inside a rendered menu. */
function menuActiveCount(menu: Element): number {
  return menu.querySelectorAll("[role^='menuitem']:not([data-disabled])").length;
}
