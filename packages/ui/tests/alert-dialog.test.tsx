import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, and Portal's hook wiring (observer walk, element state) only works when the test's
// mount and the component's Portal share one dom instance.

import { mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  alertDialogPartVariants,
  alertDialogVariants,
} from "./helpers/variants";
import type { AlertDialogVariant, AlertDialogVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** The newest alert dialog panel — portals append to body, so the freshly mounted one sorts last. */
function newestPanel(): HTMLElement | undefined {
  const panels = document.querySelectorAll('[role="alertdialog"]');
  return panels.length === 0 ? undefined : (panels[panels.length - 1] as HTMLElement);
}

/**
 * Mounts an alert dialog variant onto document.body and returns its open switch plus a
 * panel resolver. The resolver polls for a panel newer than the mount-time count
 * (earlier tests can leave stale panels attached) that has finished the
 * observer-driven mount walk.
 */
function mountAlertDialog(
  variant: AlertDialogVariant,
  props: Partial<AlertDialogVariantProps> & { onClose: () => void },
) {
  const open = signal(false);
  const container = setupContainer();
  mount(
    <div>{variant.render({ ...props, open: () => open(), children: props.children ?? [] })}</div>,
    container,
  );
  const panel = async (): Promise<HTMLElement> => {
    for (let i = 0; i < 50; i++) {
      const newest = newestPanel();
      if (
        newest !== undefined &&
        peekState(newest)?.isMounted &&
        newest.getAttribute("aria-modal") === "true"
      )
        return newest;
      await delay();
    }
    throw new Error("alert dialog panel never mounted");
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

describe("alert-dialog", () => {
  test.each(alertDialogVariants)("$style renders nothing while open is false", async (variant) => {
    const baseline = document.querySelectorAll('[role="alertdialog"]').length;
    const dlg = mountAlertDialog(variant, { onClose: () => {}, title: "Confirm" });
    await delay();
    await delay();
    expect(document.querySelectorAll('[role="alertdialog"]').length).toBe(baseline);
    expect(dlg).toBeDefined();
  });

  test.each(alertDialogVariants)(
    "$style portals the overlay and panel with wired title, description, and role",
    async (variant) => {
      const dlg = mountAlertDialog(variant, {
        onClose: () => {},
        title: "Delete account",
        description: "This action cannot be undone",
      });
      dlg.open(true);
      const panel = await dlg.panel();
      expect(panel.parentElement).toBe(document.body);
      const overlay = panel.previousElementSibling!;
      expect(overlay.getAttribute("data-slot")).toBe("alert-dialog-overlay");
      expect(panel.getAttribute("role")).toBe("alertdialog");
      expect(panel.getAttribute("aria-modal")).toBe("true");
      expect(panel.getAttribute("data-state")).toBe("open");
      expect(panel.getAttribute("data-size")).toBe("default");
      const titleId = panel.getAttribute("aria-labelledby")!;
      const title = panel.querySelector("h2")!;
      expect(title.id).toBe(titleId);
      expect(title.getAttribute("data-slot")).toBe("alert-dialog-title");
      expect(title.textContent).toBe("Delete account");
      const descriptionId = panel.getAttribute("aria-describedby")!;
      const description = panel.querySelector("p")!;
      expect(description.id).toBe(descriptionId);
      expect(description.getAttribute("data-slot")).toBe("alert-dialog-description");
      expect(description.textContent).toBe("This action cannot be undone");
    },
  );

  test.each(alertDialogVariants)(
    "$style carries the data-size prop through to the panel",
    async (variant) => {
      const dlg = mountAlertDialog(variant, { onClose: () => {}, title: "Confirm", size: "sm" });
      dlg.open(true);
      const panel = await dlg.panel();
      expect(panel.getAttribute("data-size")).toBe("sm");
    },
  );

  test.each(alertDialogVariants)(
    "$style does NOT close on outside pointerdown",
    async (variant) => {
      const onClose = vi.fn(() => {});
      const dlg = mountAlertDialog(variant, { onClose, title: "Confirm" });
      dlg.open(true);
      const panel = await dlg.panel();
      document.body.dispatchEvent(new Event("pointerdown"));
      expect(onClose).not.toHaveBeenCalled();
      expect(panel.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(alertDialogVariants)("$style closes on Escape by default", async (variant) => {
    const onClose = vi.fn(() => {});
    const dlg = mountAlertDialog(variant, { onClose, title: "Confirm" });
    dlg.open(true);
    const panel = await dlg.panel();
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test.each(alertDialogVariants)(
    "$style suppresses Escape when closeOnEscape is false",
    async (variant) => {
      const onClose = vi.fn(() => {});
      const dlg = mountAlertDialog(variant, { onClose, title: "Confirm", closeOnEscape: false });
      dlg.open(true);
      const panel = await dlg.panel();
      panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(onClose).not.toHaveBeenCalled();
    },
  );

  test.each(alertDialogVariants)(
    "$style focuses the first focusable child on open (trap on)",
    async (variant) => {
      const dlg = mountAlertDialog(variant, {
        onClose: () => {},
        title: "Confirm",
        children: [<button id="ad-first">First</button>],
      });
      dlg.open(true);
      const panel = await dlg.panel();
      const first = document.getElementById("ad-first")!;
      first.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(panel.contains(document.activeElement)).toBe(true);
    },
  );

  test.each(alertDialogPartVariants.filter((entry) => entry.part === "Action"))(
    "$style Action calls onClose on click",
    (variant) => {
      const onClose = vi.fn(() => {});
      const action = renderPart(variant, [], { onClose });
      action.dispatchEvent(new Event("click"));
      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  test.each(alertDialogPartVariants.filter((entry) => entry.part === "Action"))(
    "$style Action chains a user on:click with its owned dismiss",
    (variant) => {
      const onClose = vi.fn(() => {});
      const userClick = vi.fn(() => {});
      const action = renderPart(variant, [], { onClose, "on:click": userClick });
      action.dispatchEvent(new Event("click"));
      expect(userClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  test.each(alertDialogPartVariants.filter((entry) => entry.part === "Cancel"))(
    "$style Cancel calls onClose on click",
    (variant) => {
      const onClose = vi.fn(() => {});
      const cancel = renderPart(variant, [], { onClose });
      cancel.dispatchEvent(new Event("click"));
      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  test.each(alertDialogPartVariants.filter((entry) => entry.part === "Cancel"))(
    "$style Cancel chains a user on:click with its owned dismiss",
    (variant) => {
      const onClose = vi.fn(() => {});
      const userClick = vi.fn(() => {});
      const cancel = renderPart(variant, [], { onClose, "on:click": userClick });
      cancel.dispatchEvent(new Event("click"));
      expect(userClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  test.each(alertDialogPartVariants.filter((entry) => entry.part === "Content"))(
    "$style content part forwards the manual aria wiring attrs",
    (variant) => {
      const el = renderPart(variant, [], { "aria-labelledby": "wired-title" });
      expect(el.getAttribute("aria-labelledby")).toBe("wired-title");
    },
  );

  test.each(alertDialogVariants)(
    "$style forwards user attrs onto the portaled panel across both styles",
    async (variant) => {
      const dlg = mountAlertDialog(variant, {
        onClose: () => {},
        title: "Forward",
        "aria-label": "panel",
      });
      dlg.open(true);
      const panel = await dlg.panel();
      expect(panel.getAttribute("aria-label")).toBe("panel");
    },
  );

  test.each(alertDialogVariants)(
    "$style fires a user on:click handler on the portaled panel across both styles",
    async (variant) => {
      const onPanelClick = vi.fn(() => {});
      const dlg = mountAlertDialog(variant, {
        onClose: () => {},
        title: "Forward",
        "on:click": onPanelClick,
      });
      dlg.open(true);
      const panel = await dlg.panel();
      panel.dispatchEvent(new Event("click"));
      expect(onPanelClick).toHaveBeenCalledTimes(1);
    },
  );

  test.each(alertDialogVariants)(
    "$style merges a user class into the portaled panel's class across both styles",
    async (variant) => {
      const dlg = mountAlertDialog(variant, {
        onClose: () => {},
        title: "Forward",
        class: "user-class",
      });
      dlg.open(true);
      const panel = await dlg.panel();
      expect(classTokens(panel).at(-1)).toBe("user-class");
    },
  );

  test.each(alertDialogVariants)(
    "$style stays mounted under data-state closed until the panel's animationend",
    async (variant) => {
      const onClose = vi.fn(() => {});
      const dlg = mountAlertDialog(variant, { onClose, title: "Confirm" });
      dlg.open(true);
      const panel = await dlg.panel();
      dlg.open(false);
      expect(panel.getAttribute("data-state")).toBe("closed");
      expect(panel.isConnected).toBe(true);
      panel.dispatchEvent(new Event("animationend"));
      await awaitUnmounted(panel);
    },
  );

  test.each(alertDialogVariants)(
    "$style unmounts through the fallback budget when no animationend fires",
    async (variant) => {
      const dlg = mountAlertDialog(variant, { onClose: () => {}, title: "Confirm" });
      dlg.open(true);
      const panel = await dlg.panel();
      dlg.open(false);
      const budget = Date.now();
      while (panel.isConnected && Date.now() - budget < 450) {
        await delay(null, 20);
      }
      // Wall clock, not loop iterations: per-iteration lag under load must not read as an early unmount.
      expect(Date.now() - budget).toBeGreaterThanOrEqual(200);
      expect(panel.isConnected).toBe(false);
    },
  );

  test.each(alertDialogVariants)(
    "$style runs the exit unwired: no Escape dismissal while leaving",
    async (variant) => {
      const onClose = vi.fn(() => {});
      const dlg = mountAlertDialog(variant, { onClose, title: "Confirm" });
      dlg.open(true);
      const panel = await dlg.panel();
      dlg.open(false);
      expect(panel.getAttribute("data-state")).toBe("closed");
      panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(onClose).not.toHaveBeenCalled();
      panel.dispatchEvent(new Event("animationend"));
      await awaitUnmounted(panel);
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(
      alertDialogVariants,
      { open: () => true, onClose: () => {}, title: "Parity" },
      ["aria-labelledby", "id"],
    );
  });

  test("renders every named part with its data-slot across both styles", () => {
    for (const variant of alertDialogPartVariants) {
      if (variant.part === "Portal") continue; // portals its children into body — covered by the dedicated test below
      const el = renderPart(variant);
      if (variant.part === "Content") {
        expect(el.getAttribute("data-slot")).toBe("alert-dialog-content");
        expect(el.getAttribute("role")).toBe("alertdialog");
      } else if (variant.part === "Title") {
        expect(el.getAttribute("data-slot")).toBe("alert-dialog-title");
        expect(el.tagName).toBe("H2");
      } else if (variant.part === "Description") {
        expect(el.getAttribute("data-slot")).toBe("alert-dialog-description");
        expect(el.tagName).toBe("P");
      } else if (variant.part === "Action") {
        expect(el.getAttribute("data-slot")).toBe("alert-dialog-action");
        expect(el.tagName).toBe("BUTTON");
        expect(el.getAttribute("data-variant")).toBe("default");
      } else if (variant.part === "Cancel") {
        expect(el.getAttribute("data-slot")).toBe("alert-dialog-cancel");
        expect(el.tagName).toBe("BUTTON");
        expect(el.getAttribute("data-variant")).toBe("outline");
      } else if (variant.part === "Trigger") {
        expect(el.getAttribute("data-slot")).toBe("alert-dialog-trigger");
        expect(el.tagName).toBe("BUTTON");
      } else {
        expect(el.getAttribute("data-slot")).toBe(`alert-dialog-${variant.part.toLowerCase()}`);
      }
    }
  });

  test("portals the Portal part's children into document.body", () => {
    for (const variant of alertDialogPartVariants) {
      if (variant.part !== "Portal") continue;
      renderPart(variant, [<span data-slot="portal-probe"></span>]);
      expect(document.querySelector('[data-slot="portal-probe"]')).not.toBeNull();
    }
  });
});

/**
 * Renders one alert dialog part and resolves its mounted root. The Portal part
 * resolves to the wrapper (its children land in document.body) — the dedicated
 * Portal test above asserts the portaled child instead.
 */
function renderPart(
  variant: (typeof alertDialogPartVariants)[number],
  children?: JSX.Element[],
  extra: Record<string, unknown> = {},
): Element {
  const container = setupContainer();
  const rendered = variant.render({ children: children ?? [], ...extra } as unknown as Record<
    string,
    never
  >);
  // isDynamic meta results (Portal roots) have no flagged build for mount to root — the
  // template wrapper dispatches them as a child (child() hands them the parent).
  mount("isTemplate" in rendered ? rendered : <div>{rendered as never}</div>, container);
  return container.firstElementChild!;
}
