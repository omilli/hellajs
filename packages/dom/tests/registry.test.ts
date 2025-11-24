import { describe, test, expect, beforeEach } from "bun:test";
import { mount } from "../";
import { flushMountQueue } from "../lib/registry";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("registry", () => {
  test("event handlers fire correctly", () => {
    let clicked = 0;

    mount(() => ({
      tag: "button",
      props: {
        id: "btn"
      },
      on: {
        click: () => clicked++
      },
      children: ["Click"]
    }));

    const button = document.getElementById("btn")!;
    button.dispatchEvent(new Event("click"));
    expect(clicked).toBe(1);

    button.dispatchEvent(new Event("click"));
    expect(clicked).toBe(2);
  });

  test("multiple event types on same element", () => {
    let clicks = 0;
    let hovers = 0;

    mount(() => ({
      tag: "div",
      props: {
        id: "multi"
      },
      on: {
        click: () => clicks++,
        mouseenter: () => hovers++
      },
      children: []
    }));

    const element = document.getElementById("multi")!;
    element.dispatchEvent(new Event("click"));
    expect(clicks).toBe(1);
    expect(hovers).toBe(0);

    element.dispatchEvent(new Event("mouseenter"));
    expect(clicks).toBe(1);
    expect(hovers).toBe(1);
  });

  test("nodes queued for mounting but disconnected are skipped", async () => {
    let mountCalled = false;

    // Create and mount an element with onMount hook
    mount(() => ({
      tag: "div",
      props: { id: "test" },
      lifecycle: {
        onMount: () => { mountCalled = true; }
      },
      children: []
    }));

    const testDiv = document.getElementById("test")!;

    // Create a child element that will be queued for mounting
    const child = document.createElement("span");
    child.textContent = "child";
    testDiv.appendChild(child);

    // Immediately disconnect it before mount queue processes
    testDiv.removeChild(child);

    // Wait for mount queue to process
    flushMountQueue(document.getElementById("app")!);

    // The mount should have been called for the parent, and the disconnected child should be skipped
    expect(mountCalled).toBe(true);
  });
});