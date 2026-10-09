import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  contextMenuModules,
  contextMenuPartVariants,
  contextMenuVariants,
  menuModulePart,
  renderVariant,
  type ComponentVariant,
  type ContextMenuVariantProps,
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
  disabled?: boolean;
  "on:click"?: () => void;
  shortcut?: string;
}

/** Builds one Item of the same flavor as the composed root under test. */
const Item = (variant: ComponentVariant<ContextMenuVariantProps>, props: ItemProps) =>
  menuModulePart<ItemProps>(contextMenuModules, variant, "ContextMenuItem")(props);

/** Right-clicks the trigger zone and resolves the portaled content once the mount walk finished. */
async function openContextMenu(variant: ComponentVariant<ContextMenuVariantProps>, content?: HellaChildren, x = 40, y = 30) {
  const onOpenChange = mock<(open: boolean) => void>(() => {});
  const trigger = renderVariant(variant, { content: content ?? Item(variant, { children: "Inspect" }), onOpenChange });
  trigger.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
  const contentNode = await awaitPortaled("context-menu-content");
  return { onOpenChange, trigger, content: contentNode };
}

describe("context-menu", () => {
  test.each(contextMenuVariants)("$format/$style opens on contextmenu with data-state and aria state", async (variant) => {
    const { trigger, content } = await openContextMenu(variant);
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("role")).toBe("menu");
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
  });

  test.each(contextMenuVariants)("$format/$style anchors the content at the pointer coordinates", async (variant) => {
    const onOpenChange = mock<(open: boolean) => void>(() => {});
    const trigger = renderVariant(variant, { content: Item(variant, { children: "Inspect" }), onOpenChange });
    trigger.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
    // The zero-size anchor node exists synchronously after the dispatch; pinning
    // its rect before the observer-driven mount walk feeds the fixed-coords path.
    const anchor = document.querySelector("[data-slot='context-menu-anchor']")!;
    pinRect(anchor, 40, 40, 0, 0);
    const content = await awaitPortaled("context-menu-content");
    expect(content.style.left).toBe("40px");
    expect(content.style.top).toBe("40px");
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.getAttribute("data-align")).toBe("start");
  });

  test.each(contextMenuVariants)("$format/$style moves the zero-size anchor on reopen", async (variant) => {
    await openContextMenu(variant);
    const firstAnchor = document.querySelector("[data-slot='context-menu-anchor']")!;
    pressEscape();
    await awaitDetached(firstAnchor);
    await openContextMenu(variant, undefined, 10, 20);
    const secondAnchor = document.querySelector("[data-slot='context-menu-anchor']") as HTMLElement;
    expect(secondAnchor).not.toBe(firstAnchor);
    expect(secondAnchor.style.left).toBe("10px");
    expect(secondAnchor.style.top).toBe("20px");
  });

  test.each(contextMenuVariants)("$format/$style closes on Escape and restores focus to the trigger zone", async (variant) => {
    const { trigger, content } = await openContextMenu(variant);
    pressEscape();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test.each(contextMenuVariants)("$format/$style closes on a pointerdown outside the content and unmounts through its exit animationend", async (variant) => {
    const { content } = await openContextMenu(variant);
    pointerDownOutside();
    expect(content.getAttribute("data-state")).toBe("closed");
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
  });

  test.each(contextMenuVariants)("$format/$style reports flips through onOpenChange", async (variant) => {
    const { onOpenChange } = await openContextMenu(variant);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  test.each(contextMenuVariants)("$format/$style roves arrows with wrap and jumps with Home/End", async (variant) => {
    const { content } = await openContextMenu(variant, [
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

  test.each(contextMenuVariants)("$format/$style activates items with Enter and closes the menu", async (variant) => {
    const onclick = mock(() => {});
    const { content } = await openContextMenu(variant, [
      Item(variant, { children: "Rename", "on:click": onclick, shortcut: "⌘R" }),
      Item(variant, { children: "Delete", destructive: true }),
    ]);
    const destructive = content.querySelector("[data-variant='destructive']")!;
    expect(destructive.textContent).toContain("Delete");
    expect(content.querySelector("[data-slot='context-menu-shortcut']")!.textContent).toBe("⌘R");
    pressKey(content, "Enter");
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(contextMenuVariants)("$format/$style blocks activation on disabled items", async (variant) => {
    const onclick = mock(() => {});
    const { content } = await openContextMenu(variant, [
      Item(variant, { children: "Locked", disabled: true, "on:click": onclick }),
      Item(variant, { children: "Free" }),
    ]);
    const locked = content.querySelector("[data-disabled]")!;
    locked.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onclick).not.toHaveBeenCalled();
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(contextMenuVariants)("$format/$style toggles checkbox items with the check icon", async (variant) => {
    const onCheckedChange = mock<(checked: boolean) => void>(() => {});
    const CheckboxItem = menuModulePart<{ children?: HellaChildren; checked?: boolean | (() => boolean); onCheckedChange?: (checked: boolean) => void }>(
      contextMenuModules, variant, "ContextMenuCheckboxItem",
    );
    const { content } = await openContextMenu(variant, CheckboxItem({ children: "Snap to Grid", onCheckedChange }));
    const checkbox = content.querySelector("[role='menuitemcheckbox']")!;
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    checkbox.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(checkbox.getAttribute("data-state")).toBe("checked");
    expect(checkbox.querySelector("svg")).not.toBeNull();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(contextMenuVariants)("$format/$style radio groups single-select through the items table", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const RadioGroup = menuModulePart<{ items?: Array<{ value: string; label?: HellaChildren }>; onValueChange?: (value: string) => void }>(
      contextMenuModules, variant, "ContextMenuRadioGroup",
    );
    const { content } = await openContextMenu(variant, RadioGroup({
      items: [{ value: "small", label: "Small" }, { value: "large", label: "Large" }],
      onValueChange,
    }));
    const radios = [...content.querySelectorAll("[role='menuitemradio']")] as HTMLElement[];
    radios[1]!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onValueChange).toHaveBeenCalledWith("large");
    expect(radios[0]!.getAttribute("aria-checked")).toBe("false");
    expect(radios[1]!.getAttribute("aria-checked")).toBe("true");
  });

  test.each(contextMenuVariants)("$format/$style enters submenus with ArrowRight and returns with ArrowLeft", async (variant) => {
    const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(contextMenuModules, variant, "ContextMenuSub");
    const { content } = await openContextMenu(variant, [
      Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
      Item(variant, { children: "Refresh" }),
    ]);
    const subTrigger = content.querySelector("[data-slot='context-menu-sub-trigger']") as HTMLElement;
    expect(document.activeElement).toBe(subTrigger);
    pressKey(content, "ArrowRight");
    const subContent = await awaitPortaled("context-menu-sub-content");
    expect(document.activeElement).toBe(subContent.querySelector("[role='menuitem']"));
    pressKey(subContent, "ArrowLeft");
    expect(subContent.getAttribute("data-state")).toBe("closed");
    expect(document.activeElement).toBe(subTrigger);
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(contextMenuVariants)("$format/$style pops one level per Escape while submenus are open", async (variant) => {
    const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(contextMenuModules, variant, "ContextMenuSub");
    const { content } = await openContextMenu(variant, [
      Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
    ]);
    const subTrigger = content.querySelector("[data-slot='context-menu-sub-trigger']") as HTMLElement;
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("context-menu-sub-content");
    pressEscape();
    expect(subContent.getAttribute("data-state")).toBe("closed");
    expect(content.getAttribute("data-state")).toBe("open");
    subContent.dispatchEvent(new Event("animationend"));
    await awaitDetached(subContent);
    pressEscape();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(contextMenuVariants)("$format/$style opens submenus on hover after the intent delay and cancels an early leave", async (variant) => {
    const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(contextMenuModules, variant, "ContextMenuSub");
    const { content } = await openContextMenu(variant, [
      Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
    ]);
    const subTrigger = content.querySelector("[data-slot='context-menu-sub-trigger']") as HTMLElement;
    pointerEnter(subTrigger);
    pointerLeave(subTrigger);
    await delay(150);
    expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
    pointerEnter(subTrigger);
    await delay(150);
    const subContent = await awaitPortaled("context-menu-sub-content");
    expect(subContent.getAttribute("data-state")).toBe("open");
  });

  test.each(contextMenuVariants)("$format/$style keeps the submenu open when the pointer re-enters the trigger or the content", async (variant) => {
    const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(contextMenuModules, variant, "ContextMenuSub");
    const { content } = await openContextMenu(variant, [
      Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
    ]);
    const subTrigger = content.querySelector("[data-slot='context-menu-sub-trigger']") as HTMLElement;
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("context-menu-sub-content");
    pointerLeave(subTrigger);
    pointerEnter(subTrigger);
    await delay(400);
    expect(subContent.getAttribute("data-state")).toBe("open");
    pointerLeave(subTrigger);
    pointerEnter(subContent);
    await delay(400);
    expect(subContent.getAttribute("data-state")).toBe("open");
    // Leaving with no re-entry fires the grace close.
    pointerLeave(subTrigger);
    await delay(400);
    expect(subContent.getAttribute("data-state")).toBe("closed");
    expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
  });

  test.each(contextMenuVariants)("$format/$style anchors submenu content against the sub-trigger", async (variant) => {
    const Sub = menuModulePart<{ children?: HellaChildren; content?: HellaChildren }>(contextMenuModules, variant, "ContextMenuSub");
    const { content } = await openContextMenu(variant, [
      Sub({ children: "Sort By", content: Item(variant, { children: "Name" }) }),
    ]);
    const subTrigger = content.querySelector("[data-slot='context-menu-sub-trigger']") as HTMLElement;
    pinRect(subTrigger, 100, 200, 120, 28);
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("context-menu-sub-content");
    expect(subContent.style.left).toBe("320px");
    expect(subContent.style.top).toBe("100px");
    expect(subContent.getAttribute("data-side")).toBe("right");
  });

  test.each(contextMenuVariants)("$format/$style focuses the first matching item on typeahead", async (variant) => {
    const { content } = await openContextMenu(variant, [
      Item(variant, { children: "Cut" }),
      Item(variant, { children: "Copy" }),
      Item(variant, { children: "Paste" }),
    ]);
    pressKey(content, "c");
    const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
    expect(document.activeElement).toBe(items[0]!);
  });

  test.each(contextMenuVariants)("$format/$style closes under Tab", async (variant) => {
    const { content } = await openContextMenu(variant);
    pressKey(content, "Tab");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(contextMenuVariants)("$format/$style unmounts all layers on disposal", async (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({
      content: Item(variant, { children: "Inspect" }),
    }), container);
    const trigger = container.firstElementChild as HTMLElement;
    expect(peekState(trigger)?.isMounted).toBe(true);
    trigger.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
    const content = await awaitPortaled("context-menu-content");
    handle.unmount();
    await awaitDetached(content);
    expect(trigger.isConnected).toBe(false);
    // Disposed wiring: Escape and outside presses are inert on the detached tree.
    pressEscape();
    pointerDownOutside();
    expect(content.isConnected).toBe(false);
  });

  test.each(contextMenuVariants)("$format/$style forwards user attrs onto the trigger root across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Inspect", "aria-label": "zone" });
    expect(trigger.getAttribute("aria-label")).toBe("zone");
  });

  test.each(contextMenuVariants)("$format/$style fires a user on:click handler on the trigger root across all four variants", (variant) => {
    const userClick = mock(() => {});
    const trigger = renderVariant(variant, { content: "Inspect", "on:click": userClick });
    trigger.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
  });

  test.each(contextMenuVariants)("$format/$style merges a user class into the trigger root's class across all four variants", (variant) => {
    const trigger = renderVariant(variant, { content: "Inspect", class: "user-class" });
    expect(classTokens(trigger).at(-1)).toBe("user-class");
  });

  test.each(contextMenuPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part respects a user-supplied id", (variant) => {
    const container = setupContainer();
    mount(variant.render({ id: "custom-menu", children: [] }), container);
    expect(container.firstElementChild!.getAttribute("id")).toBe("custom-menu");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(contextMenuVariants, { content: "Parity" }, ["aria-controls"]);
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of contextMenuPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const el = container.firstElementChild!;
      const slot = variant.part === "CheckboxItem" ? "context-menu-checkbox-item"
        : variant.part === "RadioItem" ? "context-menu-radio-item"
        : variant.part === "RadioGroup" ? "context-menu-radio-group"
        : variant.part === "Sub" || variant.part === "SubTrigger" ? "context-menu-sub-trigger"
        : variant.part === "SubContent" ? "context-menu-sub-content"
        : `context-menu-${variant.part.toLowerCase()}`;
      expect(el.getAttribute("data-slot")).toBe(slot);
    }
  });

  test.each(contextMenuPartVariants.filter((variant) => variant.part === "SubTrigger"))("$format/$style sub-trigger part opens through onOpen from hover intent", async (variant) => {
    const onOpen = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ children: "Sort By", onOpen }), container);
    const trigger = container.firstElementChild as HTMLElement;
    pointerEnter(trigger);
    pointerLeave(trigger);
    await delay(150);
    expect(onOpen).not.toHaveBeenCalled();
    pointerEnter(trigger);
    await delay(150);
    expect(onOpen).toHaveBeenCalledTimes(1);
    handle.unmount();
  });
});
