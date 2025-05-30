import { describe, it, expect, beforeEach } from "bun:test";
import { setNodeHandler } from "../packages/dom/dist/hella-dom.esm";

describe("events", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should attach and fire delegated event handler", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    let called = false;
    setNodeHandler(div, "click", () => { called = true; });
    div.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(called).toBe(true);
  });

  it("should delegate events up the DOM tree", () => {
    const parent = document.createElement("div");
    const child = document.createElement("span");
    parent.appendChild(child);
    document.body.appendChild(parent);
    let called = false;
    setNodeHandler(parent, "click", () => { called = true; });
    child.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(called).toBe(true);
  });

  it("should support multiple event types", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    let clickCalled = false;
    let mouseoverCalled = false;
    setNodeHandler(div, "click", () => { clickCalled = true; });
    setNodeHandler(div, "mouseover", () => { mouseoverCalled = true; });
    div.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    div.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(clickCalled).toBe(true);
    expect(mouseoverCalled).toBe(true);
  });

  it("should replace handler if setNodeHandler is called again", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    let called1 = false;
    let called2 = false;
    setNodeHandler(div, "click", () => { called1 = true; });
    setNodeHandler(div, "click", () => { called2 = true; });
    div.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(called1).toBe(false);
    expect(called2).toBe(true);
  });

  it("should not call handler for unrelated nodes", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    let called = false;
    setNodeHandler(div, "click", () => { called = true; });
    const other = document.createElement("span");
    document.body.appendChild(other);
    other.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(called).toBe(false);
  });
});
