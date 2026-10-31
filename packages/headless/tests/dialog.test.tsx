import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { dialog } from "@hellajs/headless";
import { pointerDown, pressKey } from "./helpers";

beforeEach(() => {
  resetTestState();
});

/** Polls (microtask hops) until the newest portaled panel finished its observer-driven mount walk. */
async function openPanel(): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const nodes = document.querySelectorAll("[data-slot='dialog-content']");
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && node.isConnected && peekState(node)?.isMounted) return node;
    await delay();
  }
  throw new Error("portaled dialog panel never mounted");
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
function mountDialog(
  parts: ReturnType<typeof dialog>,
  contentProps: Partial<Parameters<ReturnType<typeof dialog>["Content"]>[0]> = {},
): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(
    parts.Trigger({
      children: [
        parts.Content({ children: [<button id="panel-action">Act</button>], ...contentProps }),
      ],
    }),
    container,
  );
  return container.firstElementChild as HTMLElement;
}

/** Mounts one portaled Content part alone, held open by a controlled getter. Returns its container. */
function mountPanel(
  parts: ReturnType<typeof dialog>,
  contentProps: Partial<Parameters<ReturnType<typeof dialog>["Content"]>[0]> = {},
): HTMLDivElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(
    parts.Content({
      children: [<button id="panel-action">Act</button>],
      ...contentProps,
    }),
    container,
  );
  return container;
}

