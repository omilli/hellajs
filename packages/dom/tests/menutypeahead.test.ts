import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { menuTypeahead } from "@hellajs/dom/bundle";
import { pressKey } from "./helpers";

const item = (text: string) => ({ node: document.createElement("div"), text });

describe("menuTypeahead", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("selects the first startsWith match", () => {
    const onSelect = mock(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    const items = [item("About"), item("Alpha"), item("Beta")];
    const dispose = menuTypeahead(container, () => items, onSelect);

    pressKey(container, "a");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(items[0]);
    dispose();
  });

  test("buffers consecutive keystrokes into one query", () => {
    const onSelect = mock(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    const items = [item("Apple"), item("Avocado"), item("Banana")];
    const dispose = menuTypeahead(container, () => items, onSelect);

    pressKey(container, "a");
    pressKey(container, "v");
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(items[1]);
    dispose();
  });

  test("resets the buffer after 500ms", async () => {
    const onSelect = mock(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    const items = [item("Apple"), item("Grape")];
    const dispose = menuTypeahead(container, () => items, onSelect);

    pressKey(container, "a");
    await delay(520);
    pressKey(container, "r");
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(items[1]);
    dispose();
  });

  test("wraps around on substring matches when no item starts with the query", async () => {
    const onSelect = mock(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    const items = [item("Apple"), item("Grape"), item("Pear")];
    const dispose = menuTypeahead(container, () => items, onSelect);

    pressKey(container, "a");
    expect(onSelect).toHaveBeenCalledWith(items[0]);
    await delay(520);
    pressKey(container, "r");
    expect(onSelect).toHaveBeenNthCalledWith(2, items[1]);
    await delay(520);
    pressKey(container, "r");
    expect(onSelect).toHaveBeenNthCalledWith(3, items[2]);
    await delay(520);
    pressKey(container, "r");
    expect(onSelect).toHaveBeenNthCalledWith(4, items[1]);
    expect(onSelect).toHaveBeenCalledTimes(4);
    dispose();
  });

  test("ignores modifier and non-printable keys", () => {
    const onSelect = mock(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    const items = [item("About")];
    const dispose = menuTypeahead(container, () => items, onSelect);

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true }));
    pressKey(container, "ArrowDown");
    pressKey(container, "Enter");
    expect(onSelect).not.toHaveBeenCalled();
    dispose();
  });

  test("requires container, resolveItems, and onSelect", () => {
    const el = document.createElement("div");
    const items = () => [item("a")];
    expect(() => menuTypeahead(null as never, items, () => {})).toThrow("[dom] menuTypeahead: container is required");
    expect(() => menuTypeahead(el, null as never, () => {})).toThrow("[dom] menuTypeahead: resolveItems is required");
    expect(() => menuTypeahead(el, items, null as never)).toThrow("[dom] menuTypeahead: onSelect is required");
  });
});
