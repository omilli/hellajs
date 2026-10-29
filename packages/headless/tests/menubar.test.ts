import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { menubar } from "@hellajs/headless";
import { pointerEnter, pressKey } from "./helpers";

beforeEach(() => {
  resetTestState();
});

/** Polls (microtask hops) until the newest portaled bar-menu content finished its observer-driven mount walk. */
async function openContent(slot = "menu-content"): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const nodes = document.querySelectorAll(`[data-slot='${slot}']`);
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && peekState(node)?.isMounted) return node;
    await delay();
  }
  throw new Error("portaled bar-menu content never mounted");
}

/** Polls (microtask hops) until the node detaches from the document. */
async function awaitDetached(node: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!node.isConnected) return;
    await delay();
  }
  expect(node.isConnected).toBe(false);
}

/** Mounts a bar with two value-named menus and returns the bar element and its triggers. */
function mountBar(options?: Parameters<typeof menubar>[0]): {
  bar: HTMLElement;
  triggers: HTMLElement[];
} {
  const instance = menubar(options);
  const file = instance.menu({ value: "file" });
  const edit = instance.menu({ value: "edit" });
  const container = document.createElement("div");
  document.body.append(container);
  mount(
    instance.Bar({
      children: [
        file.Trigger({ children: "File" }),
        file.Content({ children: [file.Item({ children: "Open" })] }),
        edit.Trigger({ children: "Edit" }),
        edit.Content({ children: [edit.Item({ children: "Copy" })] }),
      ],
    }),
    container,
  );
  const bar = container.firstElementChild as HTMLElement;
  const triggers = [...bar.querySelectorAll("button[aria-haspopup='menu']")] as HTMLElement[];
  return { bar, triggers };
}

describe("menubar", () => {
  test("opening one bar menu closes the sibling and mirrors the open id into the bar value", async () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const { bar, triggers } = mountBar({ onValueChange });
    expect(bar.getAttribute("role")).toBe("menubar");

    triggers[0]!.dispatchEvent(new Event("click"));
    const fileContent = await openContent();
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("true");
    expect(onValueChange).toHaveBeenLastCalledWith("file");

    // Opening the sibling closes the first without a second open layer.
    triggers[1]!.dispatchEvent(new Event("click"));
    const editContent = await openContent();
    flush();
    expect(editContent.getAttribute("data-state")).toBe("open");
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
    expect(fileContent.getAttribute("data-state")).toBe("closed");
    expect(triggers[1]!.getAttribute("aria-expanded")).toBe("true");
    expect(onValueChange).toHaveBeenLastCalledWith("edit");

    // Closing mirrors the empty value.
    pressKey(document.body, "Escape");
    flush();
    expect(triggers[1]!.getAttribute("aria-expanded")).toBe("false");
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  test("the bar roves focus across its triggers while no menu is open", async () => {
    const { triggers } = mountBar();
    triggers[0]!.focus();
    expect(document.activeElement).toBe(triggers[0]);

    pressKey(triggers[0]!, "ArrowRight");
    expect(document.activeElement).toBe(triggers[1]);

    pressKey(triggers[1]!, "ArrowLeft");
    expect(document.activeElement).toBe(triggers[0]);
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
  });

  test("a horizontal arrow inside an open menu hands off to the adjacent trigger and opens it", async () => {
    const { triggers } = mountBar();
    triggers[0]!.dispatchEvent(new Event("click"));
    const fileContent = await openContent();

    pressKey(fileContent, "ArrowRight");
    const editContent = await openContent();
    flush();
    // The handoff opens the adjacent menu (whose content takes focus) and the
    // announcement closes the first.
    expect(editContent.getAttribute("data-state")).toBe("open");
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
    expect(fileContent.getAttribute("data-state")).toBe("closed");
    expect(triggers[1]!.getAttribute("aria-expanded")).toBe("true");
    expect(editContent.getAttribute("data-state")).toBe("open");

    // And back: ArrowLeft hands off in the other direction.
    pressKey(editContent, "ArrowLeft");
    await openContent();
    flush();
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("true");
    expect(triggers[1]!.getAttribute("aria-expanded")).toBe("false");
  });

  test("a controlled bar value getter keeps the write out and reports every flip", async () => {
    const value = signal("");
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const instance = menubar({ value: () => value(), onValueChange });
    const only = instance.menu({ value: "only" });
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      instance.Bar({
        children: [
          only.Trigger({ children: "Only" }),
          only.Content({ children: [only.Item({ children: "Item" })] }),
        ],
      }),
      container,
    );
    const trigger = container.querySelector("button[aria-haspopup='menu']") as HTMLElement;

    trigger.dispatchEvent(new Event("click"));
    await openContent();
    // The bar never writes the controlled value; onValueChange reports the id.
    expect(value()).toBe("");
    expect(onValueChange).toHaveBeenCalledWith("only");
  });

  test("a bar menu exposes the same submenu factory as a plain menu", async () => {
    const instance = menubar();
    const only = instance.menu({ value: "only" });
    const sub = only.sub();
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      instance.Bar({
        children: [
          only.Trigger({ children: "Only" }),
          only.Content({
            children: [
              sub.Trigger({ children: "More" }),
              sub.Content({ children: [only.Item({ children: "Export" })] }),
            ],
          }),
        ],
      }),
      container,
    );
    const trigger = container.querySelector("button[aria-haspopup='menu']") as HTMLElement;
    trigger.dispatchEvent(new Event("click"));
    const layer = await openContent();
    const subTrigger = layer.querySelector("[data-slot='menu-sub-trigger']") as HTMLElement;
    pointerEnter(subTrigger);
    await delay(150);
    const subLayer = await openContent("menu-sub-content");
    expect(subTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(subLayer.getAttribute("data-state")).toBe("open");
  });

  test("unmounting the bar drops the coordination listeners", async () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const instance = menubar({ onValueChange });
    const only = instance.menu({ value: "only" });
    const container = document.createElement("div");
    document.body.append(container);
    const handle = mount(
      instance.Bar({
        children: [
          only.Trigger({ children: "Only" }),
          only.Content({ children: [only.Item({ children: "Item" })] }),
        ],
      }),
      container,
    );
    const trigger = container.querySelector("button[aria-haspopup='menu']") as HTMLElement;
    trigger.dispatchEvent(new Event("click"));
    const layer = await openContent();

    handle.unmount();
    await awaitDetached(layer);

    // A second bar opens cleanly - no announcement residue flips it shut.
    const { triggers } = mountBar({ onValueChange });
    triggers[0]!.dispatchEvent(new Event("click"));
    const reopened = await openContent();
    expect(reopened.getAttribute("data-state")).toBe("open");
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("true");
  });
});
