import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { modal } from "@hellajs/headless";
import { pointerDown, pressKey } from "./helpers";

beforeEach(() => {
  resetTestState();
});

/** Mounts a two-button panel onto the document and returns it with its buttons and unmount handle. */
function mountPanel(): {
  panel: HTMLElement;
  buttons: HTMLButtonElement[];
  unmount: () => void;
} {
  const app = mount(
    <div id="modal-panel">
      <button>one</button>
      <button>two</button>
    </div>,
  );
  const panel = document.getElementById("modal-panel")! as HTMLElement;
  const buttons = Array.from(panel.querySelectorAll("button")) as HTMLButtonElement[];
  return { panel, buttons, unmount: () => app.unmount() };
}

/** The modal state as a signal-backed getter, per the foundation contract. */
function stateSignal(initial: "open" | "closed") {
  const state = signal<"open" | "closed">(initial);
  return { state: () => state(), set: (value: "open" | "closed") => state(value) };
}

/**
 * A transform transitionend — `propertyName` set via defineProperty because
 * HappyDOM's TransitionEvent constructor drops it (the documented setPointerCapture-style gap).
 */
function transformEnd(bubbles = false): TransitionEvent {
  const event = new TransitionEvent("transitionend", { propertyName: "transform", bubbles });
  Object.defineProperty(event, "propertyName", { value: "transform" });
  return event;
}

describe("modal", () => {
  test("arms trap, escape, and outside dismissal when state flips open", () => {
    const onClose = vi.fn(() => {});
    const { panel, buttons } = mountPanel();
    const { state, set } = stateSignal("closed");
    modal(panel, { state, onClose });

    pressKey(panel, "Escape");
    pointerDown(document.body);
    expect(onClose).not.toHaveBeenCalled();

    set("open");
    flush();
    expect(document.activeElement).toBe(buttons[0]!);

    pressKey(panel, "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
    pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test("disarms every arm when state flips closed", () => {
    const onClose = vi.fn(() => {});
    const { panel, buttons } = mountPanel();
    const { state, set } = stateSignal("open");
    modal(panel, { state, onClose });
    expect(document.activeElement).toBe(buttons[0]!);

    set("closed");
    flush();
    pressKey(panel, "Escape");
    pointerDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("re-arms exactly once across open/close cycles", () => {
    const onClose = vi.fn(() => {});
    const { panel } = mountPanel();
    const { state, set } = stateSignal("closed");
    modal(panel, { state, onClose });

    set("open");
    flush();
    set("closed");
    flush();
    set("open");
    flush();
    set("closed");
    flush();
    set("open");
    flush();

    pressKey(panel, "Escape");
    pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test("removing the node disarms wiring and the exit listener", () => {
    const onClose = vi.fn(() => {});
    const onExited = vi.fn(() => {});
    const { panel, unmount } = mountPanel();
    const { state, set } = stateSignal("open");
    modal(panel, { state, onClose, onExited });

    unmount();
    pressKey(panel, "Escape");
    expect(onClose).not.toHaveBeenCalled();

    set("closed");
    flush();
    panel.dispatchEvent(new Event("animationend"));
    expect(onExited).not.toHaveBeenCalled();
  });

  test("fires onExited on animationend only while closed; the entry animationend is inert", () => {
    const onExited = vi.fn(() => {});
    const { panel } = mountPanel();
    const { state, set } = stateSignal("open");
    modal(panel, { state, onExited });

    panel.dispatchEvent(new Event("animationend"));
    expect(onExited).not.toHaveBeenCalled();

    set("closed");
    flush();
    panel.dispatchEvent(new Event("animationend"));
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  test("fires onExited on the panel's own transform transitionend only while closed", () => {
    const onExited = vi.fn(() => {});
    const { panel } = mountPanel();
    const { state, set } = stateSignal("open");
    modal(panel, { state, onExited });

    panel.dispatchEvent(transformEnd());
    expect(onExited).not.toHaveBeenCalled();

    set("closed");
    flush();
    panel.dispatchEvent(transformEnd());
    expect(onExited).toHaveBeenCalledTimes(1);

    const child = document.createElement("span");
    panel.append(child);
    child.dispatchEvent(transformEnd(true));
    panel.dispatchEvent(new TransitionEvent("transitionend", { propertyName: "opacity" }));
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  test("escape: false skips the escape arm; the other arms stay live", () => {
    const onClose = vi.fn(() => {});
    const { panel, buttons } = mountPanel();
    const { state } = stateSignal("open");
    modal(panel, { state, onClose, escape: false });

    pressKey(panel, "Escape");
    expect(onClose).not.toHaveBeenCalled();
    pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(buttons[0]!);
  });

  test("outside: false skips the outside arm; the other arms stay live", () => {
    const onClose = vi.fn(() => {});
    const { panel } = mountPanel();
    const { state } = stateSignal("open");
    modal(panel, { state, onClose, outside: false });

    pointerDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
    pressKey(panel, "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("missing onClose leaves both dismissal arms off without throwing; the trap stays live", () => {
    const { panel, buttons } = mountPanel();
    const { state } = stateSignal("open");
    modal(panel, { state });

    expect(document.activeElement).toBe(buttons[0]!);
    pressKey(panel, "Escape");
    pointerDown(document.body);
    expect(document.activeElement).toBe(buttons[0]!);
  });

  test("throws on missing node or state", () => {
    const { panel } = mountPanel();
    expect(() => modal(null as never, { state: () => "open" })).toThrow(
      "[headless] modal: node is required",
    );
    expect(() => modal(panel, undefined as never)).toThrow("[headless] modal: state is required");
    expect(() => modal(panel, {} as never)).toThrow("[headless] modal: state is required");
  });
});
