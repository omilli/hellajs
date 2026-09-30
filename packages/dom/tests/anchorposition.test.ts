import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { anchorPosition } from "@hellajs/dom/bundle";

const setViewport = (width: number, height: number): void => {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
};
const setOffsetSize = (el: HTMLElement, width: number, height: number): void => {
  Object.defineProperty(el, "offsetWidth", { value: width, configurable: true });
  Object.defineProperty(el, "offsetHeight", { value: height, configurable: true });
};

describe("anchorPosition", () => {
  let originalWidth: number;
  let originalHeight: number;

  beforeEach(() => {
    resetTestState();
    originalWidth = window.innerWidth;
    originalHeight = window.innerHeight;
    setViewport(400, 300);
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", { value: originalWidth, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: originalHeight, configurable: true });
  });

  test("applies fixed positioning from the measured rects", () => {
    const anchor = document.createElement("button");
    const floating = document.createElement("div");
    document.body.append(anchor, floating);
    const rect = { top: 100, left: 100, width: 50, height: 20 };
    Object.assign(anchor, { getBoundingClientRect: () => rect });
    setOffsetSize(floating, 60, 40);

    const dispose = anchorPosition(anchor, floating);
    expect(floating.style.position).toBe("fixed");
    expect(floating.style.left).toBe("95px");
    expect(floating.style.top).toBe("120px");
    dispose();
  });

  test("repositions on window scroll and resize", () => {
    const anchor = document.createElement("button");
    const floating = document.createElement("div");
    document.body.append(anchor, floating);
    let rect = { top: 100, left: 100, width: 50, height: 20 };
    Object.assign(anchor, { getBoundingClientRect: () => rect });
    setOffsetSize(floating, 60, 40);
    const dispose = anchorPosition(anchor, floating);

    rect = { top: 200, left: 20, width: 50, height: 20 };
    window.dispatchEvent(new Event("scroll"));
    expect(floating.style.left).toBe("15px");
    expect(floating.style.top).toBe("220px");

    setViewport(200, 220);
    window.dispatchEvent(new Event("resize"));
    expect(floating.style.left).toBe("15px");
    expect(floating.style.top).toBe("160px");
    dispose();
  });

  test("stretches to the anchor width and reports placements through onUpdate", () => {
    const anchor = document.createElement("button");
    const floating = document.createElement("div");
    document.body.append(anchor, floating);
    Object.assign(anchor, { getBoundingClientRect: () => ({ top: 100, left: 100, width: 50, height: 20 }) });
    setOffsetSize(floating, 60, 40);
    const onUpdate = mock(() => {});

    const dispose = anchorPosition(anchor, floating, { placement: "bottom-start", matchAnchorWidth: true, onUpdate });
    expect(floating.style.left).toBe("100px");
    expect(floating.style.width).toBe("50px");
    expect(onUpdate).toHaveBeenCalledWith("bottom-start");
    dispose();
  });

  test("measures the floating box after pinning the matched width", () => {
    const anchor = document.createElement("button");
    const floating = document.createElement("div");
    document.body.append(anchor, floating);
    Object.assign(anchor, { getBoundingClientRect: () => ({ top: 100, left: 100, width: 50, height: 20 }) });
    // Layout-true width: the intrinsic first layout is wider than the viewport
    // (the combobox/select first-open misplacement), then follows the pin.
    Object.defineProperty(floating, "offsetWidth", {
      configurable: true,
      get: () => (floating.style.width === "" ? 450 : Number.parseFloat(floating.style.width))
    });
    Object.defineProperty(floating, "offsetHeight", { configurable: true, value: 40 });

    const dispose = anchorPosition(anchor, floating, { placement: "bottom-start", matchAnchorWidth: true });
    expect(floating.style.left).toBe("100px");
    expect(floating.style.width).toBe("50px");
    dispose();
  });

  test("measures the floating box after taking it out of flow", () => {
    const anchor = document.createElement("button");
    const floating = document.createElement("div");
    document.body.append(anchor, floating);
    Object.assign(anchor, { getBoundingClientRect: () => ({ top: 100, left: 100, width: 50, height: 20 }) });
    // Layout-true width: an in-flow first layout stretches to the containing
    // block (the context/dropdown first-open misplacement), then shrinks to
    // fit once fixed.
    Object.defineProperty(floating, "offsetWidth", {
      configurable: true,
      get: () => (floating.style.position === "fixed" ? 60 : 450)
    });
    Object.defineProperty(floating, "offsetHeight", { configurable: true, value: 40 });

    const dispose = anchorPosition(anchor, floating, { placement: "bottom-start" });
    expect(floating.style.left).toBe("100px");
    dispose();
  });

  test("dispose removes the window listeners", () => {
    const anchor = document.createElement("button");
    const floating = document.createElement("div");
    document.body.append(anchor, floating);
    let rect = { top: 100, left: 100, width: 50, height: 20 };
    Object.assign(anchor, { getBoundingClientRect: () => rect });
    setOffsetSize(floating, 60, 40);
    const dispose = anchorPosition(anchor, floating);

    dispose();
    rect = { top: 200, left: 20, width: 50, height: 20 };
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    expect(floating.style.left).toBe("95px");
    expect(floating.style.top).toBe("120px");
  });

  test("requires anchor and floating", () => {
    const el = document.createElement("div");
    expect(() => anchorPosition(null as never, el)).toThrow("[dom] anchorPosition: anchor is required");
    expect(() => anchorPosition(el, null as never)).toThrow("[dom] anchorPosition: floating is required");
  });
});
