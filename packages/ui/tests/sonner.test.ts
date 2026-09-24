import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount and a component's Portal must share one dom instance.
import { html, mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  sonnerVariants,
} from "./helpers/variants";
import type { SonnerVariant } from "./helpers/variants";

beforeEach(async () => {
  // The store is a per-module singleton: retire every queue entry and let the
  // 200ms exit splice drain, so each test starts from an empty queue.
  for (const variant of sonnerVariants) variant.toast.dismiss();
  await delay(null, 280);
  resetTestState();
});

/** Polls (microtask hops) until the portaled ol attaches to the document (the ol itself carries no element state). */
async function mountToaster(variant: SonnerVariant, props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = setupContainer();
  const rendered = variant.render(props as never);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
  for (let i = 0; i < 50; i++) {
    const ol = document.querySelector("[data-sonner-toaster]");
    if (ol) return ol as HTMLElement;
    await delay();
  }
  throw new Error("sonner toaster never mounted");
}

/** Polls (microtask hops) until the newest toast li has finished the Portal-delivered mount walk (hooks armed). */
async function awaitToastArmed(): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const li = newestToast();
    if (li && peekState(li)?.isMounted) return li;
    await delay();
  }
  throw new Error("sonner toast never mounted");
}

/** The newest toast li inside the attached toaster (ForEach renders array order: newest first). */
function newestToast(): HTMLElement | undefined {
  const toasts = document.querySelectorAll('[data-slot="sonner-toast"]');
  return toasts.length === 0 ? undefined : (toasts[0] as HTMLElement);
}

/** Polls (microtask hops) until the given toast li detaches from the document. */
async function awaitUnmounted(li: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!li.isConnected) return;
    await delay();
  }
  expect(li.isConnected).toBe(false);
}

/** Overrides the toast's rect measurement — HappyDOM zeroes client rects, so the swipe math needs this seam. */
function spyToastRect(li: HTMLElement, width = 356): void {
  Object.assign(li, {
    getBoundingClientRect: () => ({ width, height: 60, top: 0, left: 0, right: width, bottom: 60, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
  });
}

/** Dispatches the pointerdown/move/up sequence with accumulating clientX offsets. */
async function swipeSequence(li: HTMLElement, steps: number[], release = true): Promise<void> {
  li.dispatchEvent(new PointerEvent("pointerdown", { button: 0, bubbles: true, cancelable: true }));
  await delay();
  let x = 0;
  for (const step of steps) {
    x += step;
    li.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: 0, bubbles: true, cancelable: true }));
    await delay();
  }
  if (release) li.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
}

