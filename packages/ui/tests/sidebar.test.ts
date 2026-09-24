import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount and the component's Portal/hover wiring share one dom instance.
import { html, mount, peekState, resetDom } from "@hellajs/dom";
import {
  assertStructuralParity,
  awaitWiring,
  sidebarModuleVariants,
  sidebarPartVariants,
  sidebarVariants,
} from "./helpers/variants";
import { sidebarModulePart } from "./helpers/variants";
import type { SidebarModuleVariant, SidebarPartVariantProps, SidebarThreadedState, SidebarVariantProps } from "./helpers/variants";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";
import { pointerEnter } from "./helpers/anchored";

beforeEach(() => {
  resetTestState();
  // resetTestState resets the @hellajs/dom/bundle instance; the compiled registry
  // components import the bare specifier, whose shared hoverIntent clock and layer
  // stack need the bare instance's own reset.
  resetDom();
  installMediaStub();
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

/** Controllable matchMedia stub - the provider wires its max-width listener through this. */
let mediaMatches = false;
let mediaListeners: ((event: { matches: boolean }) => void)[] = [];
const originalMatchMedia = window.matchMedia;

function installMediaStub(): void {
  mediaMatches = false;
  mediaListeners = [];
  window.matchMedia = ((query: string) => ({
    get matches() {
      return mediaMatches;
    },
    media: query,
    addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
      mediaListeners.push(listener);
    },
    removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
      mediaListeners = mediaListeners.filter((registered) => registered !== listener);
    },
  })) as typeof window.matchMedia;
}

/** Flips the stubbed media query and notifies the wired listeners. */
function flipMedia(matches: boolean): void {
  mediaMatches = matches;
  const event = { matches };
  for (const listener of [...mediaListeners]) listener(event);
}

/** camelCase part name to its kebab data-slot suffix (GroupLabel → group-label). */
function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Mounts a provider flavor whose children function composes the sidebar root,
 * a trigger, and a rail from the same flavor's module, threading the provider
 * state; resolves the wrapper once wired and captures the threaded state.
 */
async function mountComposed(variant: SidebarModuleVariant): Promise<{ wrapper: HTMLElement; state: SidebarThreadedState }> {
  const { mod, format } = variant;
  const container = setupContainer();
  let state: SidebarThreadedState | undefined;
  let wrapper: HTMLElement;
  if (format === "html") {
    const ComposedProvider = mod.SidebarProvider;
    const ComposedSidebar = mod.Sidebar;
    const ComposedContent = mod.SidebarContent;
    const ComposedTrigger = mod.SidebarTrigger;
    // The embedded-tag idiom inside a static root: a render-fn array member
    // stringifies through the runtime child slot (resolveValue unwraps
    // exactly one level), so html compositions template their parts.
    mount(html`<${ComposedProvider}>${(threaded: SidebarThreadedState) => {
      state = threaded;
      return html`<div class="composed">
        <${ComposedSidebar} open=${threaded.open} mobile=${threaded.mobile} openMobile=${threaded.openMobile} onOpenMobileChange=${threaded.setOpenMobile}><${ComposedContent}>Content</${ComposedContent}></${ComposedSidebar}>
        <${ComposedTrigger} onToggle=${threaded.onToggle} />
      </div>`;
    }}</${ComposedProvider}>`, container);
    wrapper = container.querySelector("[data-slot=sidebar-wrapper]") as HTMLElement;
  } else {
    const Provider = sidebarModulePart<{ children: (state: SidebarThreadedState) => HellaChildren }>(variant, "SidebarProvider");
    const Root = sidebarModulePart<SidebarVariantProps>(variant, "Sidebar");
    const Content = sidebarModulePart<{ children?: HellaChildren }>(variant, "SidebarContent");
    const Trigger = sidebarModulePart<{ onToggle?: () => void }>(variant, "SidebarTrigger");
    const rendered = Provider({
      children: (threaded: SidebarThreadedState) => {
        state = threaded;
        return [
          Root({
            open: threaded.open,
            mobile: threaded.mobile,
            openMobile: threaded.openMobile,
            onOpenMobileChange: threaded.setOpenMobile,
            children: [Content({ children: [] })],
          }),
          Trigger({ onToggle: threaded.onToggle }),
        ];
      },
    });
    mount(typeof rendered === "function" ? html`<div>${rendered}</div>` : rendered, container);
    wrapper = container.firstElementChild as HTMLElement;
  }
  await awaitWiring(wrapper);
  return { wrapper, state: state! };
}

