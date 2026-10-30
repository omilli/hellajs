import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { toast, Toaster, ToastItem, resetHeadless } from "@hellajs/headless";
import type { ToastRecord, ToasterProps } from "@hellajs/headless";
import { pointerDown, pointerMove, pointerUp } from "./helpers";

beforeEach(async () => {
  resetTestState();
  // Drain any pending 200ms exit splice from the previous case: a late splice
  // rewrites the queue signal, and ForEach re-invokes its render on every
  // write, replacing the lis a test in flight would hold.
  await delay(null, 220);
});

/** Mounts a Toaster (portaled to body) and polls until the stack ol attaches. */
async function mountToaster(props: ToasterProps = {}): Promise<{ unmount: () => void }> {
  const container = setupContainer();
  const handle = mount(
    <div>
      <Toaster {...props} />
    </div>,
    container,
  );
  for (let i = 0; i < 50; i++) {
    if (document.querySelector('ol[data-slot="toaster"]')) return handle;
    await delay();
  }
  throw new Error("toaster never mounted");
}

/** The newest toast li inside the attached toaster (ForEach renders array order: newest first). */
function newestToast(): HTMLElement {
  const li = document.querySelector('[data-slot="toast"]');
  expect(li).not.toBeNull();
  return li as HTMLElement;
}

/** Polls (microtask hops) until the newest toast li matching `selector` has finished the $ref-delivered mount walk. */
async function awaitToastArmed(selector = '[data-slot="toast"]'): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const li = document.querySelector(selector);
    if (li && peekState(li as HTMLElement)?.isMounted) return li as HTMLElement;
    await delay();
  }
  expect(document.querySelector(selector)).not.toBeNull();
  throw new Error("toast never armed");
}

/** Polls (microtask hops) until the given toast li detaches from the document. */
async function awaitUnmounted(li: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!li.isConnected) return;
    await delay();
  }
  expect(li.isConnected).toBe(false);
}

