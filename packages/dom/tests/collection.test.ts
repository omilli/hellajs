import { describe, test, expect, beforeEach, mock } from "bun:test";
import { $collection, checkMultiSelectors, multiSelectors, getState } from "@hellajs/dom/bundle";
import type { DomWrapper } from "@hellajs/dom";

beforeEach(() => {
  resetTestState(`
    <div id="app"></div>
    <span class="item">A</span>
    <span class="item">B</span>
    <input id="text-input" type="text" />
  `);
});

describe("dom", () => {
  describe("$collection", () => {
    test("selects existing elements", () => {
      const ref = $collection(".item");
      expect(ref.length).toBe(2);
      expect(ref()?.textContent).toBe("A");
      expect(ref(1)?.textContent).toBe("B");
    });

    test("binds static content", () => {
      const ref = $collection(".item");
      ref.bind("Updated");
      expect(document.querySelectorAll(".item")[0]?.textContent).toBe("Updated");
      expect(document.querySelectorAll(".item")[1]?.textContent).toBe("Updated");
    });

    test("binds reactive signal content", () => {
      const content = signal("reactive");
      $collection(".item").bind(content);
      expect(document.querySelectorAll(".item")[0]?.textContent).toBe("reactive");

      content("changed");
      flush();
      expect(document.querySelectorAll(".item")[0]?.textContent).toBe("changed");
    });

    test("binds static and reactive attributes", () => {
      const isActive = signal(false);
      const inputValue = signal("initial");

      $collection("#app").bind({
        "data-static": "value",
        class: () => isActive() ? "active" : "inactive"
      });

      $collection("#text-input").bind(inputValue);

      const app = document.getElementById("app")!;
      const input = document.getElementById("text-input") as HTMLInputElement;

      expect(app.getAttribute("data-static")).toBe("value");
      expect(app.className).toBe("inactive");
      expect(input.value).toBe("initial");
      expect(input.textContent).toBe("");

      isActive(true);
      inputValue("updated");
      flush();

      expect(app.className).toBe("active");
      expect(input.value).toBe("updated");
    });

    test("attaches event handlers with context", () => {
      const clickHandler = mock((context?: string | null) => { context; });

      $collection(".item").on("click", function (this: Element) {
        clickHandler(this.textContent);
      });

      document.querySelectorAll(".item")[0]?.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(clickHandler).toHaveBeenCalledWith("A");

      document.querySelectorAll(".item")[1]?.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(2);
      expect(clickHandler).toHaveBeenCalledWith("B");
    });

    test("forEach iteration with per-element logic", () => {
      const texts: string[] = [];

      $collection(".item").forEach((el: DomWrapper, idx: number) => {
        texts.push(el.node!.textContent!);
        el.bind(`Item ${idx}`);
      });

      expect(texts).toEqual(["A", "B"]);
      expect(document.querySelectorAll(".item")[0]?.textContent).toBe("Item 0");
      expect(document.querySelectorAll(".item")[1]?.textContent).toBe("Item 1");
    });

    test("lazy binding for dynamic elements", () => {
      const clickHandler = mock(() => { });
      const content = signal("lazy");

      $collection(".lazy")
        .bind(content)
        .bind({ "data-test": "value" })
        .on("click", clickHandler);

      expect(document.querySelector(".lazy")).toBeNull();

      const div = document.createElement("div");
      div.className = "lazy";
      document.body.appendChild(div);

      // Manually trigger the multi-selector check (normally done by MutationObserver)
      checkMultiSelectors();

      expect(document.querySelector(".lazy")?.textContent).toBe("lazy");
      expect(document.querySelector(".lazy")?.getAttribute("data-test")).toBe("value");

      document.querySelector(".lazy")?.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);

      content("updated");
      flush();
      expect(document.querySelector(".lazy")?.textContent).toBe("updated");
    });

    test("dispose stops watching for elements", () => {
      const ref = $collection(".disposable").bind({ "data-processed": "true" });
      expect(multiSelectors.size).toBe(1);

      ref.dispose();
      expect(multiSelectors.size).toBe(0);

      const div = document.createElement("div");
      div.className = "disposable";
      document.body.appendChild(div);
      checkMultiSelectors();

      expect(document.querySelector(".disposable")?.getAttribute("data-processed")).toBeNull();
    });

    test("attaches lifecycle hooks to existing mounted elements", () => {
      resetTestState('<div id="container"></div>');

      const div1 = document.createElement("div");
      div1.className = "hookable";
      getState(div1).isMounted = true;

      const div2 = document.createElement("div");
      div2.className = "hookable";
      getState(div2).isMounted = true;

      document.getElementById("container")?.appendChild(div1);
      document.getElementById("container")?.appendChild(div2);

      const mountHandler = mock(() => { });
      $collection(".hookable").hooks({
        afterMount: mountHandler
      });

      expect(mountHandler).toHaveBeenCalledTimes(2);
    });

    test("method chaining", () => {
      const count = signal(0);

      $collection(".item")
        .bind(() => `Count: ${count()}`)
        .bind({ "data-reactive": "true" })
        .forEach((el: DomWrapper, idx: number) => el.bind({ "data-index": idx.toString() }))
        .on("click", () => count(count() + 1));

      flush();
      const items = document.querySelectorAll(".item");
      expect(items[0]?.textContent).toBe("Count: 0");
      expect(items[0]?.getAttribute("data-reactive")).toBe("true");
      expect(items[0]?.getAttribute("data-index")).toBe("0");
      expect(items[1]?.getAttribute("data-index")).toBe("1");

      items[0]?.dispatchEvent(new Event("click"));
      flush();
      expect(items[0]?.textContent).toBe("Count: 1");
    });

    test("indexed element access", () => {
      const ref = $collection(".item");

      expect(ref[0]?.node?.textContent).toBe("A");
      expect(ref[1]?.node?.textContent).toBe("B");

      ref[0]?.bind("First");
      ref[1]?.bind("Second");

      expect(document.querySelectorAll(".item")[0]?.textContent).toBe("First");
      expect(document.querySelectorAll(".item")[1]?.textContent).toBe("Second");
    });

    test("mutation callback schedules check", async () => {
      $collection(".scheduled").bind("test");
      expect(multiSelectors.size).toBe(1);

      checkMultiSelectors();

      await tick(10);

      const div = document.createElement("div");
      div.className = "scheduled";
      document.body.appendChild(div);

      checkMultiSelectors();
      await tick(10);

      expect(div.textContent).toBe("test");
    });
  });
});