/** Polls (microtask hops) until a mobile panel exists and finished its mount walk. */
async function awaitMobilePanel(): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const panel = document.querySelector('[data-slot="sidebar"][data-mobile="true"]');
    if (panel !== null && peekState(panel)?.isMounted) return panel as HTMLElement;
    await delay();
  }
  throw new Error("mobile sidebar panel never mounted");
}

describe("sidebar", () => {
  test.each(sidebarModuleVariants)("$format/$style provider renders the wrapper carrying the width variables", async (variant) => {
    const { wrapper } = await mountComposed(variant);
    expect(wrapper.getAttribute("data-slot")).toBe("sidebar-wrapper");
    expect(wrapper.getAttribute("style")).toBe("--sidebar-width: 16rem; --sidebar-width-icon: 3rem");
  });

  test.each(sidebarModuleVariants)("$format/$style toggles open through the wired trigger", async (variant) => {
    const { wrapper, state } = await mountComposed(variant);
    const root = wrapper.querySelector('[data-slot="sidebar"]')!;
    expect(root.getAttribute("data-state")).toBe("expanded");
    wrapper.querySelector('[data-slot="sidebar-trigger"]')!.dispatchEvent(new Event("click"));
    await delay();
    expect(state.open()).toBe(false);
    expect(root.getAttribute("data-state")).toBe("collapsed");
  });

  test.each(sidebarModuleVariants)("$format/$style reports controlled flips without writing internal state", async (variant) => {
    const { mod, format } = variant;
    const controlled = signal(true);
    const onOpenChange = mock(() => {});
    const container = setupContainer();
    const Trigger = sidebarModulePart<{ onToggle?: () => void }>(variant, "SidebarTrigger");
    const Provider = sidebarModulePart<{ open?: () => boolean; onOpenChange?: (open: boolean) => void; children: (state: SidebarThreadedState) => HellaChildren }>(variant, "SidebarProvider");
    const children = (state: SidebarThreadedState) =>
      format === "html"
        ? html`<${mod.SidebarTrigger} onToggle=${state.onToggle} />`
        : [Trigger({ onToggle: state.onToggle })];
    const rendered = Provider({
      open: () => controlled(),
      onOpenChange,
      children,
    });
    mount(typeof rendered === "function" ? html`<div>${rendered}</div>` : rendered, container);
    const wrapper = container.querySelector("[data-slot=sidebar-wrapper]") as HTMLElement;
    await awaitWiring(wrapper);
    wrapper.querySelector('[data-slot="sidebar-trigger"]')!.dispatchEvent(new Event("click"));
    await delay();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(controlled()).toBe(true);
  });

  test.each(sidebarModuleVariants)("$format/$style toggles through Ctrl/Cmd+B and ignores bare B", async (variant) => {
    const { state } = await mountComposed(variant);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true }));
    await delay();
    expect(state.open()).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", metaKey: true }));
    await delay();
    expect(state.open()).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    await delay();
    expect(state.open()).toBe(true);
  });

  test.each(sidebarModuleVariants)("$format/$style media flip switches the sidebar into sheet mode with an overlay on open", async (variant) => {
    const { state } = await mountComposed(variant);
    expect(document.querySelector('[data-slot="sidebar"][data-mobile="true"]')).toBeNull();
    flipMedia(true);
    await delay();
    state.setOpenMobile(true);
    await delay();
    const panel = await awaitMobilePanel();
    expect(panel.parentElement).toBe(document.body);
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    const overlay = panel.previousElementSibling!;
    expect(overlay.getAttribute("data-slot")).toBe("sidebar-overlay");
    expect(overlay.getAttribute("data-state")).toBe("open");
    const titleId = panel.getAttribute("aria-labelledby")!;
    expect(panel.querySelector(`#${titleId}`)!.textContent).toBe("Sidebar");
  });

  test.each(sidebarModuleVariants)("$format/$style mobile sheet closes through escape", async (variant) => {
    const { state } = await mountComposed(variant);
    flipMedia(true);
    await delay();
    state.setOpenMobile(true);
    const panel = await awaitMobilePanel();
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await delay();
    expect(state.openMobile()).toBe(false);
  });

  test.each(sidebarModuleVariants)("$format/$style mobile sheet exit holds then unmounts through animationend", async (variant) => {
    const { state } = await mountComposed(variant);
    flipMedia(true);
    await delay();
    state.setOpenMobile(true);
    const panel = await awaitMobilePanel();
    state.setOpenMobile(false);
    await delay();
    // The exit runs under data-state="closed" with the panel held mounted
    // until its animationend (the still-pending fallback timer gets cleared).
    expect(panel.getAttribute("data-state")).toBe("closed");
    expect(panel.isConnected).toBe(true);
    panel.dispatchEvent(new Event("animationend"));
    for (let i = 0; i < 50 && panel.isConnected; i++) await delay();
    expect(panel.isConnected).toBe(false);
  });

  test.each(sidebarModuleVariants)("$format/$style mobile sheet unmounts through the fallback budget when no animationend fires", async (variant) => {
    const { state } = await mountComposed(variant);
    flipMedia(true);
    await delay();
    state.setOpenMobile(true);
    const panel = await awaitMobilePanel();
    state.setOpenMobile(false);
    let waited = 0;
    while (panel.isConnected && waited < 500) {
      await delay(null, 20);
      waited += 20;
    }
    expect(waited).toBeGreaterThanOrEqual(300);
    expect(panel.isConnected).toBe(false);
  });

  test.each(sidebarModuleVariants)("$format/$style unmounts the wrapper and drains its listener teardown", async (variant) => {
    const Provider = sidebarModulePart<{ children: (state: SidebarThreadedState) => HellaChildren }>(variant, "SidebarProvider");
    const container = setupContainer();
    const rendered = Provider({ children: () => [] });
    const handle = mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
    const wrapper = container.querySelector("[data-slot=sidebar-wrapper]") as HTMLElement;
    await awaitWiring(wrapper);
    handle.unmount();
    for (let i = 0; i < 50 && wrapper.isConnected; i++) await delay();
    expect(wrapper.isConnected).toBe(false);
  });

  test.each(sidebarVariants)("$format/$style renders the desktop tree with state, side, and variant attributes", (variant) => {
    const root = renderSidebarRoot(variant, { open: () => true, side: "right", variant: "floating" });
    expect(root.getAttribute("data-slot")).toBe("sidebar");
    expect(root.getAttribute("data-state")).toBe("expanded");
    expect(root.getAttribute("data-variant")).toBe("floating");
    expect(root.getAttribute("data-side")).toBe("right");
    expect(root.getAttribute("data-collapsible")).toBeNull();
    expect(root.querySelector('[data-slot="sidebar-gap"]')).not.toBeNull();
    const container = root.querySelector('[data-slot="sidebar-container"]')!;
    expect(container.querySelector('[data-slot="sidebar-inner"]')).not.toBeNull();
  });

  test.each(sidebarVariants)("$format/$style emits the collapsible mode only while collapsed", (variant) => {
    const collapsed = renderSidebarRoot(variant, { open: () => false, collapsible: "icon" });
    expect(collapsed.getAttribute("data-state")).toBe("collapsed");
    expect(collapsed.getAttribute("data-collapsible")).toBe("icon");
    const offcanvas = renderSidebarRoot(variant, { open: () => false, collapsible: "offcanvas" });
    expect(offcanvas.getAttribute("data-collapsible")).toBe("offcanvas");
    const none = renderSidebarRoot(variant, { open: () => false, collapsible: "none" });
    expect(none.getAttribute("data-collapsible")).toBeNull();
    expect(none.querySelector('[data-slot="sidebar-container"]')).toBeNull();
  });

  test.each(sidebarVariants)("$format/$style carries its variant's container class set", (variant) => {
    const plain = renderSidebarRoot(variant, { variant: "sidebar" }).querySelector('[data-slot="sidebar-container"]')!;
    const floating = renderSidebarRoot(variant, { variant: "floating" }).querySelector('[data-slot="sidebar-container"]')!;
    const inset = renderSidebarRoot(variant, { variant: "inset" }).querySelector('[data-slot="sidebar-container"]')!;
    // The css flavor forks the variant rules through data-variant attribute
    // selectors (identical class set); the tailwind flavor forks the classes.
    if (variant.style === "tailwind") {
      const plainTokens = new Set((plain.getAttribute("class") ?? "").split(" "));
      expect(plainTokens.has("group-data-[side=left]:border-r")).toBe(true);
      expect(floating.getAttribute("class")).not.toBe(plain.getAttribute("class"));
      expect(inset.getAttribute("class")).not.toBe(plain.getAttribute("class"));
    } else {
      expect(floating.getAttribute("class")).toBe(plain.getAttribute("class"));
    }
  });

  test.each(sidebarModuleVariants)("$format/$style renders the full menu nesting with data-slots", async (variant) => {
    const part = <P extends object>(name: string): ((props: P) => HellaNode) => sidebarModulePart<P>(variant, name);
    const container = setupContainer();
    const rendered = part<SidebarVariantProps>("Sidebar")({
      children: [
        part<SidebarPartVariantProps>("SidebarGroup")({
          children: [
            part<SidebarPartVariantProps>("SidebarGroupLabel")({ children: "Application" }) as HellaChild,
            part<SidebarPartVariantProps>("SidebarGroupContent")({
              children: [
                part<SidebarPartVariantProps>("SidebarMenu")({
                  children: [
                    part<SidebarPartVariantProps>("SidebarMenuItem")({
                      children: [
                        part<SidebarPartVariantProps>("SidebarMenuButton")({ active: true, tooltip: "Home", children: "Home" }) as HellaChild,
                        part<SidebarPartVariantProps>("SidebarMenuAction")({ children: "More" }) as HellaChild,
                        part<SidebarPartVariantProps>("SidebarMenuBadge")({ children: "3" }) as HellaChild,
                        part<SidebarPartVariantProps>("SidebarMenuSub")({
                          children: [
                            part<SidebarPartVariantProps>("SidebarMenuSubItem")({
                              children: [part<SidebarPartVariantProps>("SidebarMenuSubButton")({ active: true, href: "/home", children: "Overview" }) as HellaChild],
                            }) as HellaChild,
                          ],
                        }) as HellaChild,
                      ],
                    }) as HellaChild,
                  ],
                }) as HellaChild,
              ],
            }) as HellaChild,
          ],
        }) as HellaChild,
      ],
    });
    mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
    const root = container.firstElementChild as HTMLElement;
    const bySlot = (slot: string): Element => root.querySelector(`[data-slot="${slot}"]`)!;
    for (const slot of ["sidebar-group", "sidebar-group-label", "sidebar-group-content", "sidebar-menu", "sidebar-menu-item", "sidebar-menu-button", "sidebar-menu-action", "sidebar-menu-badge", "sidebar-menu-sub", "sidebar-menu-sub-item", "sidebar-menu-sub-button"]) {
      expect(bySlot(slot)).not.toBeNull();
    }
    const button = bySlot("sidebar-menu-button")!;
    expect(button.getAttribute("data-active")).toBe("true");
    expect(button.getAttribute("data-size")).toBe("default");
    expect(button.closest('[data-slot="sidebar-menu-tooltip"]')).not.toBeNull();
    // The icon-mode square/translate utilities ride the button's base map in
    // the tailwind flavor (the css flavor forks them through data-collapsible
    // attribute rules instead - its class set is variant-invariant).
    if (variant.style === "tailwind") {
      expect((button.getAttribute("class") ?? "").split(" ")).toContain("group-data-[collapsible=icon]:size-8!");
    }
    const badge = bySlot("sidebar-menu-badge")!;
    expect(badge.getAttribute("data-sidebar")).toBe("menu-badge");
    expect(badge.textContent).toBe("3");
    const subButton = bySlot("sidebar-menu-sub-button") as HTMLAnchorElement;
    expect(subButton.getAttribute("href")).toBe("/home");
    expect(subButton.getAttribute("data-active")).toBe("true");
    expect(subButton.getAttribute("data-size")).toBe("md");
  });

  test.each(sidebarModuleVariants)("$format/$style menu action fires its onclick through the button path", (variant) => {
    const part = <P extends object>(name: string): ((props: P) => HellaNode) => sidebarModulePart<P>(variant, name);
    const onClick = mock(() => {});
    const container = setupContainer();
    const rendered = part<SidebarPartVariantProps>("SidebarMenuItem")({
      children: [part<SidebarPartVariantProps>("SidebarMenuAction")({ onclick: onClick, children: "More" })],
    });
    mount(typeof rendered === "function" ? html`<div>${rendered}</div>` : rendered, container);
    const action = container.querySelector('[data-slot="sidebar-menu-action"]') as HTMLElement;
    expect(action.getAttribute("data-show-on-hover")).toBeNull();
    action.dispatchEvent(new Event("click"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test.each(sidebarModuleVariants)("$format/$style menu action carries the hover marker only when showOnHover", (variant) => {
    const part = <P extends object>(name: string): ((props: P) => HellaNode) => sidebarModulePart<P>(variant, name);
    const container = setupContainer();
    const rendered = part<SidebarPartVariantProps>("SidebarMenuAction")({ showOnHover: true });
    mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
    const hover = container.querySelector('[data-slot="sidebar-menu-action"]')!;
    expect(hover.getAttribute("data-show-on-hover")).toBe("true");
  });

  test.each(sidebarModuleVariants)("$format/$style skeleton renders a bounded random text width and optional icon", (variant) => {
    const Skeleton = sidebarModulePart<SidebarPartVariantProps>(variant, "SidebarMenuSkeleton");
    const container = setupContainer();
    const bare = Skeleton({});
    mount(typeof bare === "function" ? html`<div>${bare as never}</div>` : bare as never, container);
    const row = container.querySelector('[data-slot="sidebar-menu-skeleton"]') as HTMLElement;
    expect(row.querySelectorAll('[data-sidebar="menu-skeleton-icon"]').length).toBe(0);
    const withIcon = Skeleton({ showIcon: true });
    const container2 = setupContainer();
    mount(typeof withIcon === "function" ? html`<div>${withIcon as never}</div>` : withIcon as never, container2);
    const iconRow = container2.querySelector('[data-slot="sidebar-menu-skeleton"]') as HTMLElement;
    expect(iconRow.querySelector('[data-sidebar="menu-skeleton-icon"]')).not.toBeNull();
    const text = iconRow.querySelector('[data-sidebar="menu-skeleton-text"]') as HTMLElement;
    const width = Number((text.getAttribute("style") ?? "").match(/--skeleton-width: (\d+)%/)?.[1]);
    expect(width).toBeGreaterThanOrEqual(50);
    expect(width).toBeLessThanOrEqual(90);
  });

  test.each(sidebarModuleVariants)("$format/$style tooltip renders on hover while collapsed and hides expanded or mobile", async (variant) => {
    const part = <P extends object>(name: string): ((props: P) => HellaNode) => sidebarModulePart<P>(variant, name);
    const unmounts: (() => void)[] = [];
    const hoverButton = (open: () => boolean, mobile?: () => boolean): Promise<Element> => {
      const button = part<SidebarPartVariantProps>("SidebarMenuButton")({ tooltip: "Home", open, mobile });
      const container = setupContainer();
      const handle = mount(typeof button === "function" ? html`<div>${button as never}</div>` : button as never, container);
      unmounts.push(() => handle.unmount());
      const trigger = container.querySelector('[data-slot="sidebar-menu-tooltip"]') as HTMLElement;
      const contentId = trigger.getAttribute("aria-describedby")!;
      pointerEnter(trigger);
      return (async () => {
        for (let i = 0; i < 50; i++) {
          const found = document.getElementById(contentId);
          if (found !== null && peekState(found)?.isMounted) return found;
          // hoverIntent schedules its open through a setTimeout(0) macrotask -
          // microtask hops never drain the timer queue.
          await delay(0);
        }
        throw new Error("sidebar tooltip never mounted");
      })();
    };

    const collapsed = await hoverButton(() => false);
    expect(collapsed.getAttribute("data-slot")).toBe("sidebar-tooltip-content");
    expect(collapsed.getAttribute("data-state")).toBe("open");
    expect(collapsed.hasAttribute("hidden")).toBe(false);
    expect(collapsed.textContent).toBe("Home");

    const expanded = await hoverButton(() => true);
    expect(expanded.hasAttribute("hidden")).toBe(true);

    const mobileView = await hoverButton(() => false, () => true);
    expect(mobileView.hasAttribute("hidden")).toBe(true);

    // Unmounting drains each trigger's hoverIntent disposal.
    for (const unmount of unmounts) unmount();
    await delay();
  });

  test.each(sidebarModuleVariants)("$format/$style inset, header, footer, separator, and input compose", (variant) => {
    const part = <P extends object>(name: string): ((props: P) => HellaNode) => sidebarModulePart<P>(variant, name);
    const container = setupContainer();
    const rendered = part<SidebarPartVariantProps>("SidebarInset")({
      children: [
        part<SidebarPartVariantProps>("SidebarHeader")({ children: "Header" }) as HellaChild,
        part<SidebarPartVariantProps>("SidebarFooter")({ children: "Footer" }) as HellaChild,
        part<SidebarPartVariantProps>("SidebarSeparator")({}) as HellaChild,
        part<SidebarPartVariantProps>("SidebarInput")({ placeholder: "Search" }) as HellaChild,
      ],
    });
    mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
    const inset = container.firstElementChild as HTMLElement;
    expect(inset.tagName).toBe("MAIN");
    expect(inset.getAttribute("data-slot")).toBe("sidebar-inset");
    const header = inset.querySelector('[data-slot="sidebar-header"]')!;
    expect(header.getAttribute("data-sidebar")).toBe("header");
    expect(inset.querySelector('[data-slot="sidebar-footer"]')!.textContent).toBe("Footer");
    const separator = inset.querySelector('[data-slot="sidebar-separator"]')!;
    expect(separator.getAttribute("role")).toBe("separator");
    expect(separator.getAttribute("data-sidebar")).toBe("separator");
    const input = inset.querySelector('[data-slot="sidebar-input"]') as HTMLInputElement;
    expect(input.getAttribute("data-sidebar")).toBe("input");
    expect(input.getAttribute("placeholder")).toBe("Search");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(sidebarVariants, { open: () => true, side: "left" });
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of sidebarPartVariants) {
      const el = renderPart(variant);
      const expected = variant.part === "Provider" ? "sidebar-wrapper" : `sidebar-${kebab(variant.part)}`;
      expect(el.getAttribute("data-slot")).toBe(expected);
    }
  });
});

/** Renders one sidebar part standalone (the Provider receives a children function). */
function renderPart(variant: (typeof sidebarPartVariants)[number]): Element {
  const props = variant.part === "Provider"
    ? { children: () => [] }
    : { children: [] };
  const container = setupContainer();
  const rendered = variant.render(props as never);
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
  return container.querySelector('[data-slot]')!;
}

/**
 * Mounts a sidebar root flavor and resolves its desktop root - html flavors
 * return a reactive fn (an only-dynamic template), so the root resolves by
 * data-slot rather than container position.
 */
function renderSidebarRoot(variant: (typeof sidebarVariants)[number], props: SidebarVariantProps): HTMLElement {
  const container = setupContainer();
  const rendered = variant.render(props);
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered as never, container);
  return container.querySelector('[data-slot="sidebar"]:not([data-mobile="true"])') as HTMLElement;
}
