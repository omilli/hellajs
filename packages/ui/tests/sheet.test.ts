import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, and Portal's hook wiring (observer walk, element state) only works when the test's
// mount and the component's Portal share one dom instance.
import { html, mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  sheetPartVariants,
  sheetVariants,
} from "./helpers/variants";
import type { SheetVariant, SheetVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** The newest sheet panel — portals append to body, so the freshly mounted one sorts last. */
function newestPanel(): HTMLElement | undefined {
  const panels = document.querySelectorAll('[data-slot="sheet-content"]');
  return panels.length === 0 ? undefined : (panels[panels.length - 1] as HTMLElement);
}

/**
 * Mounts a sheet variant onto document.body and returns its open switch plus a
 * panel resolver. The resolver polls for a panel newer than the mount-time count
 * (earlier tests can leave stale panels attached) that has finished the
 * observer-driven mount walk.
 */
function mountSheet(variant: SheetVariant, props: Partial<SheetVariantProps> & { onClose: () => void }) {
  const open = signal(false);
  const container = setupContainer();
  mount(html`<div>${variant.render({ ...props, open: () => open(), children: props.children ?? [] })}</div>`, container);
  const panel = async (): Promise<HTMLElement> => {
    for (let i = 0; i < 50; i++) {
      const newest = newestPanel();
      if (newest !== undefined && peekState(newest)?.isMounted && newest.getAttribute("aria-modal") === "true") return newest;
      await delay();
    }
    throw new Error("sheet panel never mounted");
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

describe("sheet", () => {
  test.each(sheetVariants)("$format/$style renders nothing while open is false", async (variant) => {
    const baseline = document.querySelectorAll('[data-slot="sheet-content"]').length;
    const sheet = mountSheet(variant, { onClose: () => {}, title: "Menu" });
    await delay();
    await delay();
    expect(document.querySelectorAll('[data-slot="sheet-content"]').length).toBe(baseline);
    expect(sheet).toBeDefined();
  });

  test.each(sheetVariants)("$format/$style portals the overlay and panel with wired title and description", async (variant) => {
    const sheet = mountSheet(variant, {
      onClose: () => {},
      title: "Edit profile",
      description: "Make changes to your profile",
    });
    sheet.open(true);
    const panel = await sheet.panel();
    expect(panel.parentElement).toBe(document.body);
    const overlay = panel.previousElementSibling!;
    expect(overlay.getAttribute("data-slot")).toBe("sheet-overlay");
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(panel.getAttribute("data-state")).toBe("open");
    const titleId = panel.getAttribute("aria-labelledby")!;
    const title = panel.querySelector("h2")!;
    expect(title.id).toBe(titleId);
    expect(title.getAttribute("data-slot")).toBe("sheet-title");
    expect(title.textContent).toBe("Edit profile");
    const descriptionId = panel.getAttribute("aria-describedby")!;
    const description = panel.querySelector("p")!;
    expect(description.id).toBe(descriptionId);
    expect(description.getAttribute("data-slot")).toBe("sheet-description");
    expect(description.textContent).toBe("Make changes to your profile");
  });

  test.each(sheetVariants)("$format/$style defaults to the right side", async (variant) => {
    const sheet = mountSheet(variant, { onClose: () => {}, title: "Menu" });
    sheet.open(true);
    const panel = await sheet.panel();
    expect(panel.getAttribute("data-side")).toBe("right");
  });

  test.each(sheetVariants)("$format/$style renders each side's data-side attribute", async (variant) => {
    for (const side of ["top", "bottom", "left"] as const) {
      const sheet = mountSheet(variant, { onClose: () => {}, title: "Menu", side });
      sheet.open(true);
      const panel = await sheet.panel();
      expect(panel.getAttribute("data-side")).toBe(side);
      sheet.open(false);
      panel.dispatchEvent(new Event("animationend"));
      await awaitUnmounted(panel);
    }
  });

  test.each(sheetVariants)("$format/$style carries its side's slide classes from the tailwind and css maps", async (variant) => {
    const sheet = mountSheet(variant, { onClose: () => {}, title: "Menu", side: "left" });
    sheet.open(true);
    const panel = await sheet.panel();
    // The side class is variant-specific: css flavor carries a hashed class,
    // tailwind carries the verbatim slide utilities — both differ from the
    // default right-side render.
    const right = mountSheet(variant, { onClose: () => {}, title: "Menu" });
    right.open(true);
    const rightPanel = await right.panel();
    const panelTokens = (panel.getAttribute("class") ?? "").split(" ").filter((token) => token.length > 0);
    const rightTokens = (rightPanel.getAttribute("class") ?? "").split(" ").filter((token) => token.length > 0);
    const sideTokens = panelTokens.filter((token) => !rightTokens.includes(token));
    expect(sideTokens.length).toBeGreaterThan(0);
    expect(panel.className).not.toBe(rightPanel.className);
  });

  test.each(sheetVariants)("$format/$style closes on Escape by default", async (variant) => {
    const onClose = mock(() => {});
    const sheet = mountSheet(variant, { onClose, title: "Menu" });
    sheet.open(true);
    const panel = await sheet.panel();
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test.each(sheetVariants)("$format/$style closes on pointerdown outside the panel", async (variant) => {
    const onClose = mock(() => {});
    const sheet = mountSheet(variant, { onClose, title: "Menu" });
    sheet.open(true);
    const panel = await sheet.panel();
    document.body.dispatchEvent(new Event("pointerdown"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(panel.isConnected).toBe(true);
  });

  test.each(sheetVariants)("$format/$style suppresses outside pointerdown when closeOnOutside is false", async (variant) => {
    const onClose = mock(() => {});
    const sheet = mountSheet(variant, { onClose, title: "Menu", closeOnOutside: false });
    sheet.open(true);
    await sheet.panel();
    document.body.dispatchEvent(new Event("pointerdown"));
    expect(onClose).not.toHaveBeenCalled();
  });

  test.each(sheetVariants)("$format/$style closes through the built-in close X with its sr-only label", async (variant) => {
    const onClose = mock(() => {});
    const sheet = mountSheet(variant, { onClose, title: "Menu" });
    sheet.open(true);
    const panel = await sheet.panel();
    const close = panel.querySelector('[data-slot="sheet-close"]')!;
    expect(close.tagName).toBe("BUTTON");
    expect(close.querySelector("span")!.textContent).toBe("Close");
    close.dispatchEvent(new Event("click"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test.each(sheetVariants)("$format/$style omits the close button when showCloseButton is false", async (variant) => {
    const sheet = mountSheet(variant, { onClose: () => {}, title: "Menu", showCloseButton: false });
    sheet.open(true);
    const panel = await sheet.panel();
    expect(panel.querySelector('[data-slot="sheet-close"]')).toBeNull();
  });

  test.each(sheetVariants)("$format/$style stays mounted under data-state closed until the panel's animationend", async (variant) => {
    const onClose = mock(() => {});
    const sheet = mountSheet(variant, { onClose, title: "Menu" });
    sheet.open(true);
    const panel = await sheet.panel();
    sheet.open(false);
    expect(panel.getAttribute("data-state")).toBe("closed");
    expect(panel.isConnected).toBe(true);
    panel.dispatchEvent(new Event("animationend"));
    await awaitUnmounted(panel);
  });

  test.each(sheetVariants)("$format/$style unmounts through the fallback budget when no animationend fires", async (variant) => {
    const sheet = mountSheet(variant, { onClose: () => {}, title: "Menu" });
    sheet.open(true);
    const panel = await sheet.panel();
    sheet.open(false);
    const budget = Date.now();
    while (panel.isConnected && Date.now() - budget < 600) {
      await delay(null, 20);
    }
    // Wall clock, not loop iterations: per-iteration lag under load must not read as an early unmount.
    expect(Date.now() - budget).toBeGreaterThanOrEqual(300);
    expect(panel.isConnected).toBe(false);
  });

  test.each(sheetVariants)("$format/$style runs the exit unwired: no dismissal while leaving", async (variant) => {
    const onClose = mock(() => {});
    const sheet = mountSheet(variant, { onClose, title: "Menu" });
    sheet.open(true);
    const panel = await sheet.panel();
    sheet.open(false);
    expect(panel.getAttribute("data-state")).toBe("closed");
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    document.body.dispatchEvent(new Event("pointerdown"));
    expect(onClose).not.toHaveBeenCalled();
    panel.dispatchEvent(new Event("animationend"));
    await awaitUnmounted(panel);
  });

  test.each(sheetVariants)("$format/$style forwards user attrs onto the portaled panel across all four variants", async (variant) => {
    const sheet = mountSheet(variant, { onClose: () => {}, title: "Forward", "aria-label": "panel" });
    sheet.open(true);
    const panel = await sheet.panel();
    expect(panel.getAttribute("aria-label")).toBe("panel");
  });

  test.each(sheetVariants)("$format/$style fires a user on:click handler on the portaled panel across all four variants", async (variant) => {
    const onPanelClick = mock(() => {});
    const sheet = mountSheet(variant, { onClose: () => {}, title: "Forward", "on:click": onPanelClick });
    sheet.open(true);
    const panel = await sheet.panel();
    panel.dispatchEvent(new Event("click"));
    expect(onPanelClick).toHaveBeenCalledTimes(1);
  });

  test.each(sheetVariants)("$format/$style merges a user class into the portaled panel's class across all four variants", async (variant) => {
    const sheet = mountSheet(variant, { onClose: () => {}, title: "Forward", class: "user-class" });
    sheet.open(true);
    const panel = await sheet.panel();
    expect(classTokens(panel).at(-1)).toBe("user-class");
  });

  test.each(sheetPartVariants.filter((entry) => entry.part === "Close"))("$format/$style Close chains a user on:click with its owned dismiss", (variant) => {
    const onClose = mock(() => {});
    const userClick = mock(() => {});
    const close = renderPart(variant, [], { onClose, "on:click": userClick });
    close.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test.each(sheetPartVariants.filter((entry) => entry.part === "Content"))("$format/$style content part forwards the manual aria wiring attrs", (variant) => {
    const el = renderPart(variant, [], { "aria-labelledby": "wired-title" });
    expect(el.getAttribute("aria-labelledby")).toBe("wired-title");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(
      sheetVariants,
      { open: () => true, onClose: () => {}, title: "Parity" },
      ["aria-labelledby", "id"],
    );
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of sheetPartVariants) {
      if (variant.part === "Portal") continue; // portals its children into body — covered by the alert-dialog Portal test
      const el = renderPart(variant);
      if (variant.part === "Content") {
        expect(el.getAttribute("data-slot")).toBe("sheet-content");
        expect(el.getAttribute("role")).toBe("dialog");
      } else if (variant.part === "Title") {
        expect(el.getAttribute("data-slot")).toBe("sheet-title");
        expect(el.tagName).toBe("H2");
      } else if (variant.part === "Description") {
        expect(el.getAttribute("data-slot")).toBe("sheet-description");
        expect(el.tagName).toBe("P");
      } else if (variant.part === "Close") {
        expect(el.getAttribute("data-slot")).toBe("sheet-close");
        expect(el.tagName).toBe("BUTTON");
      } else if (variant.part === "Trigger") {
        expect(el.getAttribute("data-slot")).toBe("sheet-trigger");
        expect(el.tagName).toBe("BUTTON");
      } else {
        expect(el.getAttribute("data-slot")).toBe(`sheet-${variant.part.toLowerCase()}`);
      }
    }
  });

  test("portals the Portal part's children into document.body", () => {
    for (const variant of sheetPartVariants) {
      if (variant.part !== "Portal") continue;
      renderPart(variant, [html`<span data-slot="sheet-portal-probe"></span>`]);
      expect(document.querySelector('[data-slot="sheet-portal-probe"]')).not.toBeNull();
    }
  });
});

/**
 * Renders one sheet part and resolves its mounted root. The Portal part
 * resolves to the wrapper (its children land in document.body) — the dedicated
 * Portal test above asserts the portaled child instead.
 */
function renderPart(variant: (typeof sheetPartVariants)[number], children?: ReturnType<typeof html>[], extra: Record<string, unknown> = {}): Element {
  const container = setupContainer();
  const rendered = variant.render({ children: children ?? [], ...extra } as unknown as Record<string, never>);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
  return container.firstElementChild!;
}
