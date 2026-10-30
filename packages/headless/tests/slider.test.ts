import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { slider } from "@hellajs/headless";
import { pressKey } from "./helpers";

beforeEach(() => {
  resetTestState();
});

/** Mounts a rendered node into a fresh body container and returns its root element. */
function mountPart(node: JSX.Element): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(node, container);
  return container.firstElementChild as HTMLElement;
}

/** Polls (microtask hops) until the observer-driven mount walk has wired the node's hooks. */
async function awaitWiring(root: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(root)?.isMounted) return;
    await delay();
  }
  expect(peekState(root)?.isMounted).toBe(true);
}

interface RectShape {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

/** Overrides a track's rect measurement — HappyDOM zeroes client rects, so the drag math needs this seam. */
function spyRect(el: HTMLElement, rect: RectShape): void {
  Object.assign(el, {
    getBoundingClientRect: () =>
      ({
        left: rect.left ?? 0,
        top: rect.top ?? 0,
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        right: (rect.left ?? 0) + (rect.width ?? 0),
        bottom: (rect.top ?? 0) + (rect.height ?? 0),
        x: rect.left ?? 0,
        y: rect.top ?? 0,
        toJSON: () => ({}),
      }) as DOMRect,
  });
}

/** Dispatches pointerdown at `down`, then pointermove hops, ending with pointerup unless `release` is false. */
async function dragSequence(
  root: HTMLElement,
  down: { x: number; y: number },
  moves: { x: number; y: number }[],
  release = true,
): Promise<void> {
  root.dispatchEvent(
    new PointerEvent("pointerdown", {
      button: 0,
      bubbles: true,
      cancelable: true,
      clientX: down.x,
      clientY: down.y,
    }),
  );
  await delay();
  for (const at of moves) {
    root.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: at.x,
        clientY: at.y,
      }),
    );
    await delay();
  }
  if (release) root.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
}

interface MountedSlider {
  root: HTMLElement;
  track: HTMLElement;
  range: HTMLElement;
  thumbs: HTMLElement[];
}

/** Mounts Root > Track > Range + one Thumb per index and resolves the part elements. */
function mountSlider(
  options: Parameters<typeof slider>[0],
  thumbCount = 1,
): { parts: ReturnType<typeof slider>; mounted: MountedSlider } {
  const parts = slider(options);
  const root = mountPart(
    parts.Root({
      children: [
        parts.Track({ children: parts.Range({}) }),
        ...Array.from({ length: thumbCount }, (_, index) => parts.Thumb({ index })),
      ],
    }),
  );
  const track = root.querySelector("[data-slot='slider-track']") as HTMLElement;
  const range = root.querySelector("[data-slot='slider-range']") as HTMLElement;
  const thumbs = Array.from(root.querySelectorAll("[data-slot='slider-thumb']")) as HTMLElement[];
  return { parts, mounted: { root, track, range, thumbs } };
}

