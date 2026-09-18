import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, and Portal's hook wiring (observer walk, element state) only works when the test's
// mount and the component's Portal share one dom instance.
import { html, mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  dialogPartVariants,
  dialogVariants,
} from "./helpers/variants";
import type { DialogVariant, DialogVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** The newest dialog panel — portals append to body, so the freshly mounted one sorts last. */
function newestPanel(): HTMLElement | undefined {
  const panels = document.querySelectorAll('[role="dialog"]');
  return panels.length === 0 ? undefined : (panels[panels.length - 1] as HTMLElement);
}

/**
 * Mounts a dialog variant onto document.body and returns its open switch plus a
 * panel resolver. The resolver polls for a panel newer than the mount-time count
 * (earlier tests can leave stale panels attached) that has finished the
 * observer-driven mount walk.
 */
function mountDialog(variant: DialogVariant, props: Omit<DialogVariantProps, "open">) {
  const open = signal(false);
  const container = setupContainer();
  mount(html`<div>${variant.render({ ...props, open: () => open(), children: props.children ?? [] })}</div>`, container);
  const panel = async (): Promise<HTMLElement> => {
    for (let i = 0; i < 50; i++) {
      const newest = newestPanel();
      if (newest !== undefined && peekState(newest)?.isMounted && newest.getAttribute("aria-modal") === "true") return newest;
      await delay();
    }
    throw new Error("dialog panel never mounted");
  };
  return { open: (value: boolean) => open(value), panel };
}

/** Polls (microtask hops) until the panel detaches from the document (the exit's unmount is observer-driven). */
async function awaitUnmounted(panel: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!panel.isConnected) return;
    await delay();
  }
  expect(panel.isConnected).toBe(false);
}