describe("sonner", () => {
  test.each(sonnerVariants)("$format/$style renders an empty stack ol on mount", async (variant) => {
    const ol = await mountToaster(variant);
    expect(ol.tagName).toBe("OL");
    expect(ol.getAttribute("data-slot")).toBe("sonner-toaster");
    expect(ol.getAttribute("data-position")).toBe("bottom-right");
    expect(ol.parentElement).toBe(document.body);
    expect(ol.querySelectorAll('[data-slot="sonner-toast"]').length).toBe(0);
  });

  test.each(sonnerVariants)("$format/$style renders an enqueued toast with message, description, type icon, and data-type", async (variant) => {
    await mountToaster(variant);
    variant.toast("Saved", { description: "Your work is safe", type: "success" });
    const li = newestToast();
    expect(li).toBeDefined();
    expect(li!.getAttribute("data-type")).toBe("success");
    expect(li!.getAttribute("data-removed")).toBeNull();
    expect(li!.querySelector('[data-slot="sonner-title"]')!.textContent).toBe("Saved");
    expect(li!.querySelector('[data-slot="sonner-description"]')!.textContent).toBe("Your work is safe");
    expect(li!.querySelector('[data-slot="sonner-icon"]')).not.toBeNull();
    expect(li!.querySelector('[data-slot="sonner-icon"] svg')).not.toBeNull();
    expect(li!.querySelector('[data-slot="sonner-close"]')).not.toBeNull();
  });

  test.each(sonnerVariants)("$format/$style renders an untyped toast as data-type=default with no icon", async (variant) => {
    await mountToaster(variant);
    variant.toast("Plain note");
    const li = newestToast();
    expect(li!.getAttribute("data-type")).toBe("default");
    expect(li!.querySelector('[data-slot="sonner-icon"]')).toBeNull();
  });

  test.each(sonnerVariants)("$format/$style caps the stack at three visible toasts and unmounts retired ones after the exit", async (variant) => {
    await mountToaster(variant);
    const first = variant.toast("One");
    variant.toast("Two");
    variant.toast("Three");
    expect(document.querySelectorAll('[data-removed="true"]').length).toBe(0);
    variant.toast("Four");
    // The oldest retires immediately; the exit keeps it mounted under data-removed.
    expect(first.id).toBeDefined();
    const retired = document.querySelectorAll('[data-slot="sonner-toast"][data-removed="true"]');
    expect(retired.length).toBe(1);
    expect(retired[0]!.querySelector('[data-slot="sonner-title"]')!.textContent).toBe("One");
    variant.toast("Five");
    expect(document.querySelectorAll('[data-slot="sonner-toast"][data-removed="true"]').length).toBe(2);
    // After the exit budget the retired toasts unmount and the queue holds three.
    await delay(null, 280);
    const visible = document.querySelectorAll('[data-slot="sonner-toast"]:not([data-removed="true"])');
    expect(visible.length).toBe(3);
    expect(document.querySelectorAll('[data-slot="sonner-toast"]').length).toBe(3);
  });

  test.each(sonnerVariants)("$format/$style marks stack depth per visible toast, newest at depth zero", async (variant) => {
    await mountToaster(variant);
    variant.toast("Oldest");
    variant.toast("Middle");
    variant.toast("Newest");
    const lis = [...document.querySelectorAll('[data-slot="sonner-toast"]:not([data-removed="true"])')];
    const depths = lis.map((li) => li.getAttribute("data-depth"));
    expect(depths.sort()).toEqual(["0", "1", "2"]);
    const newest = newestToast()!;
    expect(newest.querySelector('[data-slot="sonner-title"]')!.textContent).toBe("Newest");
    expect(newest.getAttribute("data-depth")).toBe("0");
  });

  test.each(sonnerVariants)("$format/$style auto-dismisses after the toast's duration", async (variant) => {
    await mountToaster(variant);
    variant.toast("Brief", { duration: 300 });
    const li = newestToast()!;
    await delay(null, 450);
    expect(li.getAttribute("data-removed")).toBe("true");
    await delay(null, 280);
    await awaitUnmounted(li);
  });

  test.each(sonnerVariants)("$format/$style pauses the countdown on hover and resumes on leave", async (variant) => {
    await mountToaster(variant);
    variant.toast("Hover me", { duration: 700 });
    const li = newestToast()!;
    await delay(null, 200);
    li.dispatchEvent(new Event("pointerenter"));
    // 800ms total elapsed > 700ms budget — the toast survives because hover froze the countdown.
    await delay(null, 600);
    expect(li.getAttribute("data-removed")).toBeNull();
    // Resume: ~500ms remain; still alive 400ms in, gone past the budget.
    li.dispatchEvent(new Event("pointerleave"));
    await delay(null, 400);
    expect(li.getAttribute("data-removed")).toBeNull();
    await delay(null, 250);
    expect(li.getAttribute("data-removed")).toBe("true");
  });

  test.each(sonnerVariants)("$format/$style renders the action button, fires it, and dismisses the toast", async (variant) => {
    await mountToaster(variant);
    const onclick = mock(() => {});
    variant.toast("Undoable", { action: { label: "Undo", onclick } });
    const button = newestToast()!.querySelector('[data-slot="sonner-action"]') as HTMLButtonElement;
    expect(button.textContent).toBe("Undo");
    button.click();
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(newestToast()!.getAttribute("data-removed")).toBe("true");
  });

  test.each(sonnerVariants)("$format/$style swaps promise loading to success with the mapped message", async (variant) => {
    await mountToaster(variant);
    let resolve!: (value: string) => void;
    const handle = variant.toast.promise(new Promise<string>((r) => { resolve = r; }), {
      loading: "Uploading",
      success: (data) => `Done: ${data}`,
      error: "Failed",
    });
    let li = newestToast()!;
    expect(li.getAttribute("data-type")).toBe("loading");
    expect(li.querySelector('[data-slot="sonner-title"]')!.textContent).toBe("Uploading");
    expect(li.querySelector('[data-slot="sonner-icon"]')).not.toBeNull();
    // The loading phase is sticky: no auto-dismiss while pending.
    await delay(null, 120);
    expect(li.isConnected).toBe(true);
    expect(li.getAttribute("data-removed")).toBeNull();
    resolve("ok");
    await delay();
    await delay();
    li = newestToast()!;
    expect(li.getAttribute("data-type")).toBe("success");
    expect(li.querySelector('[data-slot="sonner-title"]')!.textContent).toBe("Done: ok");
    expect(handle.dismiss).toBeDefined();
  });

  test.each(sonnerVariants)("$format/$style swaps promise loading to error on reject", async (variant) => {
    await mountToaster(variant);
    let reject!: (error: unknown) => void;
    variant.toast.promise(new Promise<string>((_, r) => { reject = r; }), {
      loading: "Uploading",
      success: "Done",
      error: (error) => `Nope: ${String(error)}`,
    });
    reject("disk-full");
    await delay();
    await delay();
    const li = newestToast()!;
    expect(li.getAttribute("data-type")).toBe("error");
    expect(li.querySelector('[data-slot="sonner-title"]')!.textContent).toBe("Nope: disk-full");
  });

  test.each(sonnerVariants)("$format/$style accepts plain-string promise messages on both settle paths", async (variant) => {
    await mountToaster(variant);
    let resolve!: (value: string) => void;
    variant.toast.promise(new Promise<string>((r) => { resolve = r; }), {
      loading: "Saving",
      success: "Saved",
      error: "Save failed",
    });
    let li = newestToast()!;
    expect(li.getAttribute("data-type")).toBe("loading");
    resolve("ok");
    await delay();
    await delay();
    li = newestToast()!;
    expect(li.getAttribute("data-type")).toBe("success");
    expect(li.querySelector('[data-slot="sonner-title"]')!.textContent).toBe("Saved");
    let reject!: (error: unknown) => void;
    variant.toast.promise(new Promise<string>((_, r) => { reject = r; }), {
      loading: "Syncing",
      success: "Synced",
      error: "Sync failed",
    });
    reject("offline");
    await delay();
    await delay();
    li = newestToast()!;
    expect(li.getAttribute("data-type")).toBe("error");
    expect(li.querySelector('[data-slot="sonner-title"]')!.textContent).toBe("Sync failed");
  });

  test.each(sonnerVariants)("$format/$style keeps a promise toast retired when it settles after dismissal", async (variant) => {
    await mountToaster(variant);
    let resolve!: (value: string) => void;
    const handle = variant.toast.promise(new Promise<string>((r) => { resolve = r; }), {
      loading: "Uploading",
      success: "Done",
      error: "Failed",
    });
    const li = newestToast()!;
    handle.dismiss();
    expect(li.getAttribute("data-removed")).toBe("true");
    resolve("late");
    await delay();
    await delay();
    expect(li.getAttribute("data-removed")).toBe("true");
    expect(li.getAttribute("data-type")).toBe("loading");
  });

  test.each(sonnerVariants)("$format/$style follows the pointer during a swipe and dismisses past the threshold", async (variant) => {
    await mountToaster(variant);
    variant.toast("Swipe me");
    const li = await awaitToastArmed();
    spyToastRect(li);
    // 200px >= 45% of the spied 356px width.
    await swipeSequence(li, [80, 120]);
    expect(li.getAttribute("data-removed")).toBe("true");
  });

  test.each(sonnerVariants)("$format/$style springs back when the swipe releases under the threshold", async (variant) => {
    await mountToaster(variant);
    variant.toast("Springy");
    const li = await awaitToastArmed();
    spyToastRect(li);
    // 60px < 45% of 356px.
    await swipeSequence(li, [30, 30]);
    expect(li.getAttribute("data-removed")).toBeNull();
    expect(li.style.transform).toBe("");
  });

  test.each(sonnerVariants)("$format/$style ignores drags on retired toasts", async (variant) => {
    await mountToaster(variant);
    const handle = variant.toast("Retired drag");
    const li = await awaitToastArmed();
    handle.dismiss();
    expect(li.getAttribute("data-removed")).toBe("true");
    spyToastRect(li);
    await swipeSequence(li, [80], false);
    expect(li.getAttribute("data-dragging")).toBeNull();
    li.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });

  test.each(sonnerVariants)("$format/$style ignores drags starting on the close button", async (variant) => {
    await mountToaster(variant);
    variant.toast("Clickable");
    const li = await awaitToastArmed();
    spyToastRect(li);
    const close = li.querySelector('[data-slot="sonner-close"]') as HTMLElement;
    close.dispatchEvent(new PointerEvent("pointerdown", { button: 0, bubbles: true, cancelable: true }));
    await delay();
    close.dispatchEvent(new PointerEvent("pointermove", { clientX: 120, clientY: 0, bubbles: true, cancelable: true }));
    await delay();
    expect(li.getAttribute("data-dragging")).toBeNull();
    expect(li.style.transform).toBe("");
    close.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });

  test.each(sonnerVariants)("$format/$style dismisses by id and retires everything on blanket dismiss", async (variant) => {
    await mountToaster(variant);
    const first = variant.toast("First");
    variant.toast("Second");
    variant.toast.dismiss(first.id);
    const lis = [...document.querySelectorAll('[data-slot="sonner-toast"]')];
    expect(lis.filter((li) => li.getAttribute("data-removed") === "true").length).toBe(1);
    expect(lis.filter((li) => li.getAttribute("data-removed") === "true")[0]!.textContent).toContain("First");
    // Double-dismiss of the same id is a no-op.
    variant.toast.dismiss(first.id);
    variant.toast.dismiss();
    expect(document.querySelectorAll('[data-slot="sonner-toast"][data-removed="true"]').length).toBe(2);
  });

  test.each(sonnerVariants)("$format/$style carries the position and richColors props through to the ol and lis", async (variant) => {
    const ol = await mountToaster(variant, { position: "top-left", richColors: true });
    expect(ol.getAttribute("data-position")).toBe("top-left");
    variant.toast("Tinted", { type: "success" });
    expect(newestToast()!.getAttribute("data-rich-colors")).toBe("true");
  });

  test("keeps structural parity across all four variants", async () => {
    // The parity harness renders each flavor's Toaster against the same empty
    // singleton queue; only the generated stack id is volatile.
    assertStructuralParity(sonnerVariants, {}, ["id"]);
  });

  test("auto-dismisses the untyped default budget of 4000ms", async () => {
    // The 4000 default lives in the shared canonical source; one flavor pins it.
    const variant = sonnerVariants[0]!;
    await mountToaster(variant);
    variant.toast("Default budget");
    const li = newestToast()!;
    await delay(null, 3600);
    expect(li.getAttribute("data-removed")).toBeNull();
    await delay(null, 700);
    expect(li.getAttribute("data-removed")).toBe("true");
  });
});
