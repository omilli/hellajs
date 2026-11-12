import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import {
  $ref,
  checkMultiSelectors,
  mount,
  getState,
  peekState,
  multiSelectors,
} from "@hellajs/dom";

beforeEach(() => {
  resetTestState(`
    <div id="app"></div>
    <span class="item">A</span>
    <span class="item">B</span>
    <input id="text-input" type="text" />
  `);
});

describe("dom", () => {
  describe("$ref", () => {
    test("selects first matching element", () => {
      const ref = $ref(".item");
      expect(ref()?.textContent).toBe("A");
      expect(ref.node?.textContent).toBe("A");
    });

    test("returns null for missing selectors", () => {
      const ref = $ref(".nonexistent");
      expect(ref()).toBeNull();
      expect(ref.node).toBeNull();
    });

    test("sets static and reactive text", () => {
      const content = signal("initial");
      $ref("#app").text("Hello");
      expect(document.getElementById("app")?.textContent).toBe("Hello");

      $ref("#app").text(content);
      expect(document.getElementById("app")?.textContent).toBe("initial");

      content("updated");
      flush();
      expect(document.getElementById("app")?.textContent).toBe("updated");
    });

    test("sets static and reactive attributes", () => {
      const isActive = signal(false);

      $ref("#app").attr({
        "data-static": "value",
        class: () => (isActive() ? "active" : "inactive"),
      });

      const app = document.getElementById("app")!;
      expect(app.getAttribute("data-static")).toBe("value");
      expect(app.className).toBe("inactive");

      isActive(true);
      flush();
      expect(app.className).toBe("active");
    });

    test("detects form elements for value binding", () => {
      const inputValue = signal("initial");
      $ref("#text-input").text(inputValue);

      const input = document.getElementById("text-input") as HTMLInputElement;
      expect(input.value).toBe("initial");
      expect(input.textContent).toBe("");

      inputValue("updated");
      flush();
      expect(input.value).toBe("updated");
    });

    test("routes text() to value on TEXTAREA and SELECT too", () => {
      const textarea = document.createElement("textarea");
      const select = document.createElement("select");
      select.innerHTML = '<option value="picked"></option><option value="changed"></option>';
      textarea.className = "form-route";
      select.className = "form-route";
      document.body.appendChild(textarea);
      document.body.appendChild(select);

      const value = signal("picked");
      $ref("textarea.form-route").text(value);
      $ref("select.form-route").text(value);

      expect((textarea as HTMLTextAreaElement).value).toBe("picked");
      expect((select as HTMLSelectElement).value).toBe("picked");
      expect(textarea.textContent).toBe("");

      value("changed");
      flush();
      expect((textarea as HTMLTextAreaElement).value).toBe("changed");
      expect((select as HTMLSelectElement).value).toBe("changed");
    });

    test("chains text, attr, and on with reactive signal updates", () => {
      const count = signal(0);

      $ref("#app")
        .text(() => `Count: ${count()}`)
        .attr({ "data-reactive": "true" })
        .on("click", () => count(count() + 1));

      flush();
      const app = document.getElementById("app")!;
      expect(app.textContent).toBe("Count: 0");
      expect(app.getAttribute("data-reactive")).toBe("true");

      app.dispatchEvent(new Event("click"));
      flush();
      expect(app.textContent).toBe("Count: 1");
    });

    test("attaches event handlers", () => {
      const clickHandler = vi.fn(() => {});
      $ref("#app").on("click", clickHandler);

      document.getElementById("app")?.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("direct e() handler fires with this set to the element", () => {
      const contexts: Element[] = [];
      const events: Event[] = [];
      const app = document.getElementById("app")!;

      $ref(app).e("click", function (this: Element, event: Event) {
        contexts.push(this);
        events.push(event);
      });

      app.dispatchEvent(new Event("click"));
      expect(contexts).toEqual([app]);
      expect(events[0]).toBeInstanceOf(Event);
    });

    test("e() spec form forwards native listener options (once)", () => {
      const handler = vi.fn(() => {});
      const app = document.getElementById("app")!;

      $ref(app).e("click", { handler, options: { once: true } });

      app.dispatchEvent(new Event("click"));
      app.dispatchEvent(new Event("click"));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("a second e() for the same type replaces the first", () => {
      const first = vi.fn(() => {});
      const second = vi.fn(() => {});
      const app = document.getElementById("app")!;

      $ref(app).e("click", first);
      $ref(app).e("click", second);

      app.dispatchEvent(new Event("click"));
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    test("attaches lifecycle hooks", () => {
      const app = document.getElementById("app")!;
      getState(app).isMounted = true;

      const mountHandler = vi.fn(() => {});
      $ref("#app").hooks({
        afterMount: mountHandler,
      });

      expect(mountHandler).toHaveBeenCalledTimes(1);
    });

    test("fires afterMount immediately on an element mounted without hooks", () => {
      const mountHandler = vi.fn(() => {});
      $ref("#app").hooks({ afterMount: mountHandler });

      expect(mountHandler).toHaveBeenCalledTimes(1);
    });

    test("all hook types work", () => {
      const app = document.getElementById("app")!;
      getState(app).isMounted = true;

      const afterMountHandler = vi.fn(() => {});
      const beforeUpdateHandler = vi.fn(() => {});
      const afterUpdateHandler = vi.fn(() => {});

      $ref("#app").hooks({
        afterMount: (el) => {
          expect(el).toBe(app);
          afterMountHandler();
        },
        beforeUpdate: (el) => {
          expect(el).toBe(app);
          beforeUpdateHandler();
        },
        afterUpdate: (el) => {
          expect(el).toBe(app);
          afterUpdateHandler();
        },
      });

      expect(afterMountHandler).toHaveBeenCalledTimes(1);

      const count = signal(0);
      $ref("#app").text(() => `Count: ${count()}`);
      flush();

      expect(beforeUpdateHandler).toHaveBeenCalledTimes(1);
      expect(afterUpdateHandler).toHaveBeenCalledTimes(1);
    });

    test("destroy hooks execute on removal", () => {
      const beforeDestroyHandler = vi.fn(() => {});
      const afterDestroyHandler = vi.fn(() => {});

      const app = mount(<div class="destroy-test"></div>);
      const container = document.querySelector(".destroy-test")!;

      $ref(".destroy-test").hooks({
        beforeDestroy: (el) => {
          beforeDestroyHandler();
          expect(el).toBe(container);
        },
        afterDestroy: () => {
          afterDestroyHandler();
        },
      });

      app.unmount();

      expect(beforeDestroyHandler).toHaveBeenCalledTimes(1);
      expect(afterDestroyHandler).toHaveBeenCalledTimes(1);
    });

    test("afterMount fires when element appears", async () => {
      const mountHandler = vi.fn(() => {});
      const clickHandler = vi.fn(() => {});

      $ref(".future-element")
        .hooks({
          afterMount: (el) => {
            mountHandler();
            el!.textContent = "Watched!";
          },
        })
        .attr({ "data-test": "value" })
        .on("click", clickHandler);

      const newElement = document.createElement("div");
      newElement.className = "future-element";
      document.body.appendChild(newElement);

      checkMultiSelectors();
      await delay(10);

      expect(mountHandler).toHaveBeenCalledTimes(1);
      expect(newElement.textContent).toBe("Watched!");
      expect(newElement.getAttribute("data-test")).toBe("value");

      newElement.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);

      const element2 = document.createElement("div");
      element2.className = "future-element";
      document.body.appendChild(element2);

      checkMultiSelectors();
      await delay(10);
      expect(mountHandler).toHaveBeenCalledTimes(1);
    });

    test("safe no-op when element not found", () => {
      const ref = $ref(".missing");

      ref.text("test");
      ref.attr({ class: "test" });
      ref.on("click", () => {});
      ref.hooks({ afterMount: () => {} });
    });

    test("queues text, attr, and e until the element appears", async () => {
      const focusHandler = vi.fn(() => {});

      $ref(".queued-ops")
        .text("queued text")
        .attr({ "data-queued": "true" })
        .e("focus", { handler: focusHandler });

      expect(document.querySelector(".queued-ops")).toBeNull();

      const el = document.createElement("div");
      el.className = "queued-ops";
      document.body.appendChild(el);

      checkMultiSelectors();
      await delay(10);

      expect(el.textContent).toBe("queued text");
      expect(el.getAttribute("data-queued")).toBe("true");

      el.dispatchEvent(new Event("focus"));
      expect(focusHandler).toHaveBeenCalledTimes(1);
    });

    test("auto-watch when element doesn't exist", async () => {
      const clickHandler = vi.fn(() => {});

      $ref(".auto-watch").attr({ "data-test": "value" }).on("click", clickHandler);

      const newElement = document.createElement("div");
      newElement.className = "auto-watch";
      document.body.appendChild(newElement);

      checkMultiSelectors();
      await delay(10);

      expect(newElement.getAttribute("data-test")).toBe("value");

      newElement.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("refObserver auto-cleans tracked element on removal", async () => {
      const clickHandler = vi.fn(() => {});
      $ref(".auto-clean").on("click", clickHandler);

      const el = document.createElement("div");
      el.className = "auto-clean";
      document.body.appendChild(el);

      checkMultiSelectors();
      for (let __i = 0; __i < 50; __i++) {
        if (peekState(el) !== undefined) break;
        await delay();
      }

      expect(peekState(el)).toBeDefined();

      el.remove();
      for (let __i = 0; __i < 50; __i++) {
        if (peekState(el) === undefined) break;
        await delay();
      }

      expect(peekState(el)).toBeUndefined();
    });

    test("stops watching after the ref resolves", async () => {
      $ref(".late-element").attr({ "data-test": "value" });
      expect(multiSelectors.size).toBe(1);

      const first = document.createElement("div");
      first.className = "late-element";
      document.body.appendChild(first);

      checkMultiSelectors();
      await delay();

      expect(first.getAttribute("data-test")).toBe("value");
      expect(multiSelectors.size).toBe(0);

      const second = document.createElement("div");
      second.className = "late-element";
      document.body.appendChild(second);

      checkMultiSelectors();
      await delay();

      expect(second.getAttribute("data-test")).toBeNull();
    });

    test("wraps a passed element without selector watching", () => {
      const el = document.createElement("button");

      const ref = $ref(el);
      ref.attr({ "data-test": "value" });

      expect(ref()).toBe(el);
      expect(ref.node).toBe(el);
      expect(el.getAttribute("data-test")).toBe("value");
      expect(multiSelectors.size).toBe(0);
    });

    test("element input applies text, on, and hooks immediately", () => {
      const el = document.createElement("button");
      document.body.appendChild(el);

      const clickHandler = vi.fn(() => {});
      const mountHandler = vi.fn(() => {});

      $ref(el).text("Hello").on("click", clickHandler).hooks({ afterMount: mountHandler });

      expect(el.textContent).toBe("Hello");

      el.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);

      expect(mountHandler).toHaveBeenCalledTimes(1);
    });

    test("null element input is a safe no-op", () => {
      const ref = $ref(null as unknown as Element);

      expect(ref()).toBeNull();

      ref.text("test");
      ref.on("click", () => {});
      ref.hooks({ afterMount: () => {} });

      expect(multiSelectors.size).toBe(0);
    });

    test("afterMount on a detached element defers until insertion into a mount container", async () => {
      const mountHandler = vi.fn(() => {});
      const el = document.createElement("div");
      el.className = "detached-ref";

      $ref(el).hooks({ afterMount: mountHandler }).attr({ "data-test": "value" });

      expect(el.getAttribute("data-test")).toBe("value");
      expect(mountHandler).toHaveBeenCalledTimes(0);

      mount(<p>host</p>);
      document.getElementById("app")!.appendChild(el);
      await delay(10);

      expect(mountHandler).toHaveBeenCalledTimes(1);
    });

    test("refObserver cleans a bound element removed inside a stateless wrapper", async () => {
      const clickHandler = vi.fn(() => {});
      $ref(".wrapped-clean").on("click", clickHandler);

      const wrapper = document.createElement("div");
      const el = document.createElement("div");
      el.className = "wrapped-clean";
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      checkMultiSelectors();
      for (let __i = 0; __i < 50; __i++) {
        if (peekState(el) !== undefined) break;
        await delay();
      }
      expect(peekState(el)).toBeDefined();
      expect(peekState(wrapper)).toBeUndefined();

      wrapper.remove();
      for (let __i = 0; __i < 50; __i++) {
        if (peekState(el) === undefined) break;
        await delay();
      }
      expect(peekState(el)).toBeUndefined();
    });
  });
});
