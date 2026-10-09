import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  breadcrumbPartVariants,
  classTokens,
  breadcrumbVariants,
  dropdownMenuVariants,
  renderVariant,
  type ComponentVariant,
  type BreadcrumbVariantProps,
} from "./helpers/variants";
import { awaitPortaled } from "./helpers/anchored";

beforeEach(() => {
  resetTestState();
});

/** Resolves one compiled Breadcrumb part (full export name) at the variant's flavor. */
function part(variant: ComponentVariant<BreadcrumbVariantProps>, name: string, props: Record<string, unknown> = {}): HellaNode {
  const found = breadcrumbPartVariants.find(
    (candidate) => candidate.part === name && candidate.style === variant.style && candidate.format === variant.format,
  )!;
  return (found.render as unknown as (bag: Record<string, unknown>) => HellaNode)(props);
}

describe("breadcrumb", () => {
  test.each(breadcrumbVariants)("$format/$style renders the full trail structure with separators", (variant) => {
    const nav = renderVariant(variant, {
      children: [part(variant, "List", {
        children: [
          part(variant, "Item", { children: [part(variant, "Link", { href: "/", children: ["Home"] })] }),
          part(variant, "Separator"),
          part(variant, "Item", { children: [part(variant, "Link", { href: "/components", children: ["Components"] })] }),
          part(variant, "Separator"),
          part(variant, "Item", { children: [part(variant, "Page", { children: ["Breadcrumb"] })] }),
        ],
      })],
    }) as HTMLElement;
    expect(nav.getAttribute("data-slot")).toBe("breadcrumb");
    expect(nav.getAttribute("aria-label")).toBe("breadcrumb");
    const list = nav.querySelector("[data-slot='breadcrumb-list']")!;
    expect(list.tagName).toBe("OL");
    const items = [...list.querySelectorAll("[data-slot='breadcrumb-item']")];
    expect(items).toHaveLength(3);
    const separators = [...list.querySelectorAll("[data-slot='breadcrumb-separator']")];
    expect(separators).toHaveLength(2);
    for (const separator of separators) {
      expect(separator.getAttribute("role")).toBe("presentation");
      expect(separator.getAttribute("aria-hidden")).toBe("true");
      expect(separator.querySelector("svg")).not.toBeNull();
    }
    const links = [...list.querySelectorAll("[data-slot='breadcrumb-link']")];
    expect(links).toHaveLength(2);
    expect(links[0]!.getAttribute("href")).toBe("/");
  });

  test.each(breadcrumbVariants)("$format/$style carries the page semantics on BreadcrumbPage", (variant) => {
    const container = setupContainer();
    const rendered = part(variant, "Page", { children: "Here" });
    mount(typeof rendered === "function" ? rendered : rendered, container);
    const page = container.querySelector("[data-slot='breadcrumb-page']")!;
    expect(page.getAttribute("role")).toBe("link");
    expect(page.getAttribute("aria-disabled")).toBe("true");
    expect(page.getAttribute("aria-current")).toBe("page");
    expect(page.textContent).toBe("Here");
  });

  test.each(breadcrumbVariants)("$format/$style renders the ellipsis with its icon and sr-only label", (variant) => {
    const container = setupContainer();
    const rendered = part(variant, "Ellipsis");
    mount(typeof rendered === "function" ? rendered : rendered, container);
    const ellipsis = container.querySelector("[data-slot='breadcrumb-ellipsis']")!;
    expect(ellipsis.getAttribute("role")).toBe("presentation");
    expect(ellipsis.getAttribute("aria-hidden")).toBe("true");
    expect(ellipsis.querySelector("svg")).not.toBeNull();
    const sr = ellipsis.querySelector("span")!;
    expect(sr.textContent).toBe("More");
    expect(sr.className).not.toBe("");
  });

  test.each(breadcrumbVariants)("$format/$style lets custom separator children replace the chevron", (variant) => {
    const container = setupContainer();
    const rendered = part(variant, "Separator", { children: "/" });
    mount(typeof rendered === "function" ? rendered : rendered, container);
    const separator = container.querySelector("[data-slot='breadcrumb-separator']")!;
    expect(separator.querySelector("svg")).toBeNull();
    expect(separator.textContent).toBe("/");
  });

  test("composes a DropdownMenu inside an item for the overflow trail", async () => {
    const dropdown = dropdownMenuVariants[0]!;
    const DropdownMenu = dropdown.render;
    const nav = renderVariant(breadcrumbVariants[0]!, {
      children: [part(breadcrumbVariants[0]!, "List", {
        children: [part(breadcrumbVariants[0]!, "Item", {
          children: [DropdownMenu({
            content: [],
            children: ["…"],
          })],
        })],
      })],
    });
    const item = nav.querySelector("[data-slot='breadcrumb-item']")!;
    const trigger = item.querySelector("[data-slot='dropdown-menu-trigger']") as HTMLElement;
    expect(trigger).not.toBeNull();
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("dropdown-menu-content");
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(breadcrumbVariants)("$format/$style forwards user attrs onto the nav root across all four variants", (variant) => {
    const nav = renderVariant(variant, { title: "Hella", children: [] });
    expect(nav.getAttribute("title")).toBe("Hella");
  });

  test.each(breadcrumbVariants)("$format/$style fires a user on:click handler on the nav root across all four variants", (variant) => {
    const userClick = mock(() => {});
    const nav = renderVariant(variant, { "on:click": userClick, children: [] });
    nav.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
  });

  test.each(breadcrumbVariants)("$format/$style merges a user class into the nav root's class across all four variants", (variant) => {
    const nav = renderVariant(variant, { class: "user-class", children: [] });
    expect(classTokens(nav).at(-1)).toBe("user-class");
  });

  test.each(breadcrumbPartVariants.filter((variant) => variant.part === "Link"))("$format/$style link part forwards user attrs beside href", (variant) => {
    const container = setupContainer();
    const rendered = variant.render({ href: "/", title: "Home", children: ["Home"] });
    mount(typeof rendered === "function" ? rendered : rendered, container);
    const link = container.firstElementChild!;
    expect(link.getAttribute("href")).toBe("/");
    expect(link.getAttribute("title")).toBe("Home");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(breadcrumbVariants, { children: "Parity" });
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of breadcrumbPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(typeof rendered === "function" ? rendered : rendered, container);
      const el = container.firstElementChild!;
      expect(el.getAttribute("data-slot")).toBe(`breadcrumb-${variant.part.toLowerCase()}`);
    }
  });
});
