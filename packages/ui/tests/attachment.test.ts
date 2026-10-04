import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  attachmentPartVariants,
  attachmentVariants,
  classTokens,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("attachment", () => {
  test.each(attachmentVariants)("$part $format/$style renders the state, size, and orientation attributes", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("attachment");
    expect(root.getAttribute("data-state")).toBe("done");
    expect(root.getAttribute("data-size")).toBe("default");
    expect(root.getAttribute("data-orientation")).toBe("horizontal");
    const errored = renderVariant(variant, { state: "error", size: "sm", orientation: "vertical", children: ["x"] });
    expect(errored.getAttribute("data-state")).toBe("error");
    expect(errored.getAttribute("data-size")).toBe("sm");
    expect(errored.getAttribute("data-orientation")).toBe("vertical");
  });

  test.each(attachmentVariants)("$part $format/$style carries the status classes per state", (variant) => {
    const idle = renderVariant(variant, { state: "idle", children: ["x"] });
    const errored = renderVariant(variant, { state: "error", children: ["x"] });
    if (variant.style === "css") {
      expect(classTokens(idle)[0]!.startsWith("attachment")).toBe(true);
      expect(classTokens(errored).some((token) => token.startsWith("attachment-size"))).toBe(true);
    } else {
      expect(classTokens(idle)).toContain("data-[state=idle]:border-dashed");
      expect(classTokens(errored)).toContain("data-[state=error]:border-destructive/30");
    }
  });

  test.each(attachmentVariants)("$part $format/$style renders the size variants", (variant) => {
    const xs = renderVariant(variant, { size: "xs", children: ["x"] });
    if (variant.style === "css") {
      expect(classTokens(xs).some((token) => token.startsWith("attachment-size-xs"))).toBe(true);
    } else {
      expect(classTokens(xs)).toContain("rounded-lg");
    }
  });

  test.each(attachmentPartVariants.filter((variant) => variant.part === "Media"))("$part $format/$style renders the media well", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("attachment-media");
    expect(root.getAttribute("data-variant")).toBe("icon");
    expect(root.textContent).toBe("x");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("attachment-media")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("aspect-square");
    }
    const image = renderVariant(variant, { variant: "image", children: ["x"] });
    expect(image.getAttribute("data-variant")).toBe("image");
  });

  test.each(attachmentPartVariants.filter((variant) => variant.part === "Media"))("$part $format/$style inlines the loading spinner while uploading", (variant) => {
    const root = renderVariant(variant, { state: "uploading" });
    expect(root.querySelector("svg path")).not.toBeNull();
    expect(root.querySelector("svg path")!.getAttribute("d")).toBe("M21 12a9 9 0 1 1-6.219-8.56");
  });

  test.each(attachmentPartVariants.filter((variant) => variant.part === "Media"))("$part $format/$style inlines the error glyph on error", (variant) => {
    const root = renderVariant(variant, { state: "error" });
    expect(root.querySelectorAll("svg path").length).toBe(3);
  });

  test.each(attachmentPartVariants.filter((variant) => variant.part === "Media"))("$part $format/$style renders authored children instead of the auto icons", (variant) => {
    const root = renderVariant(variant, { state: "uploading", children: ["doc.pdf"] });
    expect(root.querySelector("svg")).toBeNull();
    expect(root.textContent).toBe("doc.pdf");
  });

  test.each(attachmentPartVariants.filter((variant) => variant.part === "Content" || variant.part === "Title" || variant.part === "Description"))("$part $format/$style renders the text parts", (variant) => {
    const root = renderVariant(variant, { children: ["file.txt"] });
    expect(root.textContent).toBe("file.txt");
    if (variant.part === "Title" || variant.part === "Description") {
      expect(root.tagName).toBe("SPAN");
    }
  });

  test.each(attachmentPartVariants.filter((variant) => variant.part === "Actions"))("$part $format/$style renders the actions row", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("attachment-actions");
    expect(root.textContent).toBe("x");
  });

  test.each(attachmentPartVariants.filter((variant) => variant.part === "Action"))("$part $format/$style fires the action click handler", (variant) => {
    const onclick = mock(() => {});
    const root = renderVariant(variant, { onclick, children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("attachment-action");
    expect(root.getAttribute("data-variant")).toBe("ghost");
    expect(root.getAttribute("data-size")).toBe("icon-xs");
    root.dispatchEvent(new Event("click"));
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  test.each(attachmentPartVariants.filter((variant) => variant.part === "Trigger"))("$part $format/$style fires the trigger click handler", (variant) => {
    const onclick = mock(() => {});
    const root = renderVariant(variant, { onclick, children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("attachment-trigger");
    expect(root.getAttribute("type")).toBe("button");
    root.dispatchEvent(new Event("click"));
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  test.each(attachmentPartVariants.filter((variant) => variant.part === "Group"))("$part $format/$style renders the scroll group", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("attachment-group");
    expect(root.textContent).toBe("x");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("attachment-group")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("snap-x");
    }
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(attachmentVariants, { state: "uploading", size: "sm", orientation: "vertical", children: ["x"] });
    assertStructuralParity(attachmentPartVariants.filter((candidate) => candidate.part === "Media"), { state: "error", children: ["x"] });
    assertStructuralParity(attachmentPartVariants.filter((candidate) => candidate.part === "Action"), { size: "icon-sm", children: ["x"] });
  });
});
