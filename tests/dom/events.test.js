

import { describe, test, expect, beforeEach } from "bun:test";
import { mount } from "@hellajs/dom";

describe("events (VNode structure)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("fires click handler attached via props", () => {
    let called = false;
    mount({
      tag: "button",
      props: { onclick: () => { called = true; } },
      children: ["Click"]
    }, "body");
    const btn = document.body.querySelector("button");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(called).toBe(true);
  });

  test("delegates event from child to parent handler", () => {
    let parentCalled = false;
    mount({
      tag: "div",
      props: { onclick: () => { parentCalled = true; } },
      children: [
        { tag: "span", props: {}, children: ["Child"] }
      ]
    }, "body");
    const child = document.body.querySelector("span");
    child.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(parentCalled).toBe(true);
  });

  test("supports multiple event types via props", () => {
    let clickCalled = false;
    let mouseoverCalled = false;
    mount({
      tag: "div",
      props: {
        onclick: () => { clickCalled = true; },
        onmouseover: () => { mouseoverCalled = true; }
      },
      children: ["Hover or Click"]
    }, "body");
    const div = document.body.querySelector("div");
    div.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    div.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(clickCalled).toBe(true);
    expect(mouseoverCalled).toBe(true);
  });

  test("replaces handler if prop changes (simulate by remount)", () => {
    let called1 = false;
    let called2 = false;
    // First mount with handler1
    mount({
      tag: "button",
      props: { onclick: () => { called1 = true; } },
      children: ["Click"]
    }, "body");
    const btn = document.body.querySelector("button");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    // Remount with handler2
    mount({
      tag: "button",
      props: { onclick: () => { called2 = true; } },
      children: ["Click"]
    }, "body");
    const btn2 = document.body.querySelector("button");
    btn2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(called1).toBe(true);
    expect(called2).toBe(true);
  });

  test("does not call handler for unrelated nodes", () => {
    let called = false;
    mount({
      tag: "button",
      props: { onclick: () => { called = true; } },
      children: ["Click"]
    }, "body");
    const other = document.createElement("span");
    document.body.appendChild(other);
    other.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(called).toBe(false);
  });
});
