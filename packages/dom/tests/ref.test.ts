import { describe, test, expect, beforeEach } from "bun:test";
import { $ref, triggerMutationCallbacks, flushMount } from "@hellajs/dom/bundle";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="app"></div>
    <span class="item">A</span>
    <span class="item">B</span>
    <input id="text-input" type="text" />
  `;
});

describe("$ref", () => {
  test("selects first matching element", () => {
    const ref = $ref(".item");
    expect(ref()?.textContent).toBe("A");
    expect(ref.node?.textContent).toBe("A");
  });

  test("handles missing selectors and content binding", () => {
    const ref = $ref(".nonexistent");
    expect(ref()).toBeNull();
    expect(ref.node).toBeNull();

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

  test("attaches event handlers", () => {
    let clicked = false;
    $ref("#app").on("click", () => { clicked = true; });

    document.getElementById("app")?.dispatchEvent(new Event("click"));
    expect(clicked).toBe(true);
  });

  test("attaches lifecycle hooks", () => {
    const app = document.getElementById("app") as HellaElement;
    app.__hella_mounted = true;

    let mountCalled = false;
    $ref("#app").hooks({
      afterMount: () => { mountCalled = true; }
    });

    expect(mountCalled).toBe(true);
  });

  test("method chaining", () => {
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

  test("safe no-op when element not found", () => {
    const ref = $ref(".missing");

    // Should not throw
    ref.bind("test");
    ref.bind({ class: "test" });
    ref.on("click", () => { });
    ref.hooks({ afterMount: () => { } });
  });

  test("hooks - all hook types work", () => {
    const app = document.getElementById("app") as HellaElement;
    app.__hella_mounted = true;

    let afterMountCalled = false;
    let beforeUpdateCalled = false;
    let afterUpdateCalled = false;

    $ref("#app").hooks({
      afterMount: (el) => {
        expect(el).toBe(app);
        afterMountCalled = true;
      },
      beforeUpdate: (el) => {
        expect(el).toBe(app);
        beforeUpdateCalled = true;
      },
      afterUpdate: (el) => {
        expect(el).toBe(app);
        afterUpdateCalled = true;
      }
    });

    expect(afterMountCalled).toBe(true);

    const count = signal(0);
    $ref("#app").bind(() => `Count: ${count()}`);
    flush();

    expect(beforeUpdateCalled).toBe(true);
    expect(afterUpdateCalled).toBe(true);
  });

  test("hooks - destroy hooks execute on removal", async () => {
    let beforeDestroyCalled = false;
    let afterDestroyCalled = false;

    const container = document.createElement("div");
    container.className = "destroy-test";
    document.body.appendChild(container);

    flushMount();

    $ref(".destroy-test").hooks({
      beforeDestroy: (el) => {
        beforeDestroyCalled = true;
        expect(el).toBe(container);
      },
      afterDestroy: () => { afterDestroyCalled = true; }
    });

    container.remove();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(beforeDestroyCalled).toBe(true);
    expect(afterDestroyCalled).toBe(true);
  });

  test("hooks - afterMount waits for element", async () => {
    let callCount = 0;
    let clicked = false;

    $ref(".future-element")
      .hooks({
        afterMount: (el) => {
          callCount++;
          el!.textContent = "Watched!";
        }
      })
      .bind({ "data-test": "value" })
      .on("click", () => { clicked = true; });

    const newElement = document.createElement("div");
    newElement.className = "future-element";
    document.body.appendChild(newElement);

    triggerMutationCallbacks();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(callCount).toBe(1);
    expect(newElement.textContent).toBe("Watched!");
    expect(newElement.getAttribute("data-test")).toBe("value");

    newElement.dispatchEvent(new Event("click"));
    expect(clicked).toBe(true);

    const element2 = document.createElement("div");
    element2.className = "future-element";
    document.body.appendChild(element2);

    triggerMutationCallbacks();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(callCount).toBe(1);
  });

  test("auto-watch when element doesn't exist", async () => {
    let clicked = false;

    $ref(".auto-watch")
      .bind({ "data-test": "value" })
      .on("click", () => { clicked = true; });

    const newElement = document.createElement("div");
    newElement.className = "auto-watch";
    document.body.appendChild(newElement);

    triggerMutationCallbacks();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(newElement.getAttribute("data-test")).toBe("value");

    newElement.dispatchEvent(new Event("click"));
    expect(clicked).toBe(true);
  });
});
