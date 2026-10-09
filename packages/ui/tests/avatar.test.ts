import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import {
  AVATAR_PARTS,
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  avatarPartVariants,
  avatarVariants,
  classTokens,
  renderVariant,
} from "./helpers/variants";
import type { AvatarImageVariantProps } from "./helpers/variants";

/** lowerCamel part name → kebab form (GroupCount → group-count). */
const kebab = (part: string): string =>
  part[0]!.toLowerCase() + part.slice(1).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Verbatim shadcn utility tokens — asserted in the tailwind flavor. */
const TOKENS: Record<string, string[]> = {
  Image: ["aspect-square", "size-full"],
  Fallback: ["flex", "size-full", "items-center", "justify-center", "rounded-full", "bg-muted", "text-sm", "text-muted-foreground", "group-data-[size=sm]/avatar:text-xs"],
  Badge: ["absolute", "right-0", "bottom-0", "z-10", "inline-flex", "items-center", "justify-center", "rounded-full", "bg-primary", "text-primary-foreground", "ring-2", "ring-background", "select-none"],
  Group: ["group/avatar-group", "flex", "-space-x-2", "*:data-[slot=avatar]:ring-2", "*:data-[slot=avatar]:ring-background"],
  GroupCount: ["relative", "flex", "size-8", "shrink-0", "items-center", "justify-center", "rounded-full", "bg-muted", "text-sm", "text-muted-foreground", "ring-2", "ring-background", "[&>svg]:size-4"],
};

/** Element tags per Avatar part — Badge and Fallback are spans per the ref. */
const PART_TAGS: Record<string, string> = {
  Image: "IMG",
  Fallback: "SPAN",
  Badge: "SPAN",
  Group: "DIV",
  GroupCount: "DIV",
};

beforeEach(() => {
  resetTestState();
});

describe("avatar", () => {
  test.each(avatarVariants)("$format/$style renders the avatar root with its data-slot and data-size", (variant) => {
    const avatar = renderVariant(variant, { children: variant.child("JD"), class: "my-avatar" });
    expect(avatar.getAttribute("data-slot")).toBe("avatar");
    expect(avatar.getAttribute("data-size")).toBe("default");
    const small = renderVariant(variant, { size: "sm", children: variant.child("JD") });
    expect(small.getAttribute("data-size")).toBe("sm");
    const large = renderVariant(variant, { size: "lg", children: variant.child("JD") });
    expect(large.getAttribute("data-size")).toBe("lg");
    expect(classTokens(avatar).at(-1)).toBe("my-avatar");
    if (variant.style === "css") {
      expect(classTokens(avatar)[0]!.startsWith("avatar-")).toBe(true);
    } else {
      expect(classTokens(avatar)).toContain("group/avatar");
      expect(classTokens(avatar)).toContain("data-[size=lg]:size-10");
    }
  });

  test.each(avatarVariants)("$format/$style renders AvatarImage with src and alt, hidden until loaded", (variant) => {
    const image = renderVariant(
      avatarPartVariants.filter((suite) => suite.part === "Image" && suite.style === variant.style && suite.format === variant.format)[0]!,
      { src: "avatar.png", alt: "Avatar of JD" } as AvatarImageVariantProps,
    );
    expect(image.tagName).toBe("IMG");
    expect(image.getAttribute("data-slot")).toBe("avatar-image");
    expect(image.getAttribute("src")).toBe("avatar.png");
    expect(image.getAttribute("alt")).toBe("Avatar of JD");
    expect(image.hasAttribute("hidden")).toBe(true);
  });

  test.each(avatarVariants)("$format/$style keeps the fallback visible until the shared loaded signal flips", (variant) => {
    const loaded = signal(false);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const image = renderVariant(
      avatarPartVariants.filter((suite) => suite.part === "Image" && suite.style === variant.style && suite.format === variant.format)[0]!,
      { src: "avatar.png", loaded } as AvatarImageVariantProps,
    );
    const fallback = renderVariant(
      avatarPartVariants.filter((suite) => suite.part === "Fallback" && suite.style === variant.style && suite.format === variant.format)[0]!,
      { loaded, children: [] },
    );
    expect(fallback.hasAttribute("hidden")).toBe(false);
    image.dispatchEvent(new Event("load"));
    flush();
    expect(image.hasAttribute("hidden")).toBe(false);
    expect(fallback.getAttribute("hidden")).toBe("");
    image.dispatchEvent(new Event("error"));
    flush();
    expect(image.hasAttribute("hidden")).toBe(true);
    expect(fallback.hasAttribute("hidden")).toBe(false);
  });

  test.each(avatarVariants)("$format/$style renders group and group-count parts", (variant) => {
    const group = renderVariant(
      avatarPartVariants.filter((suite) => suite.part === "Group" && suite.style === variant.style && suite.format === variant.format)[0]!,
      { children: [] },
    );
    const count = renderVariant(
      avatarPartVariants.filter((suite) => suite.part === "GroupCount" && suite.style === variant.style && suite.format === variant.format)[0]!,
      { children: variant.child("+3") },
    );
    expect(group.getAttribute("data-slot")).toBe("avatar-group");
    expect(count.getAttribute("data-slot")).toBe("avatar-group-count");
    expect(count.textContent).toBe("+3");
  });

  test.each(avatarPartVariants)("$format/$style $part renders its tag, data-slot, and classes", (variant) => {
    const el = renderVariant(variant, { children: [], class: "my-part" });
    expect(el.tagName).toBe(PART_TAGS[variant.part]!);
    expect(el.getAttribute("data-slot")).toBe(`avatar-${kebab(variant.part)}`);
    const tokens = classTokens(el);
    expect(tokens.at(-1)).toBe("my-part");
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith(`avatar-${kebab(variant.part)}-`)).toBe(true);
    } else {
      for (const token of TOKENS[variant.part]!) expect(tokens).toContain(token);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(avatarVariants);
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(avatarVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(avatarVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });

  test("keeps structural parity for every part across all four variants", () => {
    for (const part of AVATAR_PARTS) {
      const suites = avatarPartVariants.filter((variant) => variant.part === part);
      assertStructuralParity(suites, { children: [], src: "avatar.png", alt: "Parity" });
    }
  });
});
