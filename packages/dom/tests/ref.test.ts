import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ref, checkMultiSelectors, multiSelectors } from "../";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="app"></div>
    <span class="item">A</span>
    <span class="item">B</span>
    <input id="text-input" type="text" />
  `;
});

afterEach(() => {
  multiSelectors.clear();
});

describe("$ref reactive DOM bindings", () => {
  test("selects and binds to existing elements", () => {
    const ref = $ref(".item");
    expect(ref.length).toBe(2);
    expect(ref()?.textContent).toBe("A");
    expect(ref(1)?.textContent).toBe("B");

    ref.bind("Updated");
    expect(document.querySelectorAll(".item")[0]?.textContent).toBe("Updated");
    expect(document.querySelectorAll(".item")[1]?.textContent).toBe("Updated");

    const content = signal("reactive");
    $ref(".item").bind(content);
    expect(document.querySelectorAll(".item")[0]?.textContent).toBe("reactive");

    content("changed");
    flush();
    expect(document.querySelectorAll(".item")[0]?.textContent).toBe("changed");
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

  test("attaches event handlers with correct context", () => {
    let clickCount = 0;
    let clickedText = "";

    $ref(".item").on("click", function() {
      clickCount++;
      clickedText = this.textContent || "";
    });

    document.querySelectorAll(".item")[0]?.dispatchEvent(new Event("click"));
    expect(clickCount).toBe(1);
    expect(clickedText).toBe("A");

    document.querySelectorAll(".item")[1]?.dispatchEvent(new Event("click"));
    expect(clickCount).toBe(2);
    expect(clickedText).toBe("B");
  });

  test("forEach iterates and enables per-element logic", () => {
    const texts: string[] = [];

    $ref(".item").forEach((el, idx) => {
      texts.push(el.node!.textContent!);
      el.bind(`Item ${idx}`);
    });

    expect(texts).toEqual(["A", "B"]);
    expect(document.querySelectorAll(".item")[0]?.textContent).toBe("Item 0");
    expect(document.querySelectorAll(".item")[1]?.textContent).toBe("Item 1");
  });

  test("lazy binding for dynamically added elements", () => {
    let clicked = false;
    const content = signal("lazy");

    $ref(".lazy")
      .bind(content)
      .bind({ "data-test": "value" })
      .on("click", () => { clicked = true; });

    expect(document.querySelector(".lazy")).toBeNull();

    const div = document.createElement("div");
    div.className = "lazy";
    document.body.appendChild(div);
    checkMultiSelectors();

    expect(document.querySelector(".lazy")?.textContent).toBe("lazy");
    expect(document.querySelector(".lazy")?.getAttribute("data-test")).toBe("value");

    document.querySelector(".lazy")?.dispatchEvent(new Event("click"));
    expect(clicked).toBe(true);

    content("updated");
    flush();
    expect(document.querySelector(".lazy")?.textContent).toBe("updated");
  });

  test("dispose stops watching for new elements", () => {
    const ref = $ref(".disposable").bind({ "data-processed": "true" });
    expect(multiSelectors.size).toBe(1);

    ref.dispose();
    expect(multiSelectors.size).toBe(0);

    const div = document.createElement("div");
    div.className = "disposable";
    document.body.appendChild(div);
    checkMultiSelectors();

    expect(document.querySelector(".disposable")?.getAttribute("data-processed")).toBeNull();
  });

  test("hooks method attaches lifecycle hooks", () => {
    document.body.innerHTML = '<div id="container"></div>';

    const div1 = document.createElement("div");
    div1.className = "hookable";
    (div1 as any).__hella_mounted = true;

    const div2 = document.createElement("div");
    div2.className = "hookable";
    (div2 as any).__hella_mounted = true;

    document.getElementById("container")?.appendChild(div1);
    document.getElementById("container")?.appendChild(div2);

    let mountCount = 0;
    $ref(".hookable").hooks({
      afterMount: () => { mountCount++; }
    });

    expect(mountCount).toBe(2);
  });

  test("chaining works across all methods", () => {
    const count = signal(0);

    $ref(".item")
      .bind(() => `Count: ${count()}`)
      .bind({ "data-reactive": "true" })
      .forEach((el, idx) => el.bind({ "data-index": idx.toString() }))
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
});
