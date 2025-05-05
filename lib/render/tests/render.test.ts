import { describe, it, expect, beforeEach } from "bun:test";
import { render, rootRegistry } from "../render";

describe("render", () => {
  let rootSelector = "#app";

  beforeEach(() => {
    document.body.innerHTML = `<div id="app"></div>`;
    rootRegistry.clear();
  });

  it("throws if root element not found", () => {
    expect(() => render("hi", "#notfound")).toThrow();
  });

  it("renders and cleans up", () => {
    const { cleanup } = render("hello", rootSelector);
    expect(document.querySelector(rootSelector)!.textContent).toBe("hello");
    cleanup();
    expect(document.querySelector(rootSelector)!.textContent).toBe("");
    expect(rootRegistry.has(rootSelector)).toBe(false);
  });

  it("adds and removes delegator from registry", () => {
    const { cleanup } = render("hi", rootSelector);
    expect(rootRegistry.has(rootSelector)).toBe(true);
    cleanup();
    expect(rootRegistry.has(rootSelector)).toBe(false);
  });
});
