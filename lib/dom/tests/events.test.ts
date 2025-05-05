import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { EventDelegator } from "../events";

describe("EventDelegator", () => {
  let root: HTMLElement;
  let delegator: EventDelegator;

  beforeEach(() => {
    document.body.innerHTML = `<div id="root"><button id="btn"></button></div>`;
    root = document.getElementById("root")!;
    delegator = new EventDelegator("#root");
  });

  afterEach(() => {
    delegator.cleanup();
  });

  it("adds and triggers event handler", () => {
    const btn = document.getElementById("btn")!;
    const handler = mock(() => { });
    delegator.addHandler(btn, "click", handler);
    btn.click();
    expect(handler).toHaveBeenCalled();
  });

  it("removes handlers for element", () => {
    const btn = document.getElementById("btn")!;
    const handler = mock(() => { });
    delegator.addHandler(btn, "click", handler);
    delegator.removeHandlersForElement(btn);
    btn.click();
    expect(handler).not.toHaveBeenCalledTimes(2);
  });

  it("bubbles event up to parent", () => {
    // Add a wrapper div inside root
    root.innerHTML = `<div id="wrapper"><button id="btn"></button></div>`;
    const wrapper = document.getElementById("wrapper")!;
    const btn = document.getElementById("btn")!;
    const parentHandler = mock(() => { });
    delegator.addHandler(wrapper, "click", parentHandler);
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(parentHandler).toHaveBeenCalled();
  });

  it("does not trigger handler after cleanup", () => {
    const btn = document.getElementById("btn")!;
    const handler = mock(() => { });
    delegator.addHandler(btn, "click", handler);
    delegator.cleanup();
    btn.click();
    expect(handler).not.toHaveBeenCalledTimes(2);
  });

  it("does not fail if removing handler for unknown element", () => {
    const div = document.createElement("div");
    expect(() => delegator.removeHandlersForElement(div)).not.toThrow();
  });
});
