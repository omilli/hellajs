import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, and Portal's hook wiring (observer walk, element state) only works when the test's
// mount and the component's Portal share one dom instance.
import { html, mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  drawerPartVariants,
  drawerVariants,
} from "./helpers/variants";
import type { DrawerVariant, DrawerVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** The panel size the rect spy reports — the drag math's 25% distance threshold is 75px against it. */
const PANEL_SIZE = 300;

/** The newest drawer panel — portals append to body, so the freshly mounted one sorts last. */
function newestPanel(): HTMLElement | undefined {
  const panels = document.querySelectorAll('[data-slot="drawer-content"]');
  return panels.length === 0 ? undefined : (panels[panels.length - 1] as HTMLElement);
}

/**
 * Mounts a drawer variant onto document.body and returns its open switch plus a
 * panel resolver. The resolver polls for a panel newer than the mount-time count
 * (earlier tests can leave stale panels attached) that has finished the
 * observer-driven mount walk.
 */
function mountDrawer(variant: DrawerVariant, props: Omit<DrawerVariantProps, "open">) {
  const open = signal(false);
  const container = setupContainer();
  mount(html`<div>${variant.render({ ...props, open: () => open(), children: props.children ?? [] })}</div>`, container);
  const panel = async (): Promise<HTMLElement> => {
    for (let i = 0; i < 50; i++) {
      const newest = newestPanel();
      if (newest !== undefined && peekState(newest)?.isMounted && newest.getAttribute("aria-modal") === "true") return newest;
      await delay();
    }
    throw new Error("drawer panel never mounted");
  };
  return { open: (value: boolean) => open(value), panel };
}

/** Overrides the panel's rect measurement — HappyDOM zeroes client rects, so the drag math needs this seam. */
function spyPanelRect(panel: HTMLElement): void {
  Object.assign(panel, {
    getBoundingClientRect: () => ({ height: PANEL_SIZE, width: PANEL_SIZE, top: 0, left: 0, right: PANEL_SIZE, bottom: PANEL_SIZE, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
  });
}

interface DragStep {
  dx: number;
  dy: number;
  /** Real-clock gap before this move — the velocity sample source. */
  gap?: number;
}

/**
 * Dispatches the pointerdown/move/up sequence on the panel with accumulating
 * offsets. Gaps use real timers so event.timeStamp deltas carry px/ms signal.
 */
async function dragSequence(panel: HTMLElement, steps: DragStep[], release = true): Promise<void> {
  panel.dispatchEvent(new PointerEvent("pointerdown", { button: 0, bubbles: true, cancelable: true }));
  await delay();
  let x = 0;
  let y = 0;
  for (const step of steps) {
    if (step.gap !== undefined) await delay(null, step.gap);
    x += step.dx;
    y += step.dy;
    panel.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, bubbles: true, cancelable: true }));
    await delay();
  }
  if (release) panel.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
}

/** Polls (microtask hops) until the panel detaches from the document (the exit's unmount is observer-driven). */
async function awaitUnmounted(panel: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!panel.isConnected) return;
    await delay(null, 20);
  }
  expect(panel.isConnected).toBe(false);
}

