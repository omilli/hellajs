import { describe, test, expect, beforeEach } from "bun:test";
import { $ref } from "@hellajs/dom/bundle";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="app"></div>
    <span class="item">A</span>
    <span class="item">B</span>
    <input id="text-input" type="text" />
  `;
});

describe("$ref single element bindings", () => {
  test("selects first matching element", () => {
    const ref = $ref(".item");
    expect(ref()?.textContent).toBe("A");
    expect(ref.node?.textContent).toBe("A");
  });

  test("returns null for non-existent selector", () => {
    const ref = $ref(".nonexistent");
    expect(ref()).toBeNull();
    expect(ref.node).toBeNull();
  });

  test("binds static text content", () => {
    $ref("#app").bind("Hello");
    expect(document.getElementById("app")?.textContent).toBe("Hello");
  });

  test("binds reactive text content", () => {
    const content = signal("initial");
    $ref("#app").bind(content);

    expect(document.getElementById("app")?.textContent).toBe("initial");

    content("updated");
    flush();
    expect(document.getElementById("app")?.textContent).toBe("updated");
  });

  test("binds attributes with static and reactive values", () => {
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

  test("auto-detects form elements for value binding", () => {
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

  test("hooks method attaches lifecycle hooks", () => {
    const app = document.getElementById("app") as HellaElement;
    app.__hella_mounted = true;

    let mountCalled = false;
    $ref("#app").hooks({
      afterMount: () => { mountCalled = true; }
    });

    expect(mountCalled).toBe(true);
  });

  test("chaining works across all methods", () => {
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
});
