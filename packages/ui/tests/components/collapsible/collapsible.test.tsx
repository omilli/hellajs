import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { mount } from "@hellajs/dom";
import {
  assertAttrForwarded,
  assertStructuralParity,
  classTokens,
} from "../../helpers/variants-core";
import { collapsibleVariants } from "./variants";
import type { CollapsibleVariantProps } from "./variants";
import type { ComponentVariant } from "../../helpers/variants-core";

beforeEach(() => {
  resetTestState();
});

/** Mounts a collapsible variant into a fresh container and resolves root, trigger, and content region. */
function mountCollapsible(
  variant: ComponentVariant<CollapsibleVariantProps>,
  props: CollapsibleVariantProps,
) {
  const container = setupContainer();
  const rendered = variant.render(props);
  mount(rendered, container);
  const root = container.firstElementChild as HTMLElement;
  const trigger = root.querySelector('[data-slot="collapsible-trigger"]') as HTMLElement;
  const content = root.querySelector('[data-slot="collapsible-content"]') as HTMLElement;
  return { root, trigger, content };
}

describe("collapsible", () => {
  test.each(collapsibleVariants)(
    "$style renders defaultOpen with aria-expanded and open data-state everywhere",
    (variant) => {
      const { root, trigger, content } = mountCollapsible(variant, {
        trigger: "More",
        content: "Details",
        defaultOpen: true,
      });
      expect(root.getAttribute("data-state")).toBe("open");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(trigger.getAttribute("data-state")).toBe("open");
      expect(content.getAttribute("data-state")).toBe("open");
      expect(content.textContent).toContain("Details");
    },
  );

  test.each(collapsibleVariants)(
    "$style starts closed by default and toggles aria-expanded and data-state on click",
    (variant) => {
      const { root, trigger, content } = mountCollapsible(variant, {
        trigger: "More",
        content: "Details",
      });
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
    },
  );

  test.each(collapsibleVariants)(
    "$style reports each requested flip through onOpenChange",
    (variant) => {
      const onOpenChange = vi.fn((open: boolean) => open);
      const { trigger } = mountCollapsible(variant, {
        trigger: "More",
        content: "Details",
        onOpenChange,
      });
      trigger.dispatchEvent(new Event("click"));
      trigger.dispatchEvent(new Event("click"));
      expect(onOpenChange).toHaveBeenCalledTimes(2);
      expect(onOpenChange.mock.calls[0]).toEqual([true]);
      expect(onOpenChange.mock.calls[1]).toEqual([false]);
    },
  );

  test.each(collapsibleVariants)(
    "$style drives state from a controlled open() signal and keeps clicks from writing it",
    (variant) => {
      const open = signal(false);
      const onOpenChange = vi.fn((open: boolean) => open);
      const { trigger, content } = mountCollapsible(variant, {
        trigger: "More",
        content: "Details",
        open: () => open(),
        onOpenChange,
      });
      expect(content.getAttribute("data-state")).toBe("closed");
      open(true);
      flush();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(content.getAttribute("data-state")).toBe("open");
      trigger.dispatchEvent(new Event("click"));
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange.mock.calls[0]).toEqual([false]);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    },
  );

  test.each(collapsibleVariants)(
    "$style keeps the content mounted under data-state=closed for the grid collapse",
    (variant) => {
      const { trigger, content } = mountCollapsible(variant, {
        trigger: "More",
        content: "Details",
        defaultOpen: true,
      });
      expect(content.getAttribute("data-state")).toBe("open");
      trigger.dispatchEvent(new Event("click"));
      expect(content.isConnected).toBe(true);
      expect(content.getAttribute("data-state")).toBe("closed");
      expect(content.querySelector("[data-slot='collapsible-content'] > div")).not.toBeNull();
      const tokens = classTokens(content);
      if (variant.style === "tailwind") {
        expect(tokens).toContain("grid-rows-[0fr]");
        expect(tokens).toContain("data-[state=open]:grid-rows-[1fr]");
      } else {
        expect(tokens.some((token) => token.startsWith("collapsible-content"))).toBe(true);
      }
    },
  );

  test.each(collapsibleVariants)(
    "$style links the trigger's aria-controls to the content region id",
    (variant) => {
      const { trigger, content } = mountCollapsible(variant, {
        trigger: "More",
        content: "Details",
      });
      expect(content.getAttribute("role")).toBe("region");
      expect(trigger.getAttribute("aria-controls")).toBe(content.id);
      expect(content.id).toMatch(/^hella-collapsible-content-/);
    },
  );

  test.each(collapsibleVariants)(
    "$style carries the chevron and its rotate wiring on the open trigger",
    (variant) => {
      const { trigger } = mountCollapsible(variant, {
        trigger: "More",
        content: "Details",
        defaultOpen: true,
      });
      expect(trigger.querySelector("[data-slot='collapsible-icon']")).not.toBeNull();
      const tokens = classTokens(trigger);
      if (variant.style === "tailwind") {
        expect(tokens).toContain("[&[data-state=open]>svg]:rotate-180");
        expect(tokens).not.toContain("rotate-180");
      } else {
        expect(tokens.some((token) => token.startsWith("collapsible-trigger"))).toBe(true);
      }
      expect(trigger.getAttribute("data-state")).toBe("open");
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(collapsibleVariants, { trigger: "More", content: "Details" });
  });

  test("forwards user attrs onto the root across both styles", () => {
    assertAttrForwarded(
      collapsibleVariants,
      { trigger: "More", content: "Details", title: "Hella" },
      "title",
      "Hella",
    );
  });

  test("merges a user class into the root class across both styles", () => {
    for (const variant of collapsibleVariants) {
      const { root } = mountCollapsible(variant, {
        trigger: "More",
        content: "Details",
        class: "col-root",
      });
      expect(classTokens(root)).toContain("col-root");
    }
  });
});
