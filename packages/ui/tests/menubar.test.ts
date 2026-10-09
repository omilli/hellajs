import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  menuModulePart,
  menubarModules,
  menubarPartVariants,
  menubarVariants,
  renderVariant,
  type ComponentVariant,
  type MenubarVariantProps,
} from "./helpers/variants";
import {
  awaitDetached,
  awaitPortaled,
  pointerDownOutside,
  pointerEnter,
  pointerLeave,
  pressEscape,
  pressKey,
} from "./helpers/anchored";
import { delay } from "@utils/test-helpers.js";

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

interface MenuProps {
  value?: string;
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

/** Builds one Item of the same flavor as the composed bar under test. */
const Item = (variant: ComponentVariant<MenubarVariantProps>, props: ItemProps) =>
  menuModulePart<ItemProps>(menubarModules, variant, "MenubarItem")(props);

/** Builds the composed Sub of the same flavor as the composed bar under test. */
const Sub = (variant: ComponentVariant<MenubarVariantProps>, props: SubProps) =>
  menuModulePart<SubProps>(menubarModules, variant, "MenubarSub")(props);

/** Builds the composed Menu wrapper of the same flavor as the bar under test. */
const Menu = (variant: ComponentVariant<MenubarVariantProps>, props: MenuProps) =>
  menuModulePart<MenuProps>(menubarModules, variant, "MenubarMenu")(props);

/** Resolves any compiled Menubar part by full export name at the variant's flavor. */
const Part = (variant: ComponentVariant<MenubarVariantProps>, name: string) =>
  menuModulePart<Record<string, unknown>>(menubarModules, variant, `Menubar${name}`);

/** Renders a bar with the given menus and returns the bar element. */
function renderBar(variant: ComponentVariant<MenubarVariantProps>, menus: HellaChildren, props: Partial<MenubarVariantProps> = {}) {
  return renderVariant(variant, { children: menus, ...props }) as HTMLElement;
}

/** The bar's triggers in DOM order. */
function triggers(bar: Element): HTMLElement[] {
  return [...bar.querySelectorAll("[data-slot='menubar-trigger']")] as HTMLElement[];
}

/** Opens the menu at the given trigger by clicking it and resolves the portaled content. */
async function openMenu(trigger: HTMLElement) {
  trigger.dispatchEvent(new Event("click", { bubbles: true }));
  return awaitPortaled("menubar-content");
}

describe("menubar", () => {
  test.each(menubarVariants)("$format/$style opens one menu and closes the first when the second trigger clicks", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
      Menu(variant, { value: "edit", content: Item(variant, { children: "Copy" }) }),
    ], { onValueChange });
    const [file, edit] = triggers(bar);
    const first = await openMenu(file!);
    expect(first.getAttribute("data-state")).toBe("open");
    expect(first.getAttribute("role")).toBe("menu");
    expect(file!.getAttribute("data-state")).toBe("open");
    expect(file!.getAttribute("aria-expanded")).toBe("true");
    expect(file!.getAttribute("aria-haspopup")).toBe("menu");
    expect(onValueChange).toHaveBeenCalledWith("file");
    const second = await openMenu(edit!);
    expect(second.getAttribute("data-state")).toBe("open");
    expect(first.getAttribute("data-state")).toBe("closed");
    expect(file!.getAttribute("aria-expanded")).toBe("false");
    expect(onValueChange).toHaveBeenLastCalledWith("edit");
  });

  test.each(menubarVariants)("$format/$style moves focus between triggers with left/right arrows", (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
      Menu(variant, { value: "edit", content: Item(variant, { children: "Copy" }) }),
      Menu(variant, { value: "view", content: Item(variant, { children: "Zoom" }) }),
    ]);
    const [file, edit, view] = triggers(bar);
    file!.focus();
    pressKey(bar, "ArrowRight");
    expect(document.activeElement).toBe(edit!);
    pressKey(bar, "ArrowRight");
    expect(document.activeElement).toBe(view!);
    pressKey(bar, "ArrowRight");
    expect(document.activeElement).toBe(file!);
    pressKey(bar, "ArrowLeft");
    expect(document.activeElement).toBe(view!);
  });

  test.each(menubarVariants)("$format/$style switches menus with left/right arrows while one is open", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
      Menu(variant, { value: "edit", content: Item(variant, { children: "Copy" }) }),
    ]);
    const [file, edit] = triggers(bar);
    const first = await openMenu(file!);
    expect(document.activeElement).toBe(first.querySelector("[role='menuitem']"));
    pressKey(first, "ArrowRight");
    const second = await awaitPortaled("menubar-content");
    const contents = [...document.querySelectorAll("[data-slot='menubar-content']")];
    expect(contents).toHaveLength(2);
    expect(second.getAttribute("data-state")).toBe("open");
    expect(first.getAttribute("data-state")).toBe("closed");
    expect(file!.getAttribute("aria-expanded")).toBe("false");
    expect(edit!.getAttribute("aria-expanded")).toBe("true");
    pressKey(second, "ArrowLeft");
    const reopened = await new Promise<HTMLElement>((resolve) => {
      const poll = (): void => {
        const node = [...document.querySelectorAll("[data-slot='menubar-content']")]
          .find((el) => el.getAttribute("data-state") === "open" && el.textContent?.includes("Open"));
        if (node) resolve(node as HTMLElement);
        else setTimeout(poll);
      };
      poll();
    });
    expect(reopened.textContent).toContain("Open");
    expect(file!.getAttribute("aria-expanded")).toBe("true");
  });

  test.each(menubarVariants)("$format/$style closes on Escape and returns focus to its trigger", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    pressEscape();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(file!.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(file!);
  });

  test.each(menubarVariants)("$format/$style opens with ArrowDown on the trigger", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
    ]);
    const [file] = triggers(bar);
    pressKey(file!, "ArrowDown");
    const content = await awaitPortaled("menubar-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(document.activeElement).toBe(content.querySelector("[role='menuitem']"));
  });

  test.each(menubarVariants)("$format/$style activates items and closes the whole bar menu", async (variant) => {
    const onclick = mock(() => {});
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open", "on:click": onclick }) }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    const item = content.querySelector("[role='menuitem']") as HTMLElement;
    item.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(menubarVariants)("$format/$style toggles checkbox items with the check indicator", async (variant) => {
    const onCheckedChange = mock<(checked: boolean) => void>(() => {});
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "format",
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
  });

  test.each(menubarVariants)("$format/$style opens submenus on click and pops them with Escape", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "file",
        content: Sub(variant, { children: "Export", content: Item(variant, { children: "PDF" }) }),
      }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("menubar-sub-content");
    expect(subContent.getAttribute("data-state")).toBe("open");
    expect(document.activeElement).toBe(subContent.querySelector("[role='menuitem']"));
    pressEscape();
    expect(subContent.getAttribute("data-state")).toBe("closed");
    expect(content.getAttribute("data-state")).toBe("open");
    pressEscape();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(document.activeElement).toBe(file!);
  });

  test.each(menubarVariants)("$format/$style dismisses on an outside pointerdown", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    pointerDownOutside();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(menubarVariants)("$format/$style unmounts content through its exit and reopens cleanly", async (variant) => {
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
  });

  test.each(menubarVariants)("$format/$style reports controlled bar value through the root accessor", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const bar = renderVariant(variant, {
      onValueChange,
      children: Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
    }) as HTMLElement;
    const [file] = triggers(bar);
    await openMenu(file!);
    expect(onValueChange).toHaveBeenCalledWith("file");
    pressEscape();
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  test.each(menubarVariants)("$format/$style focuses the first matching item on typeahead", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "file",
        content: [Item(variant, { children: "Cut" }), Item(variant, { children: "Open" })],
      }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    pressKey(content, "o");
    const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
    expect(document.activeElement).toBe(items[1]!);
  });

  test.each(menubarVariants)("$format/$style radio groups single-select through the items table", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "theme",
        content: Part(variant, "RadioGroup")({
          items: [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }],
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
  });

  test.each(menubarVariants)("$format/$style enters submenus with ArrowRight and returns with ArrowLeft", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "file",
        content: [
          Sub(variant, { children: "Export", content: Item(variant, { children: "PDF" }) }),
          Item(variant, { children: "Close" }),
        ],
      }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
    expect(document.activeElement).toBe(subTrigger);
    pressKey(content, "ArrowRight");
    const subContent = await awaitPortaled("menubar-sub-content");
    expect(document.activeElement).toBe(subContent.querySelector("[role='menuitem']"));
    pressKey(subContent, "ArrowLeft");
    expect(subContent.getAttribute("data-state")).toBe("closed");
    expect(document.activeElement).toBe(subTrigger);
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(menubarVariants)("$format/$style closes under Tab", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    pressKey(content, "Tab");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(menubarVariants)("$format/$style renders inset, destructive, and shortcut item states", async (variant) => {
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
    expect(destructive.querySelector("[data-slot='menubar-shortcut']")!.textContent).toBe("⌫");
    expect(content.querySelector("[data-inset]")!.textContent).toContain("Indented");
  });

  test.each(menubarVariants)("$format/$style blocks activation on disabled items", async (variant) => {
    const onclick = mock(() => {});
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "file",
        content: [Item(variant, { children: "Locked", disabled: true, "on:click": onclick }), Item(variant, { children: "Free" })],
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

  test.each(menubarVariants)("$format/$style roves the content items with wrap and jumps with Home/End", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "file",
        content: [Item(variant, { children: "Alpha" }), Item(variant, { children: "Beta" }), Item(variant, { children: "Gamma" })],
      }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    const items = [...content.querySelectorAll("[role='menuitem']")] as HTMLElement[];
    expect(document.activeElement).toBe(items[0]!);
    pressKey(content, "ArrowDown");
    expect(document.activeElement).toBe(items[1]!);
    pressKey(content, "ArrowUp");
    expect(document.activeElement).toBe(items[0]!);
    pressKey(content, "ArrowUp");
    expect(document.activeElement).toBe(items[2]!);
    pressKey(content, "Home");
    expect(document.activeElement).toBe(items[0]!);
    pressKey(content, "End");
    expect(document.activeElement).toBe(items[2]!);
    pressKey(content, " ");
  });

  test.each(menubarVariants)("$format/$style sub content roves, activates, and closes under Tab", async (variant) => {
    const onclick = mock(() => {});
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "file",
        content: Sub(variant, {
          children: "Export",
          content: [Item(variant, { children: "PDF", "on:click": onclick }), Item(variant, { children: "HTML" })],
        }),
      }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("menubar-sub-content");
    const items = [...subContent.querySelectorAll("[role='menuitem']")] as HTMLElement[];
    expect(document.activeElement).toBe(items[0]!);
    pressKey(subContent, "ArrowDown");
    expect(document.activeElement).toBe(items[1]!);
    pressKey(subContent, "ArrowUp");
    expect(document.activeElement).toBe(items[0]!);
    pressKey(subContent, "Enter");
    expect(onclick).toHaveBeenCalledTimes(1);
    // Close-on-select: activating a sub item closes every open layer.
    expect(subContent.getAttribute("data-state")).toBe("closed");
    expect(content.getAttribute("data-state")).toBe("closed");
    const [fileAgain] = triggers(bar);
    fileAgain!.dispatchEvent(new Event("click", { bubbles: true }));
    const reopenedContent = await awaitPortaled("menubar-content");
    const subTriggerAgain = reopenedContent.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
    subTriggerAgain.dispatchEvent(new Event("click", { bubbles: true }));
    const reopened = await awaitPortaled("menubar-sub-content");
    pressKey(reopened, "Tab");
    expect(reopened.getAttribute("data-state")).toBe("closed");
    expect(reopenedContent.getAttribute("data-state")).toBe("closed");
  });

  test.each(menubarVariants)("$format/$style opens submenus on hover after the intent delay and keeps them open on re-enter", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "file",
        content: Sub(variant, { children: "Export", content: Item(variant, { children: "PDF" }) }),
      }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
    // Leaving before the intent delay fires cancels the pending open.
    pointerEnter(subTrigger);
    pointerLeave(subTrigger);
    await delay(150);
    expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
    pointerEnter(subTrigger);
    await delay(150);
    const subContent = await awaitPortaled("menubar-sub-content");
    expect(subContent.getAttribute("data-state")).toBe("open");
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

  test.each(menubarVariants)("$format/$style sub-trigger part opens through onOpen from click and hover intent", async (variant) => {
    const onOpen = mock(() => {});
    const container = setupContainer();
    const handle = mount(Part(variant, "SubTrigger")({ children: ["More"], onOpen }), container);
    const trigger = container.firstElementChild as HTMLElement;
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onOpen).toHaveBeenCalledTimes(1);
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

  test.each(menubarVariants)("$format/$style closes the submenu after leaving the trigger for the close delay", async (variant) => {
    const bar = renderBar(variant, [
      Menu(variant, {
        value: "file",
        content: Sub(variant, { children: "Export", content: Item(variant, { children: "PDF" }) }),
      }),
    ]);
    const [file] = triggers(bar);
    const content = await openMenu(file!);
    const subTrigger = content.querySelector("[data-slot='menubar-sub-trigger']") as HTMLElement;
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const subContent = await awaitPortaled("menubar-sub-content");
    expect(subContent.getAttribute("data-state")).toBe("open");
    pointerLeave(subTrigger);
    await delay(400);
    expect(subContent.getAttribute("data-state")).toBe("closed");
    subContent.dispatchEvent(new Event("animationend"));
    await awaitDetached(subContent);
    expect(subTrigger.getAttribute("aria-expanded")).toBe("false");
  });

  test.each(menubarVariants)("$format/$style drops bar and menu wiring on unmount", async (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({
      children: [Menu(variant, { value: "file", content: Item(variant, { children: "Open" }) })],
    }), container);
    const bar = container.firstElementChild as HTMLElement;
    const [file] = triggers(bar);
    await openMenu(file!);
    handle.unmount();
    expect(bar.isConnected).toBe(false);
    // Drained coordination listeners: announcements after unmount are inert.
    document.dispatchEvent(new CustomEvent("hella:menubar-open", { detail: { id: "other" } }));
    expect(bar.isConnected).toBe(false);
  });

  test.each(menubarVariants)("$format/$style forwards user attrs onto the bar root across all four variants", (variant) => {
    const bar = renderVariant(variant, { "aria-label": "main" });
    expect(bar.getAttribute("aria-label")).toBe("main");
  });

  test.each(menubarVariants)("$format/$style fires a user on:click handler on the bar root across all four variants", (variant) => {
    const userClick = mock(() => {});
    const bar = renderVariant(variant, { "on:click": userClick });
    bar.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
  });

  test.each(menubarVariants)("$format/$style merges a user class into the bar root's class across all four variants", (variant) => {
    const bar = renderVariant(variant, { class: "user-class" });
    expect(classTokens(bar).at(-1)).toBe("user-class");
  });

  test.each(menubarPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part respects a user-supplied id", (variant) => {
    const container = setupContainer();
    mount(variant.render({ id: "custom-menubar-content", children: [] }), container);
    expect(container.firstElementChild!.getAttribute("id")).toBe("custom-menubar-content");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(menubarVariants, { children: [] });
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of menubarPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const el = container.firstElementChild!;
      const slot = variant.part === "CheckboxItem" ? "menubar-checkbox-item"
        : variant.part === "RadioItem" ? "menubar-radio-item"
        : variant.part === "RadioGroup" ? "menubar-radio-group"
        : variant.part === "Sub" || variant.part === "SubTrigger" ? "menubar-sub-trigger"
        : variant.part === "SubContent" ? "menubar-sub-content"
        : `menubar-${variant.part.toLowerCase()}`;
      expect(el.getAttribute("data-slot")).toBe(slot);
    }
  });
});