describe("dialog", () => {
  test.each(dialogVariants)("$format/$style renders nothing while open is false", async (variant) => {
    const baseline = document.querySelectorAll('[role="dialog"]').length;
    const dlg = mountDialog(variant, { onClose: () => {}, title: "Confirm" });
    await delay();
    await delay();
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(baseline);
    expect(dlg).toBeDefined();
  });

  test.each(dialogVariants)("$format/$style portals the overlay and panel as body siblings with data-state open and wired titles", async (variant) => {
    const dlg = mountDialog(variant, {
      onClose: () => {},
      title: "Confirm",
      description: "Proceed with the action",
    });
    dlg.open(true);
    const panel = await dlg.panel();
    expect(panel.parentElement).toBe(document.body);
    const overlay = panel.previousElementSibling!;
    expect(overlay.getAttribute("data-slot")).toBe("dialog-overlay");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(panel.getAttribute("data-state")).toBe("open");
    const titleId = panel.getAttribute("aria-labelledby")!;
    const title = panel.querySelector("h2")!;
    expect(title.id).toBe(titleId);
    expect(title.getAttribute("data-slot")).toBe("dialog-title");
    expect(title.textContent).toBe("Confirm");
    const descriptionId = panel.getAttribute("aria-describedby")!;
    const description = panel.querySelector("p")!;
    expect(description.id).toBe(descriptionId);
    expect(description.getAttribute("data-slot")).toBe("dialog-description");
    expect(description.textContent).toBe("Proceed with the action");
  });

  test.each(dialogVariants)("$format/$style closes on Escape by default", async (variant) => {
    const onClose = mock(() => {});
    const dlg = mountDialog(variant, { onClose, title: "Confirm" });
    dlg.open(true);
    const panel = await dlg.panel();
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test.each(dialogVariants)("$format/$style suppresses Escape when closeOnEscape is false", async (variant) => {
    const onClose = mock(() => {});
    const dlg = mountDialog(variant, { onClose, title: "Confirm", closeOnEscape: false });
    dlg.open(true);
    const panel = await dlg.panel();
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  test.each(dialogVariants)("$format/$style closes through the close button with its sr-only label", async (variant) => {
    const onClose = mock(() => {});
    const dlg = mountDialog(variant, { onClose, title: "Confirm" });
    dlg.open(true);
    const panel = await dlg.panel();
    const close = panel.querySelector('[data-slot="dialog-close"]')!;
    expect(close.tagName).toBe("BUTTON");
    expect(close.querySelector("span")!.textContent).toBe("Close");
    close.dispatchEvent(new Event("click"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test.each(dialogVariants)("$format/$style omits the close button when showCloseButton is false", async (variant) => {
    const dlg = mountDialog(variant, { onClose: () => {}, title: "Confirm", showCloseButton: false });
    dlg.open(true);
    const panel = await dlg.panel();
    expect(panel.querySelector('[data-slot="dialog-close"]')).toBeNull();
  });

  test.each(dialogVariants)("$format/$style wraps Tab from the last focusable to the first", async (variant) => {
    const dlg = mountDialog(variant, {
      onClose: () => {},
      title: "Confirm",
      children: [html`<button id="dlg-first">First</button>`],
    });
    dlg.open(true);
    const panel = await dlg.panel();
    const first = document.getElementById("dlg-first")!;
    const close = panel.querySelector('[data-slot="dialog-close"]') as HTMLElement;
    close.focus();
    close.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
    expect(document.activeElement).toBe(close);
  });

  test.each(dialogVariants)("$format/$style closes on pointerdown outside the panel", async (variant) => {
    const onClose = mock(() => {});
    const dlg = mountDialog(variant, { onClose, title: "Confirm" });
    dlg.open(true);
    const panel = await dlg.panel();
    document.body.dispatchEvent(new Event("pointerdown"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(panel.isConnected).toBe(true);
  });

  test.each(dialogVariants)("$format/$style suppresses outside pointerdown when closeOnOutside is false", async (variant) => {
    const onClose = mock(() => {});
    const dlg = mountDialog(variant, { onClose, title: "Confirm", closeOnOutside: false });
    dlg.open(true);
    await dlg.panel();
    document.body.dispatchEvent(new Event("pointerdown"));
    expect(onClose).not.toHaveBeenCalled();
  });

  test.each(dialogVariants)("$format/$style stays mounted under data-state closed until the panel's animationend", async (variant) => {
    const onClose = mock(() => {});
    const dlg = mountDialog(variant, { onClose, title: "Confirm" });
    dlg.open(true);
    const panel = await dlg.panel();
    dlg.open(false);
    expect(panel.getAttribute("data-state")).toBe("closed");
    expect(panel.isConnected).toBe(true);
    panel.dispatchEvent(new Event("animationend"));
    await awaitUnmounted(panel);
  });

  test.each(dialogVariants)("$format/$style unmounts through the 250ms fallback when no animationend fires", async (variant) => {
    const dlg = mountDialog(variant, { onClose: () => {}, title: "Confirm" });
    dlg.open(true);
    const panel = await dlg.panel();
    dlg.open(false);
    let waited = 0;
    while (panel.isConnected && waited < 400) {
      await delay(null, 20);
      waited += 20;
    }
    expect(waited).toBeGreaterThanOrEqual(200);
    expect(panel.isConnected).toBe(false);
  });

  test.each(dialogVariants)("$format/$style runs the exit unwired: no dismissal while leaving", async (variant) => {
    const onClose = mock(() => {});
    const dlg = mountDialog(variant, { onClose, title: "Confirm" });
    dlg.open(true);
    const panel = await dlg.panel();
    dlg.open(false);
    expect(panel.getAttribute("data-state")).toBe("closed");
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    document.body.dispatchEvent(new Event("pointerdown"));
    expect(onClose).not.toHaveBeenCalled();
    panel.dispatchEvent(new Event("animationend"));
    await awaitUnmounted(panel);
  });

  test.each(dialogVariants)("$format/$style restores focus to the pre-open element after the exit", async (variant) => {
    const outside = document.createElement("button");
    outside.id = "dlg-outside";
    document.body.appendChild(outside);
    const dlg = mountDialog(variant, {
      onClose: () => {},
      title: "Confirm",
      children: [html`<button id="dlg-only">Only</button>`],
    });
    outside.focus();
    dlg.open(true);
    const panel = await dlg.panel();
    dlg.open(false);
    panel.dispatchEvent(new Event("animationend"));
    await awaitUnmounted(panel);
    expect(document.activeElement).toBe(outside);
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(
      dialogVariants,
      { open: () => true, onClose: () => {}, title: "Parity" },
      ["aria-labelledby", "id"],
    );
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of dialogPartVariants) {
      const el = renderPart(variant);
      if (variant.part === "Content") {
        expect(el.getAttribute("data-slot")).toBe("dialog-content");
        expect(el.getAttribute("role")).toBe("dialog");
      } else if (variant.part === "Title") {
        expect(el.getAttribute("data-slot")).toBe("dialog-title");
        expect(el.tagName).toBe("H2");
      } else if (variant.part === "Description") {
        expect(el.getAttribute("data-slot")).toBe("dialog-description");
        expect(el.tagName).toBe("P");
      } else if (variant.part === "Close") {
        expect(el.getAttribute("data-slot")).toBe("dialog-close");
        expect(el.tagName).toBe("BUTTON");
      } else {
        expect(el.getAttribute("data-slot")).toBe(`dialog-${variant.part.toLowerCase()}`);
      }
    }
  });
});

/** Renders one dialog part and resolves its mounted root (the panel part is a plain element). */
function renderPart(variant: (typeof dialogPartVariants)[number]): Element {
  const container = setupContainer();
  const rendered = variant.render({ children: [] } as unknown as Record<string, never>);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
  return container.firstElementChild!;
}
