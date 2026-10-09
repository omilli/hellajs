import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
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

/** Builds one Item of the same flavor as the composed root under test. */
const Item = (variant: ComponentVariant<DropdownMenuVariantProps>, props: ItemProps) =>
  menuModulePart<ItemProps>(dropdownMenuModules, variant, "DropdownMenuItem")(props);

/** Builds the composed Sub of the same flavor as the composed root under test. */
const Sub = (variant: ComponentVariant<DropdownMenuVariantProps>, props: SubProps) =>
  menuModulePart<SubProps>(dropdownMenuModules, variant, "DropdownMenuSub")(props);

/** Opens the menu by clicking the trigger and resolves the portaled content once the mount walk finished. */
async function openMenu(variant: ComponentVariant<DropdownMenuVariantProps>, content?: HellaChildren) {
  const onOpenChange = mock<(open: boolean) => void>(() => {});
  const trigger = renderVariant(variant, { content: content ?? Item(variant, { children: "Open File" }), onOpenChange });
  trigger.dispatchEvent(new Event("click"));
  const contentNode = await awaitPortaled("dropdown-menu-content");
  return { onOpenChange, trigger, content: contentNode };
}

describe("dropdown-menu", () => {
  test.each(dropdownMenuVariants)("$format/$style opens on click with data-state and aria state on the trigger", async (variant) => {
    const { trigger, content } = await openMenu(variant);
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("role")).toBe("menu");
    expect(content.getAttribute("tabindex")).toBe("-1");
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
  });

  test.each(dropdownMenuVariants)("$format/$style closes on Escape and restores focus to the trigger", async (variant) => {
    const { trigger, content } = await openMenu(variant);
    pressEscape();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  test.each(dropdownMenuVariants)("$format/$style closes on a pointerdown outside the content", async (variant) => {
    const { trigger, content } = await openMenu(variant);
    pointerDownOutside();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test.each(dropdownMenuVariants)("$format/$style toggles closed when the trigger is clicked again", async (variant) => {
    const { trigger, content } = await openMenu(variant);
    trigger.dispatchEvent(new Event("click"));
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(dropdownMenuVariants)("$format/$style reports flips through onOpenChange", async (variant) => {
    const { onOpenChange } = await openMenu(variant);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  test.each(dropdownMenuVariants)("$format/$style opens with ArrowDown on the trigger and focuses the first item", async (variant) => {
    const onOpenChange = mock<(open: boolean) => void>(() => {});
    const trigger = renderVariant(variant, { content: Item(variant, { children: "One" }), onOpenChange });
    pressKey(trigger, "ArrowDown");
    const content = await awaitPortaled("dropdown-menu-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(document.activeElement).toBe(content.querySelector("[role='menuitem']"));
  });

  test.each(dropdownMenuVariants)("$format/$style roves arrows with wrap and jumps with Home/End", async (variant) => {
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
  });

  test.each(dropdownMenuVariants)("$format/$style activates items on Enter and Space", async (variant) => {
    const onclick = mock(() => {});
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

  test.each(dropdownMenuVariants)("$format/$style closes the menu when an item activates", async (variant) => {
    const { content } = await openMenu(variant, [
      Item(variant, { children: "Alpha" }),
      Item(variant, { children: "Beta" }),
    ]);
    const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
    items[0]!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(dropdownMenuVariants)("$format/$style renders destructive, inset, and shortcut item states", async (variant) => {
    const { content } = await openMenu(variant, [
      Item(variant, { children: "Delete", destructive: true, shortcut: "⌫" }),
      Item(variant, { children: "Indented", inset: true }),
      Item(variant, { children: "Rename", shortcut: "⌘R" }),
    ]);
    const destructive = content.querySelector("[data-variant='destructive']")!;
    expect(destructive.getAttribute("data-slot")).toBe("dropdown-menu-item");
    expect(destructive.textContent).toContain("Delete");
    expect(destructive.querySelector("[data-slot='dropdown-menu-shortcut']")!.textContent).toBe("⌫");
    const inset = content.querySelector("[data-inset]")!;
    expect(inset.textContent).toContain("Indented");
    const rename = [...content.querySelectorAll("[role='menuitem']")].find((el) => el.textContent?.includes("Rename"))!;
    expect(rename.querySelector("[data-slot='dropdown-menu-shortcut']")!.textContent).toBe("⌘R");
  });

  test.each(dropdownMenuVariants)("$format/$style blocks activation on disabled items", async (variant) => {
    const onclick = mock(() => {});
    const onOpenChange = mock<(open: boolean) => void>(() => {});
    const trigger = renderVariant(variant, {
      content: [Item(variant, { children: "Locked", disabled: true, "on:click": onclick }), Item(variant, { children: "Free" })],
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

  test.each(dropdownMenuVariants)("$format/$style roving and typeahead skip disabled items", async (variant) => {
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
  });

  test.each(dropdownMenuVariants)("$format/$style focuses the first matching item on typeahead", async (variant) => {
    const { content } = await openMenu(variant, [
      Item(variant, { children: "Cut" }),
      Item(variant, { children: "Select All" }),
      Item(variant, { children: "Paste" }),
    ]);
    pressKey(content, "s");
    const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
    expect(document.activeElement).toBe(items[1]!);
  });

  test.each(dropdownMenuVariants)("$format/$style toggles checkbox items with the check icon and closes on select", async (variant) => {
    const onCheckedChange = mock<(checked: boolean) => void>(() => {});
    const CheckboxItem = menuModulePart<{ children?: HellaChildren; checked?: boolean | (() => boolean); onCheckedChange?: (checked: boolean) => void }>(
      dropdownMenuModules, variant, "DropdownMenuCheckboxItem",
    );
    const { content } = await openMenu(variant, CheckboxItem({ children: "Bold", onCheckedChange }));
    const checkbox = content.querySelector("[role='menuitemcheckbox']")!;
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(checkbox.querySelector("svg")).toBeNull();
    checkbox.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(checkbox.getAttribute("data-state")).toBe("checked");
    expect(checkbox.querySelector("svg")).not.toBeNull();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(dropdownMenuVariants)("$format/$style radio groups single-select through the items table", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const RadioGroup = menuModulePart<{ items?: Array<{ value: string; label?: HellaChildren }>; onValueChange?: (value: string) => void }>(
      dropdownMenuModules, variant, "DropdownMenuRadioGroup",
    );
    const { content } = await openMenu(variant, RadioGroup({
      items: [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }],
      onValueChange,
    }));
    const radios = [...content.querySelectorAll("[role='menuitemradio']")] as HTMLElement[];
    expect(radios).toHaveLength(2);
    radios[0]!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onValueChange).toHaveBeenCalledWith("light");
    expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
    expect(radios[0]!.getAttribute("data-state")).toBe("checked");
    expect(radios[1]!.getAttribute("aria-checked")).toBe("false");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(dropdownMenuVariants)("$format/$style opens submenus on hover after the intent delay", async (variant) => {
    const { content } = await openMenu(variant, Sub(variant, {
      children: "More",
      content: Item(variant, { children: "Deep" }),
    }));
    const subTrigger = content.querySelector("[data-slot='dropdown-menu-sub-trigger']") as HTMLElement;
    pointerEnter(subTrigger);
    await delay(150);
    const subContent = await awaitPortaled("dropdown-menu-sub-content");
    expect(subContent.getAttribute("data-state")).toBe("open");
    expect(subTrigger.getAttribute("aria-expanded")).toBe("true");
  });

  test.each(dropdownMenuVariants)("$format/$style cancels the hover intent when the pointer leaves early", async (variant) => {
    const { content } = await openMenu(variant, Sub(variant, {
      children: "More",
      content: Item(variant, { children: "Deep" }),
    }));
    const subTrigger = content.querySelector("[data-slot='dropdown-menu-sub-trigger']") as HTMLElement;
    pointerEnter(subTrigger);
    pointerLeave(subTrigger);
    await delay(150);
    expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
  });

  test.each(dropdownMenuVariants)("$format/$style enters submenus with ArrowRight and returns with ArrowLeft", async (variant) => {
    const { content } = await openMenu(variant, [
      Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
      Item(variant, { children: "Plain" }),
    ]);
    const subTrigger = content.querySelector("[data-slot='dropdown-menu-sub-trigger']") as HTMLElement;
    expect(document.activeElement).toBe(subTrigger);
    pressKey(content, "ArrowRight");
    const subContent = await awaitPortaled("dropdown-menu-sub-content");
    expect(document.activeElement).toBe(subContent.querySelector("[role='menuitem']"));
    pressKey(subContent, "ArrowLeft");
    expect(subContent.getAttribute("data-state")).toBe("closed");
    expect(document.activeElement).toBe(subTrigger);
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(dropdownMenuVariants)("$format/$style pops one level per Escape while submenus are open", async (variant) => {
    const { content } = await openMenu(variant, [
      Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
    ]);
    const subTrigger = content.querySelector("[data-slot='dropdown-menu-sub-trigger']") as HTMLElement;
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("dropdown-menu-sub-content");
    pressEscape();
    expect(subContent.getAttribute("data-state")).toBe("closed");
    expect(content.getAttribute("data-state")).toBe("open");
    pressEscape();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(dropdownMenuVariants)("$format/$style closes every layer when a submenu item selects", async (variant) => {
    const { content, onOpenChange } = await openMenu(variant, [
      Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
    ]);
    const subTrigger = content.querySelector("[data-slot='dropdown-menu-sub-trigger']") as HTMLElement;
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("dropdown-menu-sub-content");
    const deep = subContent.querySelector("[role='menuitem']") as HTMLElement;
    deep.dispatchEvent(new Event("click", { bubbles: true }));
    expect(subContent.getAttribute("data-state")).toBe("closed");
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  test.each(dropdownMenuVariants)("$format/$style keeps the submenu open when the pointer re-enters the trigger or the content", async (variant) => {
    const { content } = await openMenu(variant, [
      Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
    ]);
    const subTrigger = content.querySelector("[data-slot='dropdown-menu-sub-trigger']") as HTMLElement;
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
  });

  test.each(dropdownMenuVariants)("$format/$style unmounts the sub-content through its exit animationend", async (variant) => {
    const { content } = await openMenu(variant, [
      Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
    ]);
    const subTrigger = content.querySelector("[data-slot='dropdown-menu-sub-trigger']") as HTMLElement;
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("dropdown-menu-sub-content");
    pressEscape();
    expect(subContent.getAttribute("data-state")).toBe("closed");
    subContent.dispatchEvent(new Event("animationend"));
    await awaitDetached(subContent);
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(dropdownMenuVariants)("$format/$style anchors submenu content against the sub-trigger", async (variant) => {
    const { content } = await openMenu(variant, [
      Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
    ]);
    const subTrigger = content.querySelector("[data-slot='dropdown-menu-sub-trigger']") as HTMLElement;
    pinRect(subTrigger, 100, 200, 120, 28);
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("dropdown-menu-sub-content");
    expect(subContent.style.left).toBe("320px");
    expect(subContent.style.top).toBe("100px");
    expect(subContent.getAttribute("data-side")).toBe("right");
    expect(subContent.getAttribute("data-align")).toBe("start");
  });

  test.each(dropdownMenuVariants)("$format/$style positions content against the trigger rect", async (variant) => {
    const onOpenChange = mock<(open: boolean) => void>(() => {});
    const trigger = renderVariant(variant, { content: Item(variant, { children: "One" }), onOpenChange });
    pinRect(trigger, 50, 100, 200, 20);
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("dropdown-menu-content");
    expect(content.style.left).toBe("100px");
    expect(content.style.top).toBe("74px");
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.getAttribute("data-align")).toBe("start");
  });

  test.each(dropdownMenuVariants)("$format/$style respects a controlled open accessor", async (variant) => {
    const open = signal(false);
    const onOpenChange = mock<(open: boolean) => void>(() => {});
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

  test.each(dropdownMenuVariants)("$format/$style closes under Tab", async (variant) => {
    const { content } = await openMenu(variant);
    pressKey(content, "Tab");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(dropdownMenuVariants)("$format/$style unmounts all layers on disposal", async (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({
      content: Sub(variant, { children: "More", content: Item(variant, { children: "Deep" }) }),
    }), container);
    const trigger = container.firstElementChild as HTMLElement;
    expect(peekState(trigger)?.isMounted).toBe(true);
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("dropdown-menu-content");
    const subTrigger = content.querySelector("[data-slot='dropdown-menu-sub-trigger']") as HTMLElement;
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

  test.each(dropdownMenuVariants)("$format/$style reopens cleanly across open and close cycles", async (variant) => {
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
  });

  test.each(dropdownMenuVariants)("$format/$style forwards user attrs onto the trigger root across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Inspect", "aria-label": "actions" });
    expect(trigger.getAttribute("aria-label")).toBe("actions");
  });

  test.each(dropdownMenuVariants)("$format/$style fires a user on:click handler on the trigger root across all four variants", (variant) => {
    const userClick = mock(() => {});
    const trigger = renderVariant(variant, { content: "Inspect", "on:click": userClick });
    trigger.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
  });

  test.each(dropdownMenuVariants)("$format/$style merges a user class into the trigger root's class across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Inspect", class: "user-class" });
    expect(classTokens(trigger).at(-1)).toBe("user-class");
  });

  test.each(dropdownMenuPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part respects a user-supplied id", (variant) => {
    const container = setupContainer();
    mount(variant.render({ id: "custom-menu", children: [] }), container);
    expect(container.firstElementChild!.getAttribute("id")).toBe("custom-menu");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(dropdownMenuVariants, { content: "Parity" }, ["aria-controls"]);
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of dropdownMenuPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const el = container.firstElementChild!;
      const slot = variant.part === "CheckboxItem" ? "dropdown-menu-checkbox-item"
        : variant.part === "RadioItem" ? "dropdown-menu-radio-item"
        : variant.part === "RadioGroup" ? "dropdown-menu-radio-group"
        : variant.part === "Sub" || variant.part === "SubTrigger" ? "dropdown-menu-sub-trigger"
        : variant.part === "SubContent" ? "dropdown-menu-sub-content"
        : `dropdown-menu-${variant.part.toLowerCase()}`;
      expect(el.getAttribute("data-slot")).toBe(slot);
    }
  });

  test.each(dropdownMenuPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part anchors, takes focus, and drains its wirings on disposal", (variant) => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    pinRect(anchor, 100, 50, 200, 20);
    const onDismiss = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ anchor: () => anchor, side: "right", alignOffset: 8, onDismiss, children: [] }), container);
    const content = container.firstElementChild as HTMLElement;
    expect(content.style.left).toBe("254px");
    expect(content.style.translate).toBe("0 8px");
    expect(content.getAttribute("data-side")).toBe("right");
    expect(document.activeElement).toBe(content);
    pressEscape();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    handle.unmount();
    expect(content.isConnected).toBe(false);
  });

  test.each(dropdownMenuPartVariants.filter((variant) => variant.part === "SubTrigger"))("$format/$style sub-trigger part opens through onOpen from click and hover intent", async (variant) => {
    const onOpen = mock(() => {});
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
  });
});

/** Counts activatable (non-disabled) menu items inside a rendered menu. */
function menuActiveCount(menu: Element): number {
  return menu.querySelectorAll("[role^='menuitem']:not([data-disabled])").length;
}
