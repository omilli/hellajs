import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount and the component's hook wiring share one dom instance.
import { html, mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  tabsPartVariants,
  tabsVariants,
} from "./helpers/variants";
import type { TabsVariant, TabsVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

const items: TabsVariantProps["items"] = [
  { id: "alpha", label: "Alpha", content: "Alpha panel" },
  { id: "beta", label: "Beta", content: "Beta panel" },
  { id: "gamma", label: "Gamma", content: "Gamma panel" },
];

interface MountedTabs {
  root: HTMLElement;
  tablist: HTMLElement;
  tabs: HTMLElement[];
  panels: HTMLElement[];
}

/** Mounts a tabs variant into a fresh container and resolves the tabs root, its tablist, tabs, and inner panels. */
function mountTabs(variant: TabsVariant, props: TabsVariantProps): MountedTabs {
  const container = setupContainer();
  const rendered = variant.render(props);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
  const root = container.firstElementChild as HTMLElement;
  const tablist = root.querySelector('[role="tablist"]') as HTMLElement;
  const tabs = Array.from(root.querySelectorAll('[role="tab"]')) as HTMLElement[];
  const panels = Array.from(root.querySelectorAll('[role="tabpanel"]')) as HTMLElement[];
  return { root, tablist, tabs, panels };
}

/** Polls (microtask hops) until the observer-driven mount walk has wired the tabs root's afterMount hooks. */
async function awaitWiring(root: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(root)?.isMounted) return;
    await delay();
  }
  expect(peekState(root)?.isMounted).toBe(true);
}