describe("drawer", () => {
  test.each(drawerVariants)("$format/$style renders nothing while open is false", async (variant) => {
    const baseline = document.querySelectorAll('[data-slot="drawer-content"]').length;
    const drawer = mountDrawer(variant, { onClose: () => {}, title: "Filters" });
    await delay();
    await delay();
    expect(document.querySelectorAll('[data-slot="drawer-content"]').length).toBe(baseline);
    expect(drawer).toBeDefined();
  });

  test.each(drawerVariants)("$format/$style portals the overlay and panel with wired title, description, and bottom direction", async (variant) => {
    const drawer = mountDrawer(variant, {
      onClose: () => {},
      title: "Filters",
      description: "Narrow the results",
    });
    drawer.open(true);
    const panel = await drawer.panel();
    expect(panel.parentElement).toBe(document.body);
    const overlay = panel.previousElementSibling!;
    expect(overlay.getAttribute("data-slot")).toBe("drawer-overlay");
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(panel.getAttribute("data-state")).toBe("open");
    expect(panel.getAttribute("data-vaul-drawer-direction")).toBe("bottom");
    const titleId = panel.getAttribute("aria-labelledby")!;
    const title = panel.querySelector("h2")!;
    expect(title.id).toBe(titleId);
    expect(title.getAttribute("data-slot")).toBe("drawer-title");
    expect(title.textContent).toBe("Filters");
    const descriptionId = panel.getAttribute("aria-describedby")!;
    const description = panel.querySelector("p")!;
    expect(description.id).toBe(descriptionId);
    expect(description.getAttribute("data-slot")).toBe("drawer-description");
    expect(description.textContent).toBe("Narrow the results");
  });

  test.each(drawerVariants)("$format/$style carries the direction prop through to the panel", async (variant) => {
    const drawer = mountDrawer(variant, { onClose: () => {}, title: "Filters", direction: "right" });
    drawer.open(true);
    const panel = await drawer.panel();
    expect(panel.getAttribute("data-vaul-drawer-direction")).toBe("right");
  });

  test.each(drawerVariants)("$format/$style follows the pointer while dragging along the dismissal axis", async (variant) => {
    const drawer = mountDrawer(variant, { onClose: () => {}, title: "Filters" });
    drawer.open(true);
    const panel = await drawer.panel();
    spyPanelRect(panel);
    await dragSequence(panel, [{ dx: 0, dy: 60 }], false);
    expect(panel.style.transform).toBe("translateY(60px)");
    panel.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });

  test.each(drawerVariants)("$format/$style follows horizontal drags on side drawers", async (variant) => {
    const drawer = mountDrawer(variant, { onClose: () => {}, title: "Filters", direction: "right" });
    drawer.open(true);
    const panel = await drawer.panel();
    spyPanelRect(panel);
    await dragSequence(panel, [{ dx: 40, dy: 0 }], false);
    expect(panel.style.transform).toBe("translateX(40px)");
    // Opposite-direction drag is clamped at the closed edge.
    await dragSequence(panel, [{ dx: -90, dy: 0 }], false);
    expect(panel.style.transform).toBe("translateX(0px)");
    panel.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });

  test.each(drawerVariants)("$format/$style sets data-dragging while dragging and clears it on release", async (variant) => {
    const drawer = mountDrawer(variant, { onClose: () => {}, title: "Filters" });
    drawer.open(true);
    const panel = await drawer.panel();
    spyPanelRect(panel);
    await dragSequence(panel, [{ dx: 0, dy: 20 }], false);
    expect(panel.getAttribute("data-dragging")).toBe("true");
    panel.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(panel.getAttribute("data-dragging")).toBeNull();
  });

  test.each(drawerVariants)("$format/$style springs back when released under both thresholds", async (variant) => {
    const onClose = mock(() => {});
    const drawer = mountDrawer(variant, { onClose, title: "Filters" });
    drawer.open(true);
    const panel = await drawer.panel();
    spyPanelRect(panel);
    // 20px < 25% of 300px; a ~150ms gap keeps the release velocity far under 500px/s.
    await dragSequence(panel, [{ dx: 0, dy: 10 }, { dx: 0, dy: 10, gap: 150 }]);
    expect(onClose).not.toHaveBeenCalled();
    expect(panel.isConnected).toBe(true);
    expect(panel.getAttribute("data-state")).toBe("open");
    expect(panel.style.transform).toBe("");
  });

  test.each(drawerVariants)("$format/$style dismisses when released past 25% of the panel size", async (variant) => {
    const onClose = mock(() => {});
    const drawer = mountDrawer(variant, { onClose, title: "Filters" });
    drawer.open(true);
    const panel = await drawer.panel();
    spyPanelRect(panel);
    // 120px >= 25% of 300px; the 150ms gaps keep velocity low so distance is the trigger.
    await dragSequence(panel, [{ dx: 0, dy: 60 }, { dx: 0, dy: 60, gap: 150 }]);
    expect(onClose).toHaveBeenCalledTimes(1);
    // The caller's onClose wires the signal flip (the component never flips it);
    // drive it test-scope like the delivered dialog exit tests.
    drawer.open(false);
    expect(panel.getAttribute("data-state")).toBe("closed");
    expect(panel.style.transform).toBe("translateY(100%)");
    await awaitUnmounted(panel);
  });

  test.each(drawerVariants)("$format/$style dismisses on release velocity above the threshold", async (variant) => {
    const onClose = mock(() => {});
    const drawer = mountDrawer(variant, { onClose, title: "Filters" });
    drawer.open(true);
    const panel = await drawer.panel();
    spyPanelRect(panel);
    // Total displacement 40px < 75px, but ~15ms between samples is >500px/s.
    await dragSequence(panel, [{ dx: 0, dy: 8 }, { dx: 0, dy: 32, gap: 15 }]);
    expect(onClose).toHaveBeenCalledTimes(1);
    drawer.open(false);
    expect(panel.getAttribute("data-state")).toBe("closed");
    await awaitUnmounted(panel);
  });

  test.each(drawerVariants)("$format/$style fades the overlay proportionally to the drag fraction", async (variant) => {
    const drawer = mountDrawer(variant, { onClose: () => {}, title: "Filters" });
    drawer.open(true);
    const panel = await drawer.panel();
    spyPanelRect(panel);
    const overlay = panel.previousElementSibling as HTMLElement;
    expect(overlay.getAttribute("data-slot")).toBe("drawer-overlay");
    await dragSequence(panel, [{ dx: 0, dy: 75 }], false);
    const opacity = Number.parseFloat(overlay.style.opacity || "1");
    expect(Math.abs(opacity - 0.75)).toBeLessThan(0.01);
    panel.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await delay();
    expect(overlay.style.opacity).toBe("");
  });

  test.each(drawerVariants)("$format/$style ignores drags starting on interactive elements", async (variant) => {
    const drawer = mountDrawer(variant, {
      onClose: () => {},
      title: "Filters",
      children: [html`<button id="drawer-action">Apply</button>`],
    });
    drawer.open(true);
    const panel = await drawer.panel();
    spyPanelRect(panel);
    const button = document.getElementById("drawer-action")!;
    button.dispatchEvent(new PointerEvent("pointerdown", { button: 0, bubbles: true, cancelable: true }));
    await delay();
    button.dispatchEvent(new PointerEvent("pointermove", { clientX: 0, clientY: 60, bubbles: true, cancelable: true }));
    await delay();
    expect(panel.style.transform).toBe("");
    expect(panel.getAttribute("data-dragging")).toBeNull();
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });

  test.each(drawerVariants)("$format/$style completes the exit through the panel's transitionend", async (variant) => {
    const drawer = mountDrawer(variant, { onClose: () => {}, title: "Filters" });
    drawer.open(true);
    const panel = await drawer.panel();
    drawer.open(false);
    expect(panel.getAttribute("data-state")).toBe("closed");
    panel.dispatchEvent(new TransitionEvent("transitionend", { propertyName: "transform" }));
    await awaitUnmounted(panel);
  });

  test.each(drawerVariants)("$format/$style closes on Escape and slides the panel off-edge", async (variant) => {
    const onClose = mock(() => {});
    const drawer = mountDrawer(variant, { onClose, title: "Filters" });
    drawer.open(true);
    const panel = await drawer.panel();
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    drawer.open(false);
    expect(panel.getAttribute("data-state")).toBe("closed");
    for (let i = 0; i < 20 && panel.style.transform !== "translateY(100%)"; i++) await delay();
    expect(panel.style.transform).toBe("translateY(100%)");
    await awaitUnmounted(panel);
  });

  test.each(drawerVariants)("$format/$style closes on pointerdown outside the panel", async (variant) => {
    const onClose = mock(() => {});
    const drawer = mountDrawer(variant, { onClose, title: "Filters" });
    drawer.open(true);
    const panel = await drawer.panel();
    document.body.dispatchEvent(new Event("pointerdown"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(panel.isConnected).toBe(true);
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(
      drawerVariants,
      { open: () => true, onClose: () => {}, title: "Parity" },
      ["aria-labelledby", "id"],
    );
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of drawerPartVariants) {
      if (variant.part === "Portal") continue; // portals its children into body — covered by the alert-dialog Portal test
      const el = renderPart(variant);
      if (variant.part === "Content") {
        expect(el.getAttribute("data-slot")).toBe("drawer-content");
        expect(el.getAttribute("role")).toBe("dialog");
      } else if (variant.part === "Title") {
        expect(el.getAttribute("data-slot")).toBe("drawer-title");
        expect(el.tagName).toBe("H2");
      } else if (variant.part === "Description") {
        expect(el.getAttribute("data-slot")).toBe("drawer-description");
        expect(el.tagName).toBe("P");
      } else if (variant.part === "Close") {
        expect(el.getAttribute("data-slot")).toBe("drawer-close");
        expect(el.tagName).toBe("BUTTON");
      } else if (variant.part === "Trigger") {
        expect(el.getAttribute("data-slot")).toBe("drawer-trigger");
        expect(el.tagName).toBe("BUTTON");
      } else {
        expect(el.getAttribute("data-slot")).toBe(`drawer-${variant.part.toLowerCase()}`);
      }
    }
  });

  test("portals the Portal part's children into document.body", () => {
    for (const variant of drawerPartVariants) {
      if (variant.part !== "Portal") continue;
      renderPart(variant, [html`<span data-slot="drawer-portal-probe"></span>`]);
      expect(document.querySelector('[data-slot="drawer-portal-probe"]')).not.toBeNull();
    }
  });
});

/**
 * Renders one drawer part and resolves its mounted root. The Portal part
 * resolves to the wrapper (its children land in document.body) — the dedicated
 * Portal test above asserts the portaled child instead.
 */
function renderPart(variant: (typeof drawerPartVariants)[number], children?: ReturnType<typeof html>[]): Element {
  const container = setupContainer();
  const rendered = variant.render({ children: children ?? [] } as unknown as Record<string, never>);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
  return container.firstElementChild!;
}
