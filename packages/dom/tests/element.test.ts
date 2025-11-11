import { describe, test, expect, beforeEach } from "bun:test";
import { element } from "../";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="test"></div>
    <span class="target"></span>
    <input id="text-input" type="text" />
    <textarea id="textarea"></textarea>
    <select id="select">
      <option value="a">A</option>
      <option value="b">B</option>
    </select>
  `;
});

describe("element", () => {
  test("selects element and returns wrapper", () => {
    const wrapper = element("#test");
    expect(wrapper.node).toBeTruthy();
    expect(wrapper.node?.id).toBe("test");
  });

  test("returns null element for invalid selector", () => {
    const wrapper = element(".nonexistent");
    expect(wrapper.node).toBeNull();
  });

  test("text() sets static text content", () => {
    element("#test").text("hello world");
    expect(document.getElementById("test")?.textContent).toBe("hello world");
  });

  test("text() handles reactive signals", () => {
    const content = signal("initial");
    element("#test").text(content);

    expect(document.getElementById("test")?.textContent).toBe("initial");

    content("updated");
    flush();
    expect(document.getElementById("test")?.textContent).toBe("updated");
  });

  test("text() auto-detects input elements and sets value", () => {
    element("#text-input").text("input value");
    expect((document.getElementById("text-input") as HTMLInputElement)?.value).toBe("input value");
    expect(document.getElementById("text-input")?.textContent).toBe("");
  });

  test("text() auto-detects textarea elements and sets value", () => {
    element("#textarea").text("textarea content");
    expect((document.getElementById("textarea") as HTMLTextAreaElement)?.value).toBe("textarea content");
  });

  test("text() auto-detects select elements and sets value", () => {
    element("#select").text("b");
    expect((document.getElementById("select") as HTMLSelectElement)?.value).toBe("b");
  });

  test("text() handles reactive signals with form elements", () => {
    const inputValue = signal("initial");
    element("#text-input").text(inputValue);

    expect((document.getElementById("text-input") as HTMLInputElement)?.value).toBe("initial");

    inputValue("updated");
    flush();
    expect((document.getElementById("text-input") as HTMLInputElement)?.value).toBe("updated");
  });

  test("text() handles reactive functions with form elements", () => {
    const name = signal("John");
    const getValue = () => `Hello, ${name()}!`;

    element("#text-input").text(getValue);
    expect((document.getElementById("text-input") as HTMLInputElement)?.value).toBe("Hello, John!");

    name("Jane");
    flush();
    expect((document.getElementById("text-input") as HTMLInputElement)?.value).toBe("Hello, Jane!");
  });

  test("attr() sets static attributes using object", () => {
    element("#test").attr({ "data-value": "static" });
    expect(document.getElementById("test")?.getAttribute("data-value")).toBe("static");
  });

  test("attr() sets multiple attributes", () => {
    element("#test").attr({
      "data-value": "static",
      "class": "test-class",
      "id": "new-id"
    });
    expect(document.getElementById("new-id")?.getAttribute("data-value")).toBe("static");
    expect(document.getElementById("new-id")?.className).toBe("test-class");
  });

  test("attr() handles reactive signals", () => {
    const value = signal("initial");
    element("#test").attr({ "data-reactive": value });

    expect(document.getElementById("test")?.getAttribute("data-reactive")).toBe("initial");

    value("changed");
    flush();
    expect(document.getElementById("test")?.getAttribute("data-reactive")).toBe("changed");
  });

  test("attr() handles mixed static and reactive values", () => {
    const reactive = signal("reactive-value");
    element("#test").attr({
      "data-static": "static-value",
      "data-reactive": reactive
    });

    expect(document.getElementById("test")?.getAttribute("data-static")).toBe("static-value");
    expect(document.getElementById("test")?.getAttribute("data-reactive")).toBe("reactive-value");

    reactive("changed");
    flush();
    expect(document.getElementById("test")?.getAttribute("data-static")).toBe("static-value");
    expect(document.getElementById("test")?.getAttribute("data-reactive")).toBe("changed");
  });

  test("on() attaches event handlers", () => {
    let clicked = false;
    element("#test").on("click", () => { clicked = true; });

    document.getElementById("test")?.dispatchEvent(new Event("click"));
    expect(clicked).toBe(true);
  });

  test("methods are chainable", () => {
    const content = signal("chained");
    const result = element("#test")
      .text(content)
      .attr({ "class": "test-class" })
      .on("click", () => { });

    expect(result.node?.textContent).toBe("chained");
    expect(result.node?.className).toBe("test-class");
  });

  test("handles null element gracefully", () => {
    const wrapper = element(".nonexistent");

    // Should not throw errors
    expect(() => {
      wrapper
        .text("test")
        .attr({ "class": "test" })
        .on("click", () => { });
    }).not.toThrow();
  });

  test("works with function text values", () => {
    const content = signal("initial");
    const getText = () => `prefix: ${content()}`;

    element("#test").text(getText);
    expect(document.getElementById("test")?.textContent).toBe("prefix: initial");

    content("updated");
    flush();
    expect(document.getElementById("test")?.textContent).toBe("prefix: updated");
  });

  test("handles array values in attributes", () => {
    element("#test").attr({ "class": ["class1", "class2", "", "class3"] });
    expect(document.getElementById("test")?.className).toBe("class1 class2 class3");
  });

  test("attr() skips undefined values", () => {
    element("#test").attr({
      "data-defined": "value",
      // @ts-expect-error
      "data-undefined": undefined
    });
    expect(document.getElementById("test")?.getAttribute("data-defined")).toBe("value");
    expect(document.getElementById("test")?.hasAttribute("data-undefined")).toBe(false);
  });

  test("attr() removes attributes when value is false", () => {
    const el = document.getElementById("test");
    el?.setAttribute("disabled", "true");
    element("#test").attr({
      "disabled": false
    });
    expect(document.getElementById("test")?.hasAttribute("disabled")).toBe(false);
  });

  test("disabled=false does NOT disable button", () => {
    document.body.innerHTML = '<button id="btn">Click Me</button>';

    element("#btn").attr({
      "disabled": false
    });

    const button = document.getElementById("btn") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  test("attr() removes attributes when value is null", () => {
    const el = document.getElementById("test");
    el?.setAttribute("disabled", "true");
    element("#test").attr({
      "disabled": null
    });
    expect(document.getElementById("test")?.hasAttribute("disabled")).toBe(false);
  });

  test("attr() handles reactive false values by removing attribute", () => {
    const isDisabled = signal(true);
    element("#test").attr({
      "disabled": () => isDisabled() ? "disabled" : false
    });

    expect(document.getElementById("test")?.hasAttribute("disabled")).toBe(true);

    isDisabled(false);
    flush();
    expect(document.getElementById("test")?.hasAttribute("disabled")).toBe(false);
  });

  test("attr() handles reactive functions with object syntax", () => {
    const isActive = signal(false);
    element("#test").attr({
      "class": () => isActive() ? "active" : "inactive"
    });

    expect(document.getElementById("test")?.className).toBe("inactive");

    isActive(true);
    flush();
    expect(document.getElementById("test")?.className).toBe("active");
  });

  test("onLoad() fires immediately if element is already in DOM", () => {
    let loaded = false;
    element("#test").onLoad(() => {
      loaded = true;
    });

    expect(loaded).toBe(true);
  });

  test("onLoad() callback is stored for future additions", () => {
    const div = document.createElement("div");
    div.id = "test-future";
    document.body.appendChild(div);

    let loaded = false;
    const el = element("#test-future");

    el.onLoad(() => {
      loaded = true;
    });

    expect(loaded).toBe(true);
    expect((el.node as any).__hella_load).toBeDefined();
    expect((el.node as any).__hella_load.length).toBe(1);
  });

  test("onLoad() callbacks persist on element for re-additions", () => {
    const div = document.createElement("div");
    div.id = "reusable";
    document.body.appendChild(div);

    const el = element("#reusable");
    el.onLoad(() => { });

    // Verify callback is stored on the element
    expect((el.node as any).__hella_load).toBeDefined();
    expect((el.node as any).__hella_load.length).toBe(1);

    // Callbacks persist even after removal
    document.body.removeChild(div);
    expect((el.node as any).__hella_load.length).toBe(1);
  });

  test("operations queue when element is disconnected from DOM", () => {
    const div = document.createElement("div");
    div.id = "removable";
    document.body.appendChild(div);

    const el = element("#removable");
    el.text("persistent");
    el.attr({ "data-persistent": "yes" });

    expect(document.getElementById("removable")?.textContent).toBe("persistent");
    expect(document.getElementById("removable")?.getAttribute("data-persistent")).toBe("yes");

    // Remove from DOM
    document.body.removeChild(div);

    // Operations after removal should queue
    el.text("queued");
    el.attr({ "data-queued": "value" });

    // Verify operations were queued
    expect((el.node as any).__hella_queue).toBeDefined();
    expect((el.node as any).__hella_queue.length).toBeGreaterThan(0);
  });

  test("onLoad() is chainable with other methods", () => {
    let loaded = false;
    const content = signal("chained onLoad");

    const result = element("#test")
      .onLoad(() => {
        loaded = true;
      })
      .text(content)
      .attr({ "class": "chain-class" })
      .on("click", () => { });

    expect(loaded).toBe(true);
    expect(result.node?.textContent).toBe("chained onLoad");
    expect(result.node?.className).toBe("chain-class");
  });

  test("onLoad() executes immediately for elements already in DOM", () => {
    const parent = document.createElement("div");
    parent.id = "parent-test";

    const child = document.createElement("span");
    child.id = "child-test";
    parent.appendChild(child);

    document.body.appendChild(parent);

    let parentLoaded = false;
    let childLoaded = false;

    element("#parent-test").onLoad(() => {
      parentLoaded = true;
    });

    element("#child-test").onLoad(() => {
      childLoaded = true;
    });

    expect(parentLoaded).toBe(true);
    expect(childLoaded).toBe(true);
  });

  test("queued operations handle null element gracefully", async () => {
    const el = element("#never-exists");

    expect(() => {
      el.text("test");
      el.attr({ "class": "test" });
      el.on("click", () => { });
      el.onLoad(() => { });
    }).not.toThrow();
  });
});
