import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState, ForEach } from "@hellajs/dom";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("cleanup overlay", () => {
    test("drains state-carrying descendants through stateless wrappers on tracked removal", () => {
      const beforeLI = vi.fn();
      const beforeP = vi.fn();
      const beforeSpan = vi.fn();
      const items = signal([1]);
      mount(
        <ul>
          <ForEach
            each={items}
            use={(item: number) => (
              <li key={item} class="row" hook:beforeDestroy={beforeLI}>
                <div>
                  <p hook:beforeDestroy={beforeP}>
                    <span hook:beforeDestroy={beforeSpan}>{item}</span>
                  </p>
                </div>
              </li>
            )}
          ></ForEach>
        </ul>,
      );
      const li = document.querySelector(".row") as HellaElement;
      const p = li.querySelector("p") as HellaElement;
      const span = li.querySelector("span") as HellaElement;
      expect(peekState(li)).toBeDefined();
      expect(peekState(p)).toBeDefined();
      expect(peekState(span)).toBeDefined();

      items([2]);
      flush();

      expect(beforeLI).toHaveBeenCalledTimes(1);
      expect(beforeP).toHaveBeenCalledTimes(1);
      expect(beforeSpan).toHaveBeenCalledTimes(1);
      expect(peekState(li)).toBeUndefined();
      expect(peekState(p)).toBeUndefined();
      expect(peekState(span)).toBeUndefined();
    });

    test("drops the stale overlay link of a node moved out before its old ancestor cleans", async () => {
      const destroyX = vi.fn();
      const hostA = document.createElement("div");
      const hostB = document.createElement("div");
      document.body.append(hostA, hostB);
      const handleA = mount(
        <div id="wrapA" on:click={() => {}}>
          <span id="x" on:click={() => {}} hook:beforeDestroy={destroyX} />
        </div>,
        hostA,
      );
      const handleB = mount(
        <div id="wrapB" on:click={() => {}}>
          <div id="slotB" />
        </div>,
        hostB,
      );
      const x = document.getElementById("x") as HellaElement;
      const wrapA = document.getElementById("wrapA") as HellaElement;
      expect(peekState(x)?.registeredIn).toBe(wrapA);
      document.getElementById("slotB")!.appendChild(x);
      handleA.unmount();
      expect(destroyX).not.toHaveBeenCalled();
      expect(peekState(x)).toBeDefined();

      await delay(0);
      expect(peekState(x)?.registeredIn).toBe(document.getElementById("wrapB"));

      handleB.unmount();
      expect(destroyX).toHaveBeenCalledTimes(1);
      expect(peekState(x)).toBeUndefined();
    });

    test("re-registers a moved state-carrying node into the new ancestor's overlay", async () => {
      const destroyX = vi.fn();
      const hostA = document.createElement("div");
      const hostB = document.createElement("div");
      document.body.append(hostA, hostB);
      const handleA = mount(
        <div id="wrapA" on:click={() => {}}>
          <span id="x" on:click={() => {}} hook:beforeDestroy={destroyX} />
        </div>,
        hostA,
      );
      const handleB = mount(
        <div id="wrapB" on:click={() => {}}>
          <div id="slotB" />
        </div>,
        hostB,
      );
      const x = document.getElementById("x") as HellaElement;

      document.getElementById("slotB")!.appendChild(x);
      await delay(0);
      expect(peekState(x)?.registeredIn).toBe(document.getElementById("wrapB"));

      handleA.unmount();
      expect(destroyX).not.toHaveBeenCalled();
      expect(peekState(x)).toBeDefined();

      handleB.unmount();
      expect(destroyX).toHaveBeenCalledTimes(1);
      expect(peekState(x)).toBeUndefined();
    });

    test("fires a cleaned root's hooks before its descendants' hooks", () => {
      const beforeRoot = vi.fn();
      const beforeMid = vi.fn();
      const beforeLeaf = vi.fn();
      const afterRoot = vi.fn();
      const afterMid = vi.fn();
      const afterLeaf = vi.fn();
      const handle = mount(
        <div
          id="wrap"
          on:click={() => {}}
          hook:beforeDestroy={beforeRoot}
          hook:afterDestroy={afterRoot}
        >
          <p id="mid" hook:beforeDestroy={beforeMid} hook:afterDestroy={afterMid}>
            <span id="leaf" hook:beforeDestroy={beforeLeaf} hook:afterDestroy={afterLeaf} />
          </p>
        </div>,
      );

      handle.unmount();

      const order = [beforeRoot, afterRoot, beforeMid, afterMid, beforeLeaf, afterLeaf].map(
        (fn) => fn.mock.invocationCallOrder[0]!,
      );
      expect(order[0]!).toBeLessThan(order[2]!);
      expect(order[1]!).toBeLessThan(order[3]!);
      expect(order[2]!).toBeLessThan(order[4]!);
      expect(order[3]!).toBeLessThan(order[5]!);
      expect(beforeRoot).toHaveBeenCalledTimes(1);
      expect(afterLeaf).toHaveBeenCalledTimes(1);
    });

    test("registers a fragment tail carrier's existing descendants at scope wiring", () => {
      const destroyInner = vi.fn();
      const show = signal(true);
      const Frag = () => (
        <>
          <i>lead</i>
          <div id="tail">
            <span id="inner" on:click={() => {}} hook:beforeDestroy={destroyInner} />
          </div>
        </>
      );
      mount(<section id="fragHost">{() => (show() ? <Frag /> : <b>off</b>)}</section>);
      const tail = document.getElementById("tail") as HellaElement;
      const inner = document.getElementById("inner") as HellaElement;
      expect(peekState(tail)).toBeDefined();
      expect(peekState(inner)?.registeredIn).toBe(tail);

      show(false);
      flush();

      expect(destroyInner).toHaveBeenCalledTimes(1);
      expect(peekState(inner)).toBeUndefined();
      expect(peekState(tail)).toBeUndefined();
    });
  });
});
