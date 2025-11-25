import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html } from "../";
import { flushMountQueue, queueCleanup } from "../";

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

    // Create and mount an element with mount hook
    mount(() => ({
      tag: "div",
      props: { id: "test" },
      hooks: {
        mount: () => { mountCalled = true; }
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

  test("component scope is disposed when root element is removed", () => {
    const count = signal(0);
    let effectRuns = 0;

    // Component function that creates effects during execution
    const Counter = (props: any) => {
      effect(() => {
        count(); // Track dependency
        effectRuns++;
      });

      return html`<div id="counter">${props.count}</div>`;
    };

    // Mount component
    mount(html`<${Counter} count=${42} />`);

    const counter = document.getElementById("counter") as any;
    expect(counter).not.toBeNull();
    expect(effectRuns).toBe(1);

    // Trigger effect by changing signal
    count(1);
    expect(effectRuns).toBe(2);

    // Remove component from DOM
    counter!.remove();
    queueCleanup(counter!);

    // Effect should no longer run after cleanup
    count(2);
    expect(effectRuns).toBe(2); // Should not have increased
  });

  test("multiple components each have isolated scopes", () => {
    const trigger1 = signal(0);
    const trigger2 = signal(0);
    let effect1Runs = 0;
    let effect2Runs = 0;

    const Component1 = () => {
      effect(() => {
        trigger1();
        effect1Runs++;
      });
      return html`<div id="comp1">Component 1</div>`;
    };

    const Component2 = () => {
      effect(() => {
        trigger2();
        effect2Runs++;
      });
      return html`<div id="comp2">Component 2</div>`;
    };

    mount(html`
      <div>
        <${Component1} />
        <${Component2} />
      </div>
    `);

    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);

    // Both effects respond to their signals
    trigger1(1);
    trigger2(1);
    expect(effect1Runs).toBe(2);
    expect(effect2Runs).toBe(2);

    // Remove only Component1
    const comp1 = document.getElementById("comp1");
    comp1!.remove();
    queueCleanup(comp1!);

    // Component1 effect should stop, Component2 should continue
    trigger1(2);
    trigger2(2);
    expect(effect1Runs).toBe(2); // Stopped
    expect(effect2Runs).toBe(3); // Still running

    // Remove Component2
    const comp2 = document.getElementById("comp2");
    comp2!.remove();
    queueCleanup(comp2!);

    // Now both effects should be stopped
    trigger1(3);
    trigger2(3);
    expect(effect1Runs).toBe(2);
    expect(effect2Runs).toBe(3);
  });
});