describe("dialog", () => {
  test("clicking the trigger toggles state into data-state and the aria contract", async () => {
    const parts = dialog();
    const trigger = mountDialog(parts);
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.dispatchEvent(new Event("click"));
    const panel = await openPanel();
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(panel.getAttribute("data-state")).toBe("open");

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel.getAttribute("data-state")).toBe("closed");
  });

  test("Escape and an outside pointerdown close through the modal wiring", async () => {
    const parts = dialog();
    const trigger = mountDialog(parts);
    trigger.dispatchEvent(new Event("click"));
    const panel = await openPanel();

    pressKey(panel, "Escape");
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    panel.dispatchEvent(new Event("animationend"));
    await awaitDetached(panel);

    trigger.dispatchEvent(new Event("click"));
    const reopened = await openPanel();
    pointerDown(document.body);
    flush();
    expect(reopened.getAttribute("data-state")).toBe("closed");
    reopened.dispatchEvent(new Event("animationend"));
    await awaitDetached(reopened);
  });

  test("outside: false leaves an outside press inert while the Close member still dismisses", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = dialog({ onOpenChange });
    const trigger = mountDialog(parts, { outside: false });
    trigger.dispatchEvent(new Event("click"));
    const panel = await openPanel();
    onOpenChange.mockClear();

    pointerDown(document.body);
    flush();
    expect(panel.getAttribute("data-state")).toBe("open");
    expect(onOpenChange).not.toHaveBeenCalled();

    // The factory renders no implicit close button; dismissal runs through the members.
    expect(panel.querySelector("[data-slot='dialog-close']")).toBeNull();

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(panel.getAttribute("data-state")).toBe("closed");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("the Close member dismisses through the closure", async () => {
    const open = signal(true);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = dialog({
      open: () => open(),
      onOpenChange: (next) => {
        onOpenChange(next);
        open(next);
      },
    });
    mountPanel(parts, {
      children: [<button id="panel-action">Act</button>, parts.Close({ children: "Close" })],
    });
    const panel = await openPanel();
    const close = panel.querySelector("[data-slot='dialog-close']") as HTMLElement;
    expect(close.getAttribute("data-state")).toBe("open");

    close.dispatchEvent(new Event("click"));
    flush();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(close.getAttribute("data-state")).toBe("closed");
  });

  test("the exit holds the panel mounted under data-state closed until its animationend", async () => {
    const parts = dialog();
    const trigger = mountDialog(parts);
    trigger.dispatchEvent(new Event("click"));
    const panel = await openPanel();

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(panel.getAttribute("data-state")).toBe("closed");
    expect(panel.isConnected).toBe(true);

    panel.dispatchEvent(new Event("animationend"));
    await awaitDetached(panel);
  });

  test("the exit unmounts through the fallback budget when no animationend fires", async () => {
    const parts = dialog();
    const trigger = mountDialog(parts);
    trigger.dispatchEvent(new Event("click"));
    const panel = await openPanel();

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(panel.isConnected).toBe(true);
    await delay(320);
    expect(panel.isConnected).toBe(false);
  });

  test("a controlled open getter drives the parts, reports factory flips, and keeps internal state out", async () => {
    const open = signal(false);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = dialog({ open: () => open(), onOpenChange });
    const trigger = mountDialog(parts);

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(document.querySelector("[data-slot='dialog-content']")).toBeNull();

    open(true);
    const panel = await openPanel();
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(panel.getAttribute("data-state")).toBe("open");

    open(false);
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    // The controller's own flip notifies no one; onOpenChange reports factory transitions only.
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  test("focus is trapped inside the open panel and restored to the trigger on close", async () => {
    const parts = dialog();
    const trigger = mountDialog(parts);
    trigger.focus();
    trigger.dispatchEvent(new Event("click"));
    const panel = await openPanel();
    const action = document.getElementById("panel-action") as HTMLElement;
    expect(document.activeElement).toBe(action);

    // Tab from the only focusable child wraps back to it.
    pressKey(action, "Tab");
    expect(document.activeElement).toBe(action);

    pressKey(panel, "Escape");
    flush();
    panel.dispatchEvent(new Event("animationend"));
    await awaitDetached(panel);
    expect(document.activeElement).toBe(trigger);
  });

  test("unmounting the tree disposes the armed wiring with no residue", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = dialog({ onOpenChange });
    const container = document.createElement("div");
    document.body.append(container);
    const app = mount(
      parts.Trigger({
        children: [parts.Content({ children: [<button id="panel-action">Act</button>] })],
      }),
      container,
    );
    const trigger = container.firstElementChild as HTMLElement;
    trigger.dispatchEvent(new Event("click"));
    const panel = await openPanel();

    app.unmount();
    // The full unwind removes the portaled panel and drains the armed wiring —
    // probe after: nothing may answer on the detached panel or the document.
    await awaitDetached(panel);
    pressKey(panel, "Escape");
    pointerDown(document.body);
    flush();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  test("the overlay slot renders the styled element as the panel's body sibling with the closure's state", async () => {
    const parts = dialog({ open: () => true });
    mountPanel(parts, {
      overlay: (state) => <div data-slot="styled-overlay" data-state={state()} />,
    });
    const panel = await openPanel();
    const overlay = panel.previousElementSibling as HTMLElement;
    expect(overlay.getAttribute("data-slot")).toBe("styled-overlay");
    expect(overlay.getAttribute("data-state")).toBe("open");
    expect(overlay.parentElement).toBe(document.body);
  });

  test("portal: false renders the bare panel inline with the modal wiring armed", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = dialog({ open: () => true, onOpenChange });
    const container = mountPanel(parts, { portal: false });
    await delay();
    const panel = container.querySelector("[data-slot='dialog-content']") as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.parentElement).not.toBe(document.body);
    // No gate and no overlay: the inline panel renders without a portaled sibling.
    expect(document.querySelectorAll("[data-slot='dialog-overlay']").length).toBe(0);

    pressKey(panel, "Escape");
    flush();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(panel.isConnected).toBe(true);
  });

  test("fallbackMs overrides the exit budget", async () => {
    const open = signal(true);
    const parts = dialog({
      open: () => open(),
      onOpenChange: (next) => open(next),
      fallbackMs: 400,
    });
    mountPanel(parts);
    const panel = await openPanel();

    pressKey(panel, "Escape");
    flush();
    expect(panel.isConnected).toBe(true);
    await delay(320);
    // Past the default 250ms budget but inside the 400ms override: still held.
    expect(panel.isConnected).toBe(true);
    await delay(280);
    expect(panel.isConnected).toBe(false);
  });
});