/** Overrides the toast's rect measurement — HappyDOM zeroes client rects, so the swipe math needs this seam. */
function spyToastRect(li: HTMLElement, width = 356): void {
  Object.assign(li, {
    getBoundingClientRect: () =>
      ({
        width,
        height: 60,
        top: 0,
        left: 0,
        right: width,
        bottom: 60,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  });
}

/** Dispatches the pointer drag sequence with accumulating clientX offsets. */
async function swipe(li: HTMLElement, steps: number[], release = true): Promise<void> {
  pointerDown(li);
  await delay();
  let x = 0;
  for (const step of steps) {
    x += step;
    pointerMove(li, x);
    await delay();
  }
  if (release) pointerUp(li);
}

describe("toast", () => {
  test("an enqueued toast renders in the Toaster stack", async () => {
    await mountToaster();
    toast("Hello", { description: "Secondary line" });
    const li = await awaitToastArmed();
    expect(li.tagName).toBe("LI");
    expect(li.getAttribute("data-type")).toBe("default");
    expect(li.getAttribute("data-toast-id")).toBe("1");
    expect(li.getAttribute("data-removed")).toBeNull();
    expect(li.querySelector('[data-slot="toast-title"]')!.textContent).toBe("Hello");
    expect(li.querySelector('[data-slot="toast-description"]')!.textContent).toBe("Secondary line");
    expect(li.closest('ol[data-slot="toaster"]')).not.toBeNull();
    expect(li.closest("ol")!.parentElement).toBe(document.body);
  });

  test("a toast auto-dismisses after its duration and unmounts after the exit", async () => {
    await mountToaster();
    toast("Brief", { duration: 300 });
    const li = await awaitToastArmed();
    await delay(null, 450);
    expect(li.getAttribute("data-removed")).toBe("true");
    await delay(null, 280);
    await awaitUnmounted(li);
  });

  test("a handle dismiss retires its toast", async () => {
    await mountToaster();
    const handle = toast("Handle mine");
    const li = await awaitToastArmed();
    handle.dismiss();
    expect(li.getAttribute("data-removed")).toBe("true");
    await delay(null, 280);
    await awaitUnmounted(li);
  });

  test("toast.dismiss(id) retires only that toast", async () => {
    await mountToaster();
    const first = toast("First");
    toast("Second");
    toast.dismiss(first.id);
    const lis = [...document.querySelectorAll('[data-slot="toast"]')];
    expect(lis).toHaveLength(2);
    expect(lis[1]!.getAttribute("data-removed")).toBe("true");
    expect(lis[0]!.getAttribute("data-removed")).toBeNull();
  });

  test("blanket dismiss retires everything and a double dismiss is a no-op", async () => {
    await mountToaster();
    const first = toast("First");
    toast("Second");
    toast.dismiss();
    toast.dismiss(first.id);
    expect(document.querySelectorAll('[data-slot="toast"][data-removed="true"]').length).toBe(2);
  });

  test("a swipe past the width threshold dismisses", async () => {
    await mountToaster();
    toast("Swipe me");
    const li = await awaitToastArmed();
    spyToastRect(li);
    // 200px >= 45% of the spied 356px width.
    await swipe(li, [80, 120]);
    expect(li.getAttribute("data-removed")).toBe("true");
  });

  test("a swipe under the threshold springs back", async () => {
    await mountToaster();
    toast("Springy");
    const li = await awaitToastArmed();
    spyToastRect(li);
    // 60px < 45% of 356px.
    await swipe(li, [30, 30]);
    expect(li.getAttribute("data-removed")).toBeNull();
    expect(li.style.transform).toBe("");
  });

  test("a drag ignores pointerdowns on the close button", async () => {
    await mountToaster();
    toast("Clickable");
    const li = await awaitToastArmed();
    spyToastRect(li);
    const close = li.querySelector('[data-slot="toast-close"]') as HTMLElement;
    pointerDown(close);
    await delay();
    pointerMove(close, 120);
    await delay();
    expect(li.getAttribute("data-dragging")).toBeNull();
    expect(li.style.transform).toBe("");
    pointerUp(close);
  });

  test("a retired toast ignores drags", async () => {
    await mountToaster();
    const handle = toast("Retired drag");
    const li = await awaitToastArmed();
    handle.dismiss();
    expect(li.getAttribute("data-removed")).toBe("true");
    spyToastRect(li);
    await swipe(li, [80], false);
    expect(li.getAttribute("data-dragging")).toBeNull();
    pointerUp(li);
  });

  test("the stack caps at three visible and retires the oldest first", async () => {
    await mountToaster();
    const first = toast("One");
    toast("Two");
    toast("Three");
    expect(document.querySelectorAll('[data-removed="true"]').length).toBe(0);
    toast("Four");
    const retired = document.querySelectorAll('[data-slot="toast"][data-removed="true"]');
    expect(retired).toHaveLength(1);
    expect(retired[0]!.getAttribute("data-toast-id")).toBe(String(first.id));
    toast("Five");
    expect(document.querySelectorAll('[data-slot="toast"][data-removed="true"]').length).toBe(2);
    await delay(null, 280);
    expect(document.querySelectorAll('[data-slot="toast"]').length).toBe(3);
    expect(document.querySelectorAll('[data-slot="toast"][data-removed="true"]').length).toBe(0);
  });

  test("stack depth marks the newest at depth zero", async () => {
    await mountToaster();
    toast("Oldest");
    toast("Middle");
    toast("Newest");
    const depths = [
      ...document.querySelectorAll('[data-slot="toast"]:not([data-removed="true"])'),
    ].map((li) => li.getAttribute("data-depth"));
    expect(depths.sort()).toEqual(["0", "1", "2"]);
    expect(newestToast().getAttribute("data-depth")).toBe("0");
  });

  test("hover pauses the countdown and leave resumes from the frozen remainder", async () => {
    await mountToaster();
    toast("Hover me", { duration: 700 });
    const li = await awaitToastArmed();
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

  test("toast.promise swaps loading to success and arms the settle duration", async () => {
    await mountToaster();
    let resolve!: (value: string) => void;
    const handle = toast.promise(
      new Promise<string>((r) => {
        resolve = r;
      }),
      { loading: "Uploading", success: (data) => `Done: ${data}`, error: "Failed", duration: 250 },
    );
    let li = await awaitToastArmed();
    expect(li.getAttribute("data-type")).toBe("loading");
    expect(li.querySelector('[data-slot="toast-title"]')!.textContent).toBe("Uploading");
    // The loading phase is sticky: no auto-dismiss while pending.
    await delay(null, 120);
    expect(li.isConnected).toBe(true);
    expect(li.getAttribute("data-removed")).toBeNull();
    resolve("ok");
    await delay(0);
    li = newestToast();
    expect(li.getAttribute("data-type")).toBe("success");
    expect(li.querySelector('[data-slot="toast-title"]')!.textContent).toBe("Done: ok");
    expect(handle.dismiss).toBeDefined();
    await delay(null, 400);
    expect(li.getAttribute("data-removed")).toBe("true");
  });

  test("toast.promise swaps loading to error on reject", async () => {
    await mountToaster();
    let reject!: (error: unknown) => void;
    toast.promise(
      new Promise<string>((_, r) => {
        reject = r;
      }),
      { loading: "Uploading", success: "Done", error: (error) => `Nope: ${String(error)}` },
    );
    reject("disk-full");
    await delay(0);
    const li = newestToast();
    expect(li.getAttribute("data-type")).toBe("error");
    expect(li.querySelector('[data-slot="toast-title"]')!.textContent).toBe("Nope: disk-full");
  });

  test("a promise toast settled after dismissal stays retired", async () => {
    await mountToaster();
    let resolve!: (value: string) => void;
    const handle = toast.promise(
      new Promise<string>((r) => {
        resolve = r;
      }),
      { loading: "Uploading", success: "Done", error: "Failed" },
    );
    const li = await awaitToastArmed();
    handle.dismiss();
    expect(li.getAttribute("data-removed")).toBe("true");
    resolve("late");
    await delay(0);
    expect(li.getAttribute("data-removed")).toBe("true");
    expect(li.getAttribute("data-type")).toBe("loading");
  });

  test("the action option renders a button, fires it, and dismisses the toast", async () => {
    await mountToaster();
    const onclick = vi.fn(() => {});
    toast("Undoable", { action: { label: "Undo", onclick } });
    const button = newestToast().querySelector('[data-slot="toast-action"]') as HTMLButtonElement;
    expect(button.textContent).toBe("Undo");
    button.click();
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(newestToast().getAttribute("data-removed")).toBe("true");
  });

  test("the close button dismisses the toast", async () => {
    await mountToaster();
    toast("Closable");
    const li = await awaitToastArmed();
    (li.querySelector('[data-slot="toast-close"]') as HTMLElement).click();
    expect(li.getAttribute("data-removed")).toBe("true");
  });

  test("position and richColors render on the stack and the cards", async () => {
    await mountToaster({ position: "top-left", richColors: true });
    expect(
      (document.querySelector('ol[data-slot="toaster"]') as HTMLElement).getAttribute(
        "data-position",
      ),
    ).toBe("top-left");
    toast("Tinted", { type: "success" });
    expect(newestToast().getAttribute("data-rich-colors")).toBe("true");
  });

  test("user attrs forward onto the portaled stack", async () => {
    await mountToaster({ title: "Hella", "aria-label": "Notifications" });
    const ol = document.querySelector('ol[data-slot="toaster"]') as HTMLElement;
    expect(ol.getAttribute("title")).toBe("Hella");
    expect(ol.getAttribute("aria-label")).toBe("Notifications");
  });

  test("Toaster children replace the default card and keep the wiring", async () => {
    await mountToaster({
      children: (record: ToastRecord) => (
        <ToastItem record={record} data-slot="custom-toast" data-custom="true">
          <em>Custom {record.data().message}</em>
        </ToastItem>
      ),
    });
    toast("Carded", { duration: 300 });
    const li = await awaitToastArmed('[data-custom="true"]');
    expect(li.getAttribute("data-slot")).toBe("custom-toast");
    expect(li.getAttribute("data-custom")).toBe("true");
    expect(li.querySelector("em")!.textContent).toBe("Custom Carded");
    expect(li.getAttribute("data-toast-id")).toBe("1");
    await delay(null, 450);
    expect(li.getAttribute("data-removed")).toBe("true");
  });

  test("a JSX child function (compiled array shape) renders the custom card", async () => {
    const container = setupContainer();
    mount(
      <div>
        <Toaster>
          {(record: ToastRecord) => (
            <ToastItem record={record} data-slot="jsx-child-toast">
              JSX {record.data().message}
            </ToastItem>
          )}
        </Toaster>
      </div>,
      container,
    );
    for (let i = 0; i < 50; i++) {
      if (document.querySelector('ol[data-slot="toaster"]')) break;
      await delay();
    }
    toast("Through JSX");
    const li = await awaitToastArmed('[data-slot="jsx-child-toast"]');
    expect(li.textContent).toContain("JSX Through JSX");
  });

  test("unmounting the Toaster clears the live countdown", async () => {
    const handle = await mountToaster();
    toast("Doomed", { duration: 300 });
    await awaitToastArmed();
    handle.unmount();
    await delay(null, 500);
    // The queue survives the unmount (module singleton): a remounted Toaster
    // still renders the toast the cleared timer never retired. The li lags
    // the ol by one microtask hop, so poll for it.
    await mountToaster();
    for (let i = 0; i < 50; i++) {
      const li = document.querySelector('[data-slot="toast"]');
      if (li) {
        expect(li.textContent).toContain("Doomed");
        return;
      }
      await delay();
    }
    expect(document.querySelector('[data-slot="toast"]')).not.toBeNull();
  });

  test("resetHeadless empties the queue and clears the timers", async () => {
    await mountToaster();
    toast("First", { duration: 300 });
    toast("Second");
    resetHeadless();
    await delay(null, 500);
    await mountToaster();
    expect(document.querySelectorAll('[data-slot="toast"]').length).toBe(0);
  });
});
