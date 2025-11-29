import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ref, checkMultiSelectors, multiSelectors } from "../";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="app"></div>
    <span class="item">A</span>
    <span class="item">B</span>
    <input id="text-input" type="text" />
    <select id="select">
      <option value="a">A</option>
      <option value="b">B</option>
    </select>
  `;
});

afterEach(() => {
  multiSelectors.clear();
});

describe("$ref selection", () => {
  test("returns empty array for non-existent selector", () => {
    const ref = $ref(".nonexistent");
    expect(ref.length).toBe(0);
  });

  test("returns single element in array", () => {
    const ref = $ref("#app");
    expect(ref.length).toBe(1);
    expect(ref()?.id).toBe("app");
  });

  test("returns multiple elements in array", () => {
    const ref = $ref(".item");
    expect(ref.length).toBe(2);
    expect(ref()?.textContent).toBe("A");
    expect(ref(1)?.textContent).toBe("B");
  });
});

describe("$ref() callable", () => {
  test("returns first element by default", () => {
    const ref = $ref(".item");
    expect(ref()).toBe(document.querySelectorAll(".item")[0]);
  });

  test("returns element at specified index", () => {
    const ref = $ref(".item");
    expect(ref(0)).toBe(document.querySelectorAll(".item")[0]);
    expect(ref(1)).toBe(document.querySelectorAll(".item")[1]);
  });

  test("returns undefined for out-of-bounds index", () => {
    const ref = $ref(".item");
    expect(ref(99)).toBeUndefined();
  });

  test("returns undefined for empty ref", () => {
    const ref = $ref(".nonexistent");
    expect(ref()).toBeUndefined();
  });

  test("returns live DOM reference with current attributes", () => {
    const ref = $ref("#app");
    const node = ref();

    node?.setAttribute("data-test", "value");
    expect(ref()?.getAttribute("data-test")).toBe("value");

    node?.classList.add("modified");
    expect(ref()?.classList.contains("modified")).toBe(true);
  });

  test("reflects DOM mutations made outside ref", () => {
    const ref = $ref("#app");
    const directNode = document.getElementById("app");

    directNode?.setAttribute("data-external", "changed");
    expect(ref()?.getAttribute("data-external")).toBe("changed");
  });
});

describe("$ref.bind() with text", () => {
  test("applies static text to all elements", () => {
    $ref(".item").bind("Updated");
    const items = document.querySelectorAll(".item");
    expect(items[0]?.textContent).toBe("Updated");
    expect(items[1]?.textContent).toBe("Updated");
  });

  test("applies reactive signal to all elements", () => {
    const content = signal("initial");
    $ref(".item").bind(content);

    const items = document.querySelectorAll(".item");
    expect(items[0]?.textContent).toBe("initial");
    expect(items[1]?.textContent).toBe("initial");

    content("changed");
    flush();
    expect(items[0]?.textContent).toBe("changed");
    expect(items[1]?.textContent).toBe("changed");
  });

  test("applies reactive computed to all elements", () => {
    const count = signal(5);
    $ref(".item").bind(() => `Count: ${count()}`);

    const items = document.querySelectorAll(".item");
    expect(items[0]?.textContent).toBe("Count: 5");

    count(10);
    flush();
    expect(items[0]?.textContent).toBe("Count: 10");
  });

  test("auto-detects form elements and sets value", () => {
    $ref("#text-input").bind("input value");
    expect((document.getElementById("text-input") as HTMLInputElement)?.value).toBe("input value");
    expect(document.getElementById("text-input")?.textContent).toBe("");
  });

  test("handles reactive signals with form elements", () => {
    const inputValue = signal("initial");
    $ref("#text-input").bind(inputValue);

    expect((document.getElementById("text-input") as HTMLInputElement)?.value).toBe("initial");

    inputValue("updated");
    flush();
    expect((document.getElementById("text-input") as HTMLInputElement)?.value).toBe("updated");
  });
});

describe("$ref.bind() with attributes", () => {
  test("applies static attributes to all elements", () => {
    $ref(".item").bind({ "data-test": "value" });
    const items = document.querySelectorAll(".item");
    expect(items[0]?.getAttribute("data-test")).toBe("value");
    expect(items[1]?.getAttribute("data-test")).toBe("value");
  });

  test("applies multiple attributes", () => {
    $ref("#app").bind({
      "data-a": "1",
      "data-b": "2",
      "class": "container"
    });
    const el = document.getElementById("app");
    expect(el?.getAttribute("data-a")).toBe("1");
    expect(el?.getAttribute("data-b")).toBe("2");
    expect(el?.className).toBe("container");
  });

  test("applies reactive attributes to all elements", () => {
    const value = signal("v1");
    $ref(".item").bind({ "data-value": value });

    const items = document.querySelectorAll(".item");
    expect(items[0]?.getAttribute("data-value")).toBe("v1");
    expect(items[1]?.getAttribute("data-value")).toBe("v1");

    value("v2");
    flush();
    expect(items[0]?.getAttribute("data-value")).toBe("v2");
    expect(items[1]?.getAttribute("data-value")).toBe("v2");
  });

  test("handles reactive functions", () => {
    const isActive = signal(false);
    $ref("#app").bind({
      class: () => isActive() ? "active" : "inactive"
    });

    expect(document.getElementById("app")?.className).toBe("inactive");

    isActive(true);
    flush();
    expect(document.getElementById("app")?.className).toBe("active");
  });

  test("removes attributes when value is false", () => {
    const el = document.getElementById("app");
    el?.setAttribute("disabled", "true");
    $ref("#app").bind({ "disabled": false });
    expect(el?.hasAttribute("disabled")).toBe(false);
  });

  test("handles array values in class attribute", () => {
    $ref("#app").bind({ "class": ["class1", "class2", "", "class3"] });
    expect(document.getElementById("app")?.className).toBe("class1 class2 class3");
  });
});

describe("$ref.on()", () => {
  test("attaches event handlers to all elements", () => {
    let clickCount = 0;
    $ref(".item").on("click", () => { clickCount++; });

    document.querySelectorAll(".item")[0]?.dispatchEvent(new Event("click"));
    expect(clickCount).toBe(1);

    document.querySelectorAll(".item")[1]?.dispatchEvent(new Event("click"));
    expect(clickCount).toBe(2);
  });

  test("handler receives correct context", () => {
    let clickedText = "";
    $ref(".item").on("click", function () {
      clickedText = this.textContent || "";
    });

    document.querySelectorAll(".item")[0]?.dispatchEvent(new Event("click"));
    expect(clickedText).toBe("A");

    document.querySelectorAll(".item")[1]?.dispatchEvent(new Event("click"));
    expect(clickedText).toBe("B");
  });
});

describe("$ref.hooks()", () => {
  test("attaches mount hooks to all elements", () => {
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
});

describe("$ref.forEach()", () => {
  test("iterates over all elements", () => {
    const texts: string[] = [];
    const indices: number[] = [];

    $ref(".item").forEach((el, idx) => {
      texts.push(el.node!.textContent!);
      indices.push(idx);
    });

    expect(texts).toEqual(["A", "B"]);
    expect(indices).toEqual([0, 1]);
  });

  test("allows per-element custom logic", () => {
    $ref(".item").forEach((el, idx) => {
      el.bind(`Item ${idx}`);
    });

    const items = document.querySelectorAll(".item");
    expect(items[0]?.textContent).toBe("Item 0");
    expect(items[1]?.textContent).toBe("Item 1");
  });

  test("provides access to node for conditional logic", () => {
    document.body.innerHTML = `
      <div class="card" data-special="true">Special</div>
      <div class="card">Normal</div>
    `;

    $ref(".card").forEach((el) => {
      if (el.node?.getAttribute("data-special")) {
        el.bind({ "class": "card special" });
      }
    });

    expect(document.querySelectorAll(".card")[0]?.className).toBe("card special");
    expect(document.querySelectorAll(".card")[1]?.className).toBe("card");
  });

  test("returns ref for chaining", () => {
    const result = $ref(".item")
      .forEach((el) => el.bind("Step 1"))
      .bind("Step 2");

    expect(document.querySelectorAll(".item")[0]?.textContent).toBe("Step 2");
  });
});

describe("$ref chaining", () => {
  test("methods are chainable", () => {
    const result = $ref(".item")
      .bind("Hello")
      .bind({ "data-processed": "true" })
      .on("click", () => { });

    expect(result.length).toBe(2);
    expect(document.querySelectorAll(".item")[0]?.textContent).toBe("Hello");
    expect(document.querySelectorAll(".item")[0]?.getAttribute("data-processed")).toBe("true");
  });
});

describe("$ref lazy binding", () => {
  test("queues operations when no elements match initially", () => {
    $ref(".lazy").bind("Lazy content");

    const div = document.createElement("div");
    div.className = "lazy";
    document.body.appendChild(div);

    checkMultiSelectors();

    expect(document.querySelector(".lazy")?.textContent).toBe("Lazy content");
  });

  test("queues multiple operations", () => {
    let clicked = false;

    $ref(".lazy")
      .bind("Lazy")
      .bind({ "data-test": "value" })
      .on("click", () => { clicked = true; });

    const div = document.createElement("div");
    div.className = "lazy";
    document.body.appendChild(div);

    checkMultiSelectors();

    expect(document.querySelector(".lazy")?.textContent).toBe("Lazy");
    expect(document.querySelector(".lazy")?.getAttribute("data-test")).toBe("value");

    document.querySelector(".lazy")?.dispatchEvent(new Event("click"));
    expect(clicked).toBe(true);
  });

  test("applies reactive values to lazy elements", () => {
    const content = signal("initial");
    $ref(".lazy-reactive").bind(content);

    const div = document.createElement("div");
    div.className = "lazy-reactive";
    document.body.appendChild(div);

    checkMultiSelectors();
    expect(document.querySelector(".lazy-reactive")?.textContent).toBe("initial");

    content("updated");
    flush();
    expect(document.querySelector(".lazy-reactive")?.textContent).toBe("updated");
  });
});

describe("$ref watching for new elements", () => {
  test("applies operations to new elements as they appear", () => {
    $ref(".dynamic").bind({ "data-processed": "true" });

    // No initial element
    expect(document.querySelector(".dynamic")).toBeNull();

    // Add new element
    const div = document.createElement("div");
    div.className = "dynamic";
    document.body.appendChild(div);

    checkMultiSelectors();

    expect(document.querySelector(".dynamic")?.getAttribute("data-processed")).toBe("true");
  });

  test("applies forEach to new elements", () => {
    let applicationCount = 0;
    $ref(".counted").forEach(() => {
      applicationCount++;
    });

    expect(applicationCount).toBe(0);

    const div1 = document.createElement("div");
    div1.className = "counted";
    document.body.appendChild(div1);

    checkMultiSelectors();
    expect(applicationCount).toBe(1);

    const div2 = document.createElement("div");
    div2.className = "counted";
    document.body.appendChild(div2);

    checkMultiSelectors();
    expect(applicationCount).toBe(2);
  });

  test("prevents duplicate applications", () => {
    document.body.innerHTML = '<div class="duplicate">A</div>';

    let applicationCount = 0;
    $ref(".duplicate").forEach(() => {
      applicationCount++;
    });

    expect(applicationCount).toBe(1);

    // Multiple flushes shouldn't cause duplicates
    checkMultiSelectors();
    checkMultiSelectors();

    expect(applicationCount).toBe(1);
  });

  test("handles multiple new elements added at once", () => {
    $ref(".batch").bind({ "data-batch": "true" });

    const container = document.getElementById("app");
    let i = 0;
    while (i < 3) {
      const div = document.createElement("div");
      div.className = "batch";
      container?.appendChild(div);
      i++;
    }

    checkMultiSelectors();

    const items = document.querySelectorAll(".batch");
    expect(items.length).toBe(3);
    expect(items[0]?.getAttribute("data-batch")).toBe("true");
    expect(items[1]?.getAttribute("data-batch")).toBe("true");
    expect(items[2]?.getAttribute("data-batch")).toBe("true");
  });
});

describe("$ref.dispose()", () => {
  test("stops watching for new elements", () => {
    const ref = $ref(".disposable").bind({ "data-processed": "true" });

    ref.dispose();

    const div = document.createElement("div");
    div.className = "disposable";
    document.body.appendChild(div);

    checkMultiSelectors();

    expect(document.querySelector(".disposable")?.getAttribute("data-processed")).toBeNull();
  });

  test("clears queued operations", () => {
    const ref = $ref(".cleared");
    expect(multiSelectors.size).toBe(1);

    ref.dispose();
    expect(multiSelectors.size).toBe(0);
  });

  test("doesn't error on empty ref", () => {
    const ref = $ref(".nonexistent");
    expect(ref.length).toBe(0);
    expect(() => ref.dispose()).not.toThrow();
  });
});

describe("$ref integration", () => {
  test("works with existing and new elements together", () => {
    document.body.innerHTML = '<div class="mixed">Existing</div>';

    const texts: string[] = [];
    $ref(".mixed").forEach((el) => {
      texts.push(el.node!.textContent!);
    });

    expect(texts).toEqual(["Existing"]);

    const div = document.createElement("div");
    div.textContent = "New";
    div.className = "mixed";
    document.body.appendChild(div);

    checkMultiSelectors();

    expect(texts).toEqual(["Existing", "New"]);
  });

  test("complex chaining with mixed operations", () => {
    document.body.innerHTML = '<div id="container"></div>';

    const count = signal(0);
    const ref = $ref(".complex")
      .bind(() => `Count: ${count()}`)
      .bind({ "data-reactive": "true" })
      .forEach((el, idx) => {
        el.bind({ "data-index": idx.toString() });
      })
      .on("click", function () {
        count(count() + 1);
      });

    // Add elements
    let i = 0;
    while (i < 2) {
      const div = document.createElement("div");
      div.className = "complex";
      document.getElementById("container")?.appendChild(div);
      i++;
    }

    checkMultiSelectors();
    flush();

    const items = document.querySelectorAll(".complex");
    expect(items[0]?.textContent).toBe("Count: 0");
    expect(items[0]?.getAttribute("data-reactive")).toBe("true");
    expect(items[0]?.getAttribute("data-index")).toBe("0");
    expect(items[1]?.getAttribute("data-index")).toBe("1");

    items[0]?.dispatchEvent(new Event("click"));
    flush();

    expect(items[0]?.textContent).toBe("Count: 1");
    expect(items[1]?.textContent).toBe("Count: 1");
  });
});