describe("slider", () => {
  test("a pointer drag maps track position to the stepped value, clamping to the bounds", async () => {
    const onValueChange = vi.fn((value: number[]) => value);
    const onValueCommit = vi.fn((value: number[]) => value);
    const { mounted } = mountSlider({ value: [50], step: 10, onValueChange, onValueCommit });
    await awaitWiring(mounted.root);
    spyRect(mounted.track, { left: 0, width: 100 });

    await dragSequence(mounted.root, { x: 32, y: 0 }, [
      { x: 47, y: 0 },
      { x: 95, y: 0 },
      { x: -20, y: 0 },
    ]);
    expect(onValueChange.mock.calls.map((call) => call[0])).toEqual([[30], [50], [100], [0]]);
    expect(mounted.thumbs[0]!.getAttribute("aria-valuenow")).toBe("0");
    expect(onValueCommit).toHaveBeenCalledTimes(1);
    expect(onValueCommit.mock.calls[0]).toEqual([[0]]);
  });

  test("range mode orders the pair when the drag crosses the neighbor", async () => {
    const onValueChange = vi.fn((value: number[]) => value);
    const { mounted } = mountSlider({ value: [25, 75], onValueChange }, 2);
    await awaitWiring(mounted.root);
    spyRect(mounted.track, { left: 0, width: 100 });

    await dragSequence(mounted.root, { x: 80, y: 0 }, [{ x: 10, y: 0 }]);
    expect(onValueChange.mock.calls.map((call) => call[0])).toEqual([
      [25, 80],
      [25, 25],
    ]);
    expect(mounted.thumbs[1]!.getAttribute("aria-valuenow")).toBe("25");
    expect(mounted.range.style.left).toBe("25%");
    expect(mounted.range.style.width).toBe("0%");
  });

  test("minStepsBetweenThumbs keeps the enforced gap between neighbors", async () => {
    const onValueChange = vi.fn((value: number[]) => value);
    const { mounted } = mountSlider(
      { value: [25, 75], minStepsBetweenThumbs: 5, onValueChange },
      2,
    );
    await awaitWiring(mounted.root);
    spyRect(mounted.track, { left: 0, width: 100 });

    await dragSequence(mounted.root, { x: 80, y: 0 }, [{ x: 10, y: 0 }]);
    expect(onValueChange.mock.calls.map((call) => call[0])).toEqual([
      [25, 80],
      [25, 30],
    ]);
  });

  test("arrow keys step, PageUp and PageDown jump ten steps, Home and End jump to the bounds", async () => {
    const onValueCommit = vi.fn((value: number[]) => value);
    const { mounted } = mountSlider({ value: [50], step: 10, onValueCommit });
    await awaitWiring(mounted.root);
    const thumb = mounted.thumbs[0]!;

    const right = pressKey(thumb, "ArrowRight");
    expect(right.defaultPrevented).toBe(true);
    expect(thumb.getAttribute("aria-valuenow")).toBe("60");
    pressKey(thumb, "ArrowLeft");
    expect(thumb.getAttribute("aria-valuenow")).toBe("50");
    pressKey(thumb, "PageUp");
    expect(thumb.getAttribute("aria-valuenow")).toBe("100");
    pressKey(thumb, "PageDown");
    expect(thumb.getAttribute("aria-valuenow")).toBe("0");
    pressKey(thumb, "End");
    expect(thumb.getAttribute("aria-valuenow")).toBe("100");
    pressKey(thumb, "Home");
    expect(thumb.getAttribute("aria-valuenow")).toBe("0");

    const unbound = pressKey(thumb, "b");
    expect(unbound.defaultPrevented).toBe(false);
    expect(thumb.getAttribute("aria-valuenow")).toBe("0");
    expect(onValueCommit).toHaveBeenCalledTimes(6);
  });

  test("a fractional step rounds to the step's decimal precision", async () => {
    const onValueChange = vi.fn((value: number[]) => value);
    const { mounted } = mountSlider({ value: [50], step: 0.5, onValueChange });
    await awaitWiring(mounted.root);
    spyRect(mounted.track, { left: 0, width: 100 });

    await dragSequence(mounted.root, { x: 33.7, y: 0 }, []);
    expect(onValueChange.mock.calls[0]).toEqual([[33.5]]);
  });

  test("vertical orientation maps the drag from the bottom edge and renders the axis", async () => {
    const onValueChange = vi.fn((value: number[]) => value);
    const { mounted } = mountSlider({ value: [40], orientation: "vertical", onValueChange });
    await awaitWiring(mounted.root);
    spyRect(mounted.track, { top: 0, height: 100 });

    expect(mounted.root.getAttribute("data-orientation")).toBe("vertical");
    expect(mounted.thumbs[0]!.getAttribute("aria-orientation")).toBe("vertical");
    await dragSequence(mounted.root, { x: 0, y: 30 }, [{ x: 0, y: 90 }]);
    expect(onValueChange.mock.calls.map((call) => call[0])).toEqual([[70], [10]]);
    expect(mounted.range.style.bottom).toBe("10%");
    expect(mounted.range.style.height).toBe("0%");
  });

  test("the thumb renders the aria value contract with the position style", async () => {
    const { mounted } = mountSlider({ value: [50] });
    await awaitWiring(mounted.root);
    const thumb = mounted.thumbs[0]!;

    expect(thumb.getAttribute("role")).toBe("slider");
    expect(thumb.getAttribute("tabindex")).toBe("0");
    expect(thumb.getAttribute("aria-valuemin")).toBe("0");
    expect(thumb.getAttribute("aria-valuemax")).toBe("100");
    expect(thumb.getAttribute("aria-valuenow")).toBe("50");
    expect(thumb.style.top).toBe("50%");
    expect(thumb.style.left).toBe("50%");
    expect(mounted.root.getAttribute("min")).toBe("0");
    expect(mounted.root.getAttribute("max")).toBe("100");
    expect(mounted.root.getAttribute("step")).toBe("1");
  });

  test("a bare slider seeds the [min, max] pair with two thumbs", async () => {
    const { mounted } = mountSlider({}, 2);
    await awaitWiring(mounted.root);
    expect(mounted.thumbs[0]!.getAttribute("aria-valuenow")).toBe("0");
    expect(mounted.thumbs[1]!.getAttribute("aria-valuenow")).toBe("100");
  });

  test("a controlled accessor reports without writing; the controller decides", async () => {
    const controlled = signal([40]);
    const onValueChange = vi.fn((value: number[]) => value);
    const { mounted } = mountSlider({
      value: () => controlled(),
      onValueChange,
    });
    await awaitWiring(mounted.root);
    spyRect(mounted.track, { left: 0, width: 100 });

    await dragSequence(mounted.root, { x: 60, y: 0 }, []);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual([[60]]);
    expect(controlled()).toEqual([40]);
    expect(mounted.thumbs[0]!.getAttribute("aria-valuenow")).toBe("40");

    controlled([70]);
    expect(mounted.thumbs[0]!.getAttribute("aria-valuenow")).toBe("70");
  });

  test("a disabled slider renders the disabled state and blocks drags and keys", async () => {
    const onValueChange = vi.fn((value: number[]) => value);
    const { mounted } = mountSlider({ value: [50], disabled: true, onValueChange });
    await awaitWiring(mounted.root);
    spyRect(mounted.track, { left: 0, width: 100 });
    const thumb = mounted.thumbs[0]!;

    expect(mounted.root.getAttribute("data-disabled")).toBe("true");
    expect(thumb.getAttribute("tabindex")).toBe("-1");
    expect(thumb.getAttribute("aria-disabled")).toBe("true");

    await dragSequence(mounted.root, { x: 60, y: 0 }, [{ x: 80, y: 0 }]);
    const key = pressKey(thumb, "ArrowRight");
    expect(key.defaultPrevented).toBe(false);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(thumb.getAttribute("aria-valuenow")).toBe("50");
  });

  test("a root without a track ignores pointerdowns", async () => {
    const onValueChange = vi.fn((value: number[]) => value);
    const parts = slider({ value: [50], onValueChange });
    const root = mountPart(parts.Root({ children: [] }));
    await awaitWiring(root);
    root.dispatchEvent(
      new PointerEvent("pointerdown", {
        button: 0,
        bubbles: true,
        cancelable: true,
        clientX: 60,
        clientY: 0,
      }),
    );
    await delay();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("root disposal stops the drag wiring", async () => {
    const onValueChange = vi.fn((value: number[]) => value);
    const { mounted } = mountSlider({ value: [50], onValueChange });
    await awaitWiring(mounted.root);
    spyRect(mounted.track, { left: 0, width: 100 });

    mounted.root.remove();
    for (let i = 0; i < 50; i++) {
      if (!peekState(mounted.root)) break;
      await delay();
    }
    expect(peekState(mounted.root)).toBeUndefined();

    await dragSequence(mounted.root, { x: 60, y: 0 }, [{ x: 80, y: 0 }]);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
