import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { html, mount } from "@hellajs/dom";
import {
  assertAttrForwarded,
  assertStructuralParity,
  classTokens,
  collapsiblePartVariants,
  collapsibleVariants,
} from "./helpers/variants";
import type { CollapsibleVariantProps, ComponentVariant } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** Mounts a collapsible variant into a fresh container and resolves root, trigger, and content region. */
function mountCollapsible(variant: ComponentVariant<CollapsibleVariantProps>, props: CollapsibleVariantProps) {
  const container = setupContainer();
  const rendered = variant.render(props);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
  const root = container.firstElementChild as HTMLElement;
  const trigger = root.querySelector('[data-slot="collapsible-trigger"]') as HTMLElement;
  const content = root.querySelector('[data-slot="collapsible-content"]') as HTMLElement;
  return { root, trigger, content };
}

describe("collapsible", () => {
  test.each(collapsibleVariants)("$format/$style renders defaultOpen with aria-expanded and open data-state everywhere", (variant) => {
    const { root, trigger, content } = mountCollapsible(variant, { trigger: "More", content: "Details", defaultOpen: true });
    expect(root.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.textContent).toContain("Details");
  });

  test.each(collapsibleVariants)("$format/$style starts closed by default and toggles aria-expanded and data-state on click", (variant) => {
    const { root, trigger, content } = mountCollapsible(variant, { trigger: "More", content: "Details" });
    expect(root.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.dispatchEvent(new Event("click"));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(root.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("data-state")).toBe("open");
    trigger.dispatchEvent(new Event("click"));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(root.getAttribute("data-state")).toBe("closed");
  });

  test.each(collapsibleVariants)("$format/$style reports each requested flip through onOpenChange", (variant) => {
    const onOpenChange = mock((open: boolean) => open);
    const { trigger } = mountCollapsible(variant, { trigger: "More", content: "Details", onOpenChange });
    trigger.dispatchEvent(new Event("click"));
    trigger.dispatchEvent(new Event("click"));
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange.mock.calls[0]).toEqual([true]);
    expect(onOpenChange.mock.calls[1]).toEqual([false]);
  });

  test.each(collapsibleVariants)("$format/$style drives state from a controlled open() signal and keeps clicks from writing it", (variant) => {
    const open = signal(false);
    const onOpenChange = mock((open: boolean) => open);
    const { trigger, content } = mountCollapsible(variant, { trigger: "More", content: "Details", open: () => open(), onOpenChange });
    expect(content.getAttribute("data-state")).toBe("closed");
    open(true);
    flush();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(content.getAttribute("data-state")).toBe("open");
    trigger.dispatchEvent(new Event("click"));
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0]).toEqual([false]);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  test.each(collapsibleVariants)("$format/$style keeps the content mounted under data-state=closed for the grid collapse", (variant) => {
    const { trigger, content } = mountCollapsible(variant, { trigger: "More", content: "Details", defaultOpen: true });
    expect(content.getAttribute("data-state")).toBe("open");
    trigger.dispatchEvent(new Event("click"));
    expect(content.isConnected).toBe(true);
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(content.querySelector("[data-slot='collapsible-content'] > div")).not.toBeNull();
  });

  test.each(collapsibleVariants)("$format/$style links the trigger's aria-controls to the content region id", (variant) => {
    const { trigger, content } = mountCollapsible(variant, { trigger: "More", content: "Details" });
    expect(content.getAttribute("role")).toBe("region");
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    expect(content.id).toMatch(/^hella-collapsible-content-/);
  });

  test.each(collapsibleVariants)("$format/$style carries the chevron and its rotate wiring on the open trigger", (variant) => {
    const { trigger } = mountCollapsible(variant, { trigger: "More", content: "Details", defaultOpen: true });
    expect(trigger.querySelector("[data-slot='collapsible-icon']")).not.toBeNull();
    const tokens = classTokens(trigger);
    if (variant.style === "tailwind") {
      expect(tokens).toContain("[&[data-state=open]>svg]:rotate-180");
      expect(tokens).not.toContain("rotate-180");
    } else {
      expect(tokens.some((token) => token.startsWith("collapsible-trigger"))).toBe(true);
    }
    expect(trigger.getAttribute("data-state")).toBe("open");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(collapsibleVariants, { trigger: "More", content: "Details" });
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(collapsibleVariants, { trigger: "More", content: "Details", title: "Hella" }, "title", "Hella");
  });

  test("merges a user class into the root class across all four variants", () => {
    for (const variant of collapsibleVariants) {
      const { root } = mountCollapsible(variant, { trigger: "More", content: "Details", class: "col-root" });
      expect(classTokens(root)).toContain("col-root");
    }
  });

  test("chains a user on:click with the owned toggle on a trigger across all four variants", () => {
    for (const variant of collapsiblePartVariants.filter((candidate) => candidate.part === "Trigger")) {
      const userClick = mock(() => {});
      const open = signal(false);
      const container = setupContainer();
      const props: Record<string, unknown> = {
        active: () => open(),
        onToggle: () => open(!open()),
        "on:click": userClick,
        children: "Toggle",
      };
      const rendered = variant.render(props as never);
      mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
      const trigger = container.firstElementChild!;
      trigger.dispatchEvent(new Event("click"));
      expect(userClick).toHaveBeenCalledTimes(1);
      expect(open()).toBe(true);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    }
  });

  test("renders every named part with its data-slot and state across all four variants", () => {
    for (const variant of collapsiblePartVariants) {
      const container = setupContainer();
      const props: Record<string, unknown> = { children: "Body" };
      if (variant.part === "Trigger") {
        props.active = () => true;
        props.onToggle = () => {};
        props["aria-controls"] = "target-id";
      } else {
        props.active = () => false;
        props.id = "region-id";
      }
      const rendered = variant.render(props as never);
      mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
      const el = container.firstElementChild!;
      if (variant.part === "Trigger") {
        expect(el.getAttribute("data-slot")).toBe("collapsible-trigger");
        expect(el.getAttribute("aria-expanded")).toBe("true");
        expect(el.getAttribute("aria-controls")).toBe("target-id");
        expect(el.getAttribute("data-state")).toBe("open");
      } else {
        expect(el.getAttribute("data-slot")).toBe("collapsible-content");
        expect(el.getAttribute("role")).toBe("region");
        expect(el.getAttribute("id")).toBe("region-id");
        expect(el.getAttribute("data-state")).toBe("closed");
      }
    }
  });
});
