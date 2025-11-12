

import { describe, test, expect, beforeEach } from "bun:test";
import { mount } from "../";

describe("events", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  const createTracker = () => {
    let called = false;
    return {
      handler: () => { called = true; },
      wasCalled: () => called
    };
  };

  const dispatchClick = (element: Element) => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  };

  const mountButton = (handler: () => void) => {
    mount(() => ({
      tag: "button",
      props: { onclick: handler },
      children: ["Click"]
    }), "body");
    return document.body.querySelector("button")!;
  };

  test("fires click handler attached via props", () => {
    const tracker = createTracker();
    const btn = mountButton(tracker.handler);
    dispatchClick(btn);
    expect(tracker.wasCalled()).toBe(true);
  });

  test("delegates event from child to parent handler", () => {
    const tracker = createTracker();
    mount(() => ({
      tag: "div",
      props: { onclick: tracker.handler },
      children: [{ tag: "span", props: {}, children: ["Child"] }]
    }), "body");
    const child = document.body.querySelector("span")!;
    dispatchClick(child);
    expect(tracker.wasCalled()).toBe(true);
  });

  test("replaces handler if prop changes", () => {
    const tracker1 = createTracker();
    const tracker2 = createTracker();

    const btn1 = mountButton(tracker1.handler);
    dispatchClick(btn1);

    const btn2 = mountButton(tracker2.handler);
    dispatchClick(btn2);

    expect(tracker1.wasCalled()).toBe(true);
    expect(tracker2.wasCalled()).toBe(true);
  });

  test("handler not called for unrelated nodes", () => {
    const tracker = createTracker();
    mountButton(tracker.handler);
    const other = document.createElement("span");
    document.body.appendChild(other);
    dispatchClick(other);
    expect(tracker.wasCalled()).toBe(false);
  });
});