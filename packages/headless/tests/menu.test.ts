import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { menu } from "@hellajs/headless";
import { pointerDown, pointerEnter, pointerLeave, pressKey } from "./helpers";

beforeEach(() => {
  resetTestState();
});

/** Pins a rect on the element - the injectable seam the positioning assertions read through anchorPosition. */
function pinRect(el: Element, top: number, left: number, width: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** Polls (microtask hops) until the newest portaled menu content finished its observer-driven mount walk. */
async function openContent(slot = "menu-content"): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const nodes = document.querySelectorAll(`[data-slot='${slot}']`);
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && peekState(node)?.isMounted) return node;
    await delay();
  }
  throw new Error(`portaled ${slot} never mounted`);
}

/** Polls (microtask hops) until the node detaches from the document. */
async function awaitDetached(node: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!node.isConnected) return;
    await delay();
  }
  expect(node.isConnected).toBe(false);
}

/** Mounts a trigger with its content layer as a child in a fresh container and returns the trigger element. */
function mountMenu(
  parts: ReturnType<typeof menu>,
  content: ReturnType<typeof parts.Content>,
): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(parts.Trigger({ children: [content] }), container);
  return container.firstElementChild as HTMLElement;
}

describe("menu", () => {
  test("the trigger opens, arrows rove over enabled items with wrap-around, and Enter selects and closes", async () => {
    const onSelect = vi.fn(() => {});
    const parts = menu();
    const content = parts.Content({
      children: [
        parts.Item({ children: "First" }),
        parts.Item({ children: "Locked", disabled: true }),
        parts.Item({ children: "Last", onSelect }),
      ],
    });
    const trigger = mountMenu(parts, content);
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.dispatchEvent(new Event("click"));
    const layer = await openContent();
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(layer.id);
    expect(layer.getAttribute("role")).toBe("menu");
    // Open focuses the first activatable item.
    const items = [...layer.querySelectorAll("[role^='menuitem']")] as HTMLElement[];
    expect(document.activeElement).toBe(items[0]);

    // ArrowDown skips the disabled middle item.
    pressKey(layer, "ArrowDown");
    expect(document.activeElement).toBe(items[2]);
    // Wrap-around to the top.
    pressKey(layer, "ArrowDown");
    expect(document.activeElement).toBe(items[0]);
    // ArrowUp wraps backwards past the disabled item.
    pressKey(layer, "ArrowUp");
    expect(document.activeElement).toBe(items[2]);

    pressKey(layer, "Enter");
    expect(onSelect).toHaveBeenCalledTimes(1);
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(layer.getAttribute("data-state")).toBe("closed");
  });

  test("typeahead jumps to the matching item", async () => {
    const parts = menu();
    const content = parts.Content({
      children: [
        parts.Item({ children: "Alpha" }),
        parts.Item({ children: "Beta" }),
        parts.Item({ children: "Gamma" }),
      ],
    });
    const trigger = mountMenu(parts, content);
    trigger.dispatchEvent(new Event("click"));
    const layer = await openContent();
    const items = [...layer.querySelectorAll("[role^='menuitem']")] as HTMLElement[];
    expect(document.activeElement).toBe(items[0]);

    pressKey(layer, "g");
    expect(document.activeElement).toBe(items[2]);
  });

  test("an item with closeOnSelect: false stays open on selection", async () => {
    const parts = menu();
    const content = parts.Content({
      children: [parts.Item({ children: "Stay", closeOnSelect: false })],
    });
    const trigger = mountMenu(parts, content);
    trigger.dispatchEvent(new Event("click"));
    const layer = await openContent();
    const stay = layer.querySelector("[role='menuitem']") as HTMLElement;

    stay.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(layer.getAttribute("data-state")).toBe("open");
  });

  test("CheckboxItem toggles through its accessor when controlled and its own signal when internal", async () => {
    const onCheckedChange = vi.fn<(checked: boolean) => void>(() => {});
    const checked = signal(true);
    const parts = menu();
    const controlled = parts.Content({
      children: [
        parts.CheckboxItem({ children: "Grid", checked: () => checked(), onCheckedChange }),
      ],
    });
    const trigger = mountMenu(parts, controlled);
    trigger.dispatchEvent(new Event("click"));
    const layer = await openContent();
    const box = layer.querySelector("[role='menuitemcheckbox']") as HTMLElement;
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(box.getAttribute("data-state")).toBe("checked");

    // Controlled: the accessor is the source of truth, activation reports only.
    box.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(box.getAttribute("aria-checked")).toBe("true");
    // The toggle itself closes the layer.
    expect(trigger.getAttribute("data-state")).toBe("closed");
    layer.dispatchEvent(new Event("animationend"));
    await awaitDetached(layer);

    // Internal: the factory signal flips with the click.
    const internalContent = parts.Content({
      children: [parts.CheckboxItem({ children: "Grid" })],
    });
    const secondTrigger = mountMenu(parts, internalContent);
    secondTrigger.dispatchEvent(new Event("click"));
    const secondLayer = await openContent();
    const internalBox = secondLayer.querySelector("[role='menuitemcheckbox']") as HTMLElement;
    expect(internalBox.getAttribute("aria-checked")).toBe("false");
    internalBox.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(internalBox.getAttribute("aria-checked")).toBe("true");
    expect(internalBox.getAttribute("data-state")).toBe("checked");
  });

  test("RadioGroup sets its value and closes on selection", async () => {
    const theme = signal("light");
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const parts = menu();
    const content = parts.Content({
      children: [
        parts.RadioGroup({
          value: () => theme(),
          onValueChange,
          items: [{ value: "dark", label: "Dark" }],
          keyBy: "value",
        }),
      ],
    });
    const trigger = mountMenu(parts, content);
    trigger.dispatchEvent(new Event("click"));
    const layer = await openContent();
    const radio = layer.querySelector("[role='menuitemradio']") as HTMLElement;
    expect(radio.getAttribute("aria-checked")).toBe("false");

    radio.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onValueChange).toHaveBeenCalledWith("dark");
    expect(trigger.getAttribute("data-state")).toBe("closed");
  });

  test("the contextmenu trigger opens at the pointer coordinates and anchors the content there", async () => {
    const parts = menu({ trigger: "contextmenu" });
    const content = parts.Content({ children: [parts.Item({ children: "Inspect" })] });
    const container = document.createElement("div");
    document.body.append(container);
    mount(parts.Trigger({ children: [content] }), container);
    const trigger = container.firstElementChild as HTMLElement;
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBeNull();

    trigger.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }),
    );
    // The zero-size anchor node exists synchronously after the dispatch; pinning
    // its rect before the observer-driven mount walk feeds the fixed-coords path.
    const anchor = document.querySelector("[data-slot='menu-anchor']")!;
    pinRect(anchor, 40, 40, 0, 0);
    const layer = await openContent();
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(layer.style.left).toBe("40px");
    expect(layer.style.top).toBe("40px");
    expect(layer.getAttribute("data-side")).toBe("bottom");
    expect(layer.getAttribute("data-align")).toBe("start");

    // Escape restores focus to the zone and drops the virtual anchor.
    pressKey(document.body, "Escape");
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(document.activeElement).toBe(trigger);
    await awaitDetached(anchor);
    expect(document.querySelector("[data-slot='menu-anchor']")).toBeNull();
  });

  test("a submenu opens by arrow and hover, the parent stays open, and dismissal pops the sub layer first", async () => {
    const parts = menu();
    const sub = parts.sub();
    const content = parts.Content({
      children: [
        sub.Trigger({ children: "More" }),
        sub.Content({ children: [parts.Item({ children: "Export" })] }),
        parts.Item({ children: "Plain" }),
      ],
    });
    const trigger = mountMenu(parts, content);
    trigger.dispatchEvent(new Event("click"));
    const layer = await openContent();
    const subTrigger = layer.querySelector("[data-slot='menu-sub-trigger']") as HTMLElement;
    expect(subTrigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(subTrigger.getAttribute("aria-expanded")).toBe("false");

    // Open focuses the first item — the sub trigger here; ArrowRight enters the sub.
    expect(document.activeElement).toBe(subTrigger);
    pressKey(layer, "ArrowRight");
    const subLayer = await openContent("menu-sub-content");
    expect(subTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(layer.getAttribute("data-state")).toBe("open");

    // Outside press pops the top layer only: the sub closes, the parent stays.
    pointerDown(document.body);
    flush();
    expect(subLayer.getAttribute("data-state")).toBe("closed");
    expect(layer.getAttribute("data-state")).toBe("open");

    pointerDown(document.body);
    flush();
    expect(layer.getAttribute("data-state")).toBe("closed");
    layer.dispatchEvent(new Event("animationend"));
    await awaitDetached(layer);

    // Hover intent reopens: ~100ms rest opens; leaving schedules a close that
    // entering the content cancels; ArrowLeft exits the sub.
    trigger.dispatchEvent(new Event("click"));
    const reopened = await openContent();
    const reopenedTrigger = reopened.querySelector("[data-slot='menu-sub-trigger']") as HTMLElement;
    pointerEnter(reopenedTrigger);
    await delay(150);
    const hoveredSub = await openContent("menu-sub-content");
    expect(reopenedTrigger.getAttribute("aria-expanded")).toBe("true");

    pointerLeave(reopenedTrigger);
    pointerEnter(hoveredSub);
    await delay(350);
    expect(hoveredSub.getAttribute("data-state")).toBe("open");

    pressKey(hoveredSub, "ArrowLeft");
    flush();
    expect(hoveredSub.getAttribute("data-state")).toBe("closed");
    expect(reopened.getAttribute("data-state")).toBe("open");
    expect(document.activeElement).toBe(reopenedTrigger);
  });

  test("the keyboard model flips its directional arrows with the resolved writing direction", async () => {
    const parts = menu();
    const sub = parts.sub();
    const content = parts.Content({
      children: [
        sub.Trigger({ children: "More" }),
        sub.Content({ children: [parts.Item({ children: "Export" })] }),
      ],
    });
    const trigger = mountMenu(parts, content);
    trigger.dispatchEvent(new Event("click"));
    const layer = await openContent();
    layer.style.direction = "rtl";
    const subTrigger = layer.querySelector("[data-slot='menu-sub-trigger']") as HTMLElement;
    expect(document.activeElement).toBe(subTrigger);

    // RTL: ArrowLeft enters the submenu, ArrowRight exits it. Each content
    // node resolves its own direction, so both layers carry it.
    pressKey(layer, "ArrowLeft");
    const subLayer = await openContent("menu-sub-content");
    expect(subTrigger.getAttribute("aria-expanded")).toBe("true");
    subLayer.style.direction = "rtl";
    pressKey(subLayer, "ArrowRight");
    flush();
    expect(subLayer.getAttribute("data-state")).toBe("closed");
    expect(layer.getAttribute("data-state")).toBe("open");
    subLayer.dispatchEvent(new Event("animationend"));
    await awaitDetached(subLayer);

    // Click also opens the sub trigger.
    subTrigger.dispatchEvent(new Event("click", { bubbles: true }));
    const clickedSub = await openContent("menu-sub-content");
    expect(clickedSub.getAttribute("data-state")).toBe("open");
  });

  test("unmounting an open contextmenu drops its virtual anchor", async () => {
    const parts = menu({ trigger: "contextmenu" });
    const content = parts.Content({ children: [parts.Item({ children: "Inspect" })] });
    const container = document.createElement("div");
    document.body.append(container);
    const handle = mount(parts.Trigger({ children: [content] }), container);
    const trigger = container.firstElementChild as HTMLElement;
    trigger.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }),
    );
    await openContent();
    expect(document.querySelector("[data-slot='menu-anchor']")).not.toBeNull();

    handle.unmount();
    expect(document.querySelector("[data-slot='menu-anchor']")).toBeNull();
  });

  test("a controlled open getter drives the parts and keeps internal state out", async () => {
    const open = signal(false);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = menu({ open: () => open(), onOpenChange });
    const content = parts.Content({ children: [parts.Item({ children: "Only" })] });
    const trigger = mountMenu(parts, content);

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(onOpenChange).toHaveBeenCalledWith(true);

    open(true);
    const layer = await openContent();
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(layer.getAttribute("data-state")).toBe("open");

    open(false);
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    // The controller's own flip notifies no one; onOpenChange reports factory transitions only.
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  test("unmounting the tree drops the dismissal and selection listeners", async () => {
    const open = signal(false);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = menu({ open: () => open(), onOpenChange });
    const handle = mount(
      parts.Trigger({
        children: [parts.Content({ children: [parts.Item({ children: "Only" })] })],
      }),
    );
    open(true);
    const layer = await openContent();
    expect(layer.getAttribute("data-state")).toBe("open");

    handle.unmount();
    await awaitDetached(layer);

    pressKey(document.body, "Escape");
    pointerDown(document.body);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
