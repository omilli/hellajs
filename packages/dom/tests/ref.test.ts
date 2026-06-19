import { describe, test, expect, beforeEach, mock } from "bun:test";
import { $ref, checkMultiSelectors, flushMount, queueCleanup, getState, peekState } from "@hellajs/dom/bundle";

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

    test("binds reactive signal content", () => {
      const content = signal("initial");
      $ref("#app").bind("Hello");
      expect(document.getElementById("app")?.textContent).toBe("Hello");

      $ref("#app").bind(content);
      expect(document.getElementById("app")?.textContent).toBe("initial");

      content("updated");
      flush();
      expect(document.getElementById("app")?.textContent).toBe("updated");
    });

    test("binds static and reactive attributes", () => {
      const isActive = signal(false);

      $ref("#app").bind({
        "data-static": "value",
        class: () => isActive() ? "active" : "inactive"
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
      $ref("#text-input").bind(inputValue);

      const input = document.getElementById("text-input") as HTMLInputElement;
      expect(input.value).toBe("initial");
      expect(input.textContent).toBe("");

      inputValue("updated");
      flush();
      expect(input.value).toBe("updated");
    });

    test("chains bind and on with reactive signal updates", () => {
      const count = signal(0);

      $ref("#app")
        .bind(() => `Count: ${count()}`)
        .bind({ "data-reactive": "true" })
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
      const clickHandler = mock(() => { });
      $ref("#app").on("click", clickHandler);

      document.getElementById("app")?.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("attaches lifecycle hooks", () => {
      const app = document.getElementById("app")!;
      getState(app).isMounted = true;

      const mountHandler = mock(() => { });
      $ref("#app").hooks({
        afterMount: mountHandler
      });

      expect(mountHandler).toHaveBeenCalledTimes(1);
    });

    test("all hook types work", () => {
      const app = document.getElementById("app")!;
      getState(app).isMounted = true;

      const afterMountHandler = mock(() => { });
      const beforeUpdateHandler = mock(() => { });
      const afterUpdateHandler = mock(() => { });

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
        }
      });

      expect(afterMountHandler).toHaveBeenCalledTimes(1);

      const count = signal(0);
      $ref("#app").bind(() => `Count: ${count()}`);
      flush();

      expect(beforeUpdateHandler).toHaveBeenCalledTimes(1);
      expect(afterUpdateHandler).toHaveBeenCalledTimes(1);
    });

    test("destroy hooks execute on removal", async () => {
      const beforeDestroyHandler = mock(() => { });
      const afterDestroyHandler = mock(() => { });

      const container = document.createElement("div");
      container.className = "destroy-test";
      document.body.appendChild(container);

      flushMount();

      $ref(".destroy-test").hooks({
        beforeDestroy: (el) => {
          beforeDestroyHandler();
          expect(el).toBe(container);
        },
        afterDestroy: () => { afterDestroyHandler(); }
      });

      container.remove();
      await tick(10);
      queueCleanup(container);

      expect(beforeDestroyHandler).toHaveBeenCalledTimes(1);
      expect(afterDestroyHandler).toHaveBeenCalledTimes(1);
    });

    test("afterMount fires when element appears", async () => {
      const mountHandler = mock(() => { });
      const clickHandler = mock(() => { });

      $ref(".future-element")
        .hooks({
          afterMount: (el) => {
            mountHandler();
            el!.textContent = "Watched!";
          }
        })
        .bind({ "data-test": "value" })
        .on("click", clickHandler);

      const newElement = document.createElement("div");
      newElement.className = "future-element";
      document.body.appendChild(newElement);

      checkMultiSelectors();
      await tick(10);

      expect(mountHandler).toHaveBeenCalledTimes(1);
      expect(newElement.textContent).toBe("Watched!");
      expect(newElement.getAttribute("data-test")).toBe("value");

      newElement.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);

      const element2 = document.createElement("div");
      element2.className = "future-element";
      document.body.appendChild(element2);

      checkMultiSelectors();
      await tick(10);
      expect(mountHandler).toHaveBeenCalledTimes(1);
    });

    test("safe no-op when element not found", () => {
      const ref = $ref(".missing");

      ref.bind("test");
      ref.bind({ class: "test" });
      ref.on("click", () => { });
      ref.hooks({ afterMount: () => { } });
    });

    test("auto-watch when element doesn't exist", async () => {
      const clickHandler = mock(() => { });

      $ref(".auto-watch")
        .bind({ "data-test": "value" })
        .on("click", clickHandler);

      const newElement = document.createElement("div");
      newElement.className = "auto-watch";
      document.body.appendChild(newElement);

      checkMultiSelectors();
      await tick(10);

      expect(newElement.getAttribute("data-test")).toBe("value");

      newElement.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("refObserver auto-cleans tracked element on removal without explicit queueCleanup", async () => {
      const clickHandler = mock(() => {});
      $ref(".auto-clean").on("click", clickHandler);

      const el = document.createElement("div");
      el.className = "auto-clean";
      document.body.appendChild(el);

      checkMultiSelectors();
      await wait(() => peekState(el) !== undefined);

      expect(peekState(el)).toBeDefined();

      el.remove();
      await wait(() => peekState(el) === undefined);

      expect(peekState(el)).toBeUndefined();
    });
  });
});