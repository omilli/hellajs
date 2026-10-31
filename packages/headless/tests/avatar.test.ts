import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { avatar } from "@hellajs/headless";

beforeEach(() => {
  resetTestState();
});

/** Mounts a rendered node into a fresh body container and returns its root element. */
function mountPart(node: JSX.Element): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(node, container);
  return container.firstElementChild as HTMLElement;
}

describe("avatar", () => {
  test("an image load flips the image visible and hides the fallback", () => {
    const parts = avatar();
    const image = mountPart(parts.Image({ src: "avatar.png" }));
    const fallback = mountPart(parts.Fallback({ children: "M", title: "Member" }));
    expect(image.getAttribute("data-slot")).toBe("avatar-image");
    expect(fallback.getAttribute("data-slot")).toBe("avatar-fallback");
    expect(fallback.getAttribute("title")).toBe("Member");
    expect(image.hasAttribute("hidden")).toBe(true);
    expect(fallback.hasAttribute("hidden")).toBe(false);
    image.dispatchEvent(new Event("load"));
    flush();
    expect(image.hasAttribute("hidden")).toBe(false);
    expect(fallback.getAttribute("hidden")).toBe("");
  });

  test("an image error re-hides the image and keeps the fallback visible", () => {
    const parts = avatar();
    const image = mountPart(parts.Image({ src: "avatar.png" }));
    const fallback = mountPart(parts.Fallback({ children: "M" }));
    image.dispatchEvent(new Event("load"));
    flush();
    expect(fallback.getAttribute("hidden")).toBe("");
    image.dispatchEvent(new Event("error"));
    flush();
    expect(image.hasAttribute("hidden")).toBe(true);
    expect(fallback.hasAttribute("hidden")).toBe(false);
  });

  test("the composed root carries both members", () => {
    const parts = avatar();
    const root = mountPart(
      parts.Root({
        title: "Profile",
        children: [
          parts.Image({ src: "avatar.png", alt: "Avatar of M" }),
          parts.Fallback({ children: "M" }),
        ],
      }),
    );
    expect(root.getAttribute("data-slot")).toBe("avatar");
    expect(root.getAttribute("title")).toBe("Profile");
    const image = root.querySelector('[data-slot="avatar-image"]');
    const fallback = root.querySelector('[data-slot="avatar-fallback"]');
    expect(image).not.toBeNull();
    expect(fallback).not.toBeNull();
    expect(image!.getAttribute("src")).toBe("avatar.png");
    expect(image!.getAttribute("alt")).toBe("Avatar of M");
    expect(fallback!.textContent).toBe("M");
  });

  test("a failing image under manual composition leaves the fallback mounted", () => {
    const parts = avatar();
    const image = mountPart(parts.Image({ src: "missing-avatar.png" }));
    const fallback = mountPart(parts.Fallback({ children: "M" }));
    image.dispatchEvent(new Event("error"));
    flush();
    expect(image.hasAttribute("hidden")).toBe(true);
    expect(fallback.hasAttribute("hidden")).toBe(false);
    // The swap is attribute-driven: neither member ever unmounts, so a later
    // successful load drops the fallback back out.
    expect(fallback.isConnected).toBe(true);
    expect(image.isConnected).toBe(true);
    image.dispatchEvent(new Event("load"));
    flush();
    expect(image.hasAttribute("hidden")).toBe(false);
    expect(fallback.getAttribute("hidden")).toBe("");
  });

  test("two factory calls hold independent loaded state", () => {
    const first = avatar();
    const second = avatar();
    const firstImage = mountPart(first.Image({ src: "first.png" }));
    const firstFallback = mountPart(first.Fallback({ children: "A" }));
    const secondImage = mountPart(second.Image({ src: "second.png" }));
    const secondFallback = mountPart(second.Fallback({ children: "B" }));
    firstImage.dispatchEvent(new Event("load"));
    flush();
    expect(firstImage.hasAttribute("hidden")).toBe(false);
    expect(firstFallback.getAttribute("hidden")).toBe("");
    expect(secondImage.hasAttribute("hidden")).toBe(true);
    expect(secondFallback.hasAttribute("hidden")).toBe(false);
  });
});
