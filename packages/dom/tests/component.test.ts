import { describe, test, expect, beforeEach } from "bun:test";
import { mount, componentScope, queueCleanup } from "../";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("component", () => {
  test("component wraps component in scope and attaches dispose", () => {
    const count = signal(0);
    let effectRuns = 0;

    const Counter = (props: any) => {
      effect(() => {
        count();
        effectRuns++;
      });

      return { tag: "div", props: { id: "counter" }, children: [props.count] };
    };

    // Simulate what the Babel plugin generates
    const node = componentScope(Counter, { count: 42 });

    mount(node);

    const counter = document.getElementById("counter") as any;
    expect(counter).not.toBeNull();
    expect(effectRuns).toBe(1);

    // Check that component scope was attached to the element
    expect(typeof counter.__hella_component_scope).toBe("function");

    // Trigger effect
    count(1);
    expect(effectRuns).toBe(2);

    // Remove and cleanup
    counter.remove();
    queueCleanup(counter);

    // Effect should stop
    count(2);
    expect(effectRuns).toBe(2);
  });

  test("nested components have independent scopes", () => {
    const trigger1 = signal(0);
    const trigger2 = signal(0);
    let effect1Runs = 0;
    let effect2Runs = 0;

    const Inner = () => {
      effect(() => {
        trigger2();
        effect2Runs++;
      });
      return { tag: "span", props: { id: "inner" }, children: ["Inner"] };
    };

    const Outer = () => {
      effect(() => {
        trigger1();
        effect1Runs++;
      });
      return {
        tag: "div",
        props: { id: "outer" },
        children: [componentScope(Inner, {})]
      };
    };

    mount(componentScope(Outer, {}));

    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);

    // Both respond
    trigger1(1);
    trigger2(1);
    expect(effect1Runs).toBe(2);
    expect(effect2Runs).toBe(2);

    // Remove inner component
    const inner = document.getElementById("inner") as any;
    inner.remove();
    queueCleanup(inner);

    // Only inner effect stops
    trigger1(2);
    trigger2(2);
    expect(effect1Runs).toBe(3);
    expect(effect2Runs).toBe(2); // Stopped

    // Remove outer component
    const outer = document.getElementById("outer") as any;
    outer.remove();
    queueCleanup(outer);

    // Both stopped
    trigger1(3);
    trigger2(3);
    expect(effect1Runs).toBe(3);
    expect(effect2Runs).toBe(2);
  });
});