/** Dispatches a bubbling keydown at a tab; rovingTabIndex listens on the tablist ancestor. */
function press(tab: HTMLElement, key: string): void {
  tab.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("tabs", () => {
  test.each(tabsVariants)("$format/$style nests the tablist and panels inside the orientation-carrying root", async (variant) => {
    const { root, tablist, panels } = mountTabs(variant, { items, initialId: "beta" });
    await awaitWiring(root);
    expect(root.getAttribute("data-slot")).toBe("tabs");
    expect(root.getAttribute("data-orientation")).toBe("horizontal");
    expect(tablist.getAttribute("data-orientation")).toBe("horizontal");
    expect(tablist.parentElement).toBe(root);
    for (const panel of panels) expect(panel.parentElement).toBe(root);
  });

  test.each(tabsVariants)("$format/$style renders the initialId panel visible with data-state and aria-selected only on its tab", async (variant) => {
    const { root, tabs, panels } = mountTabs(variant, { items, initialId: "beta" });
    await awaitWiring(root);
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
    expect(tabs.map((tab) => tab.getAttribute("data-state"))).toEqual(["inactive", "active", "inactive"]);
    expect(panels.map((panel) => panel.getAttribute("data-state"))).toEqual(["inactive", "active", "inactive"]);
    expect(panels[0]!.hasAttribute("hidden")).toBe(true);
    expect(panels[1]!.hasAttribute("hidden")).toBe(false);
    expect(panels[2]!.hasAttribute("hidden")).toBe(true);
  });

  test.each(tabsVariants)("$format/$style selects an inactive tab on click, swapping panel visibility and roving tabindex", async (variant) => {
    const { root, tabs, panels } = mountTabs(variant, { items });
    await awaitWiring(root);
    expect(tabs[0]!.getAttribute("data-state")).toBe("active");
    tabs[2]!.dispatchEvent(new Event("click"));
    expect(tabs[2]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs[2]!.getAttribute("data-state")).toBe("active");
    expect(tabs[0]!.getAttribute("data-state")).toBe("inactive");
    expect(panels[2]!.hasAttribute("hidden")).toBe(false);
    expect(panels[0]!.hasAttribute("hidden")).toBe(true);
    expect(tabs[2]!.tabIndex).toBe(0);
    expect(tabs[0]!.tabIndex).toBe(-1);
  });

  test.each(tabsVariants)("$format/$style styles the pill list by default and the line list at variant line", async (variant) => {
    const pill = mountTabs(variant, { items });
    await awaitWiring(pill.root);
    expect(pill.tablist.getAttribute("data-variant")).toBe("default");
    if (variant.style === "css") {
      expect(classTokens(pill.tablist).some((token) => token.startsWith("h-hella-tabs-list-default"))).toBe(true);
    } else {
      expect(classTokens(pill.tablist)).toContain("bg-muted");
    }
    expect(pill.tabs.map((tab) => tab.getAttribute("data-variant"))).toEqual(["default", "default", "default"]);
    const line = mountTabs(variant, { items, variant: "line" });
    await awaitWiring(line.root);
    expect(line.tablist.getAttribute("data-variant")).toBe("line");
    const tokens = classTokens(line.tablist);
    if (variant.style === "css") {
      expect(tokens.some((token) => token.startsWith("h-hella-tabs-list-line"))).toBe(true);
    } else {
      expect(tokens).toContain("gap-1");
      expect(tokens).toContain("bg-transparent");
      expect(tokens).not.toContain("bg-muted");
    }
  });

  test.each(tabsVariants)("$format/$style keeps the aria-controls, panel id, and aria-labelledby cycle consistent", async (variant) => {
    const { root, tablist, tabs, panels } = mountTabs(variant, { items });
    await awaitWiring(root);
    expect(tablist.getAttribute("role")).toBe("tablist");
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      expect(tabs[i]!.getAttribute("role")).toBe("tab");
      expect(tabs[i]!.id).toBe(`hella-tabs-tab-${item.id}`);
      expect(tabs[i]!.getAttribute("aria-controls")).toBe(`hella-tabs-panel-${item.id}`);
      expect(tabs[i]!.textContent).toBe(item.label);
      expect(panels[i]!.getAttribute("role")).toBe("tabpanel");
      expect(panels[i]!.id).toBe(`hella-tabs-panel-${item.id}`);
      expect(panels[i]!.getAttribute("aria-labelledby")).toBe(`hella-tabs-tab-${item.id}`);
    }
  });

  test.each(tabsVariants)("$format/$style moves focus and selection together across arrows, wraps, and jumps to the ends", async (variant) => {
    const { root, tabs, panels } = mountTabs(variant, { items, initialId: "alpha" });
    await awaitWiring(root);
    tabs[1]!.focus();
    press(tabs[1]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs[2]!);
    expect(panels[2]!.hasAttribute("hidden")).toBe(false);
    expect(panels[1]!.hasAttribute("hidden")).toBe(true);
    expect(tabs[2]!.getAttribute("aria-selected")).toBe("true");
    press(tabs[2]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs[0]!);
    press(tabs[0]!, "ArrowLeft");
    expect(document.activeElement).toBe(tabs[2]!);
    press(tabs[2]!, "Home");
    expect(document.activeElement).toBe(tabs[0]!);
    expect(panels[0]!.hasAttribute("hidden")).toBe(false);
    press(tabs[0]!, "End");
    expect(document.activeElement).toBe(tabs[2]!);
    expect(panels[2]!.hasAttribute("hidden")).toBe(false);
  });

  test.each(tabsVariants)("$format/$style carries the vertical orientation onto the root, list, and triggers", async (variant) => {
    const { root, tablist, tabs } = mountTabs(variant, { items, orientation: "vertical" });
    await awaitWiring(root);
    expect(root.getAttribute("data-orientation")).toBe("vertical");
    expect(tablist.getAttribute("data-orientation")).toBe("vertical");
    expect(tabs.map((tab) => tab.getAttribute("data-orientation"))).toEqual(["vertical", "vertical", "vertical"]);
  });

  test.each(tabsVariants)("$format/$style re-renders a getter content on signal change without rebuilding the tablist", async (variant) => {
    const count = signal(0);
    const reactiveItems: TabsVariantProps["items"] = [
      { id: "static", label: "Static", content: "Static panel" },
      { id: "count", label: "Count", content: () => `Count is ${count()}` },
    ];
    const { root, tablist, tabs, panels } = mountTabs(variant, { items: reactiveItems });
    await awaitWiring(root);
    const tabNode = tabs[1]!;
    const countPanel = panels[1]!;
    expect(countPanel.textContent).toBe("Count is 0");
    count(1);
    flush();
    expect(countPanel.textContent).toBe("Count is 1");
    expect(countPanel.hasAttribute("hidden")).toBe(true);
    expect(root.contains(tablist)).toBe(true);
    expect(root.contains(tabNode)).toBe(true);
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(tabsVariants, { items });
  });

  test("renders every named part with its role and data-slot across all four variants", () => {
    for (const variant of tabsPartVariants) {
      const el = renderPart(variant);
      if (variant.part === "List") {
        expect(el.getAttribute("role")).toBe("tablist");
        expect(el.getAttribute("data-slot")).toBe("tabs-list");
      } else if (variant.part === "Trigger") {
        expect(el.getAttribute("role")).toBe("tab");
        expect(el.getAttribute("data-slot")).toBe("tabs-trigger");
        expect(el.getAttribute("data-state")).toBe("inactive");
      } else {
        expect(el.getAttribute("role")).toBe("tabpanel");
        expect(el.getAttribute("data-slot")).toBe("tabs-content");
      }
    }
  });
});

/** Renders one tabs part and resolves its mounted root. */
function renderPart(variant: (typeof tabsPartVariants)[number]): Element {
  const container = setupContainer();
  const props: Record<string, unknown> = { children: [] };
  if (variant.part === "Trigger") {
    props.active = () => false;
    props.children = "Label";
  }
  const rendered = variant.render(props as never);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
  return container.firstElementChild!;
}
