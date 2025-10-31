import { describe, test, expect, beforeEach } from "bun:test";
import { mount } from "../";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("mount", () => {
  const createDiv = (id: string, children?: any[]) => {
    mount({ tag: "div", props: { id }, children: children || [] });
    return document.getElementById(id);
  };

  const expectTextContent = (selector: string, text: string) => {
    expect(document.querySelector(selector)?.textContent).toBe(text);
  };

  const span = (text: string) => ({ tag: "span", children: [text] });

  const counter = () => {
    let count = 0;
    return () => ++count;
  };

  test("renders different child types", () => {
    createDiv("text-child", ["hello"]);
    expectTextContent("#text-child", "hello");

    createDiv("node-child", [span("world")]);
    expectTextContent("#node-child span", "world");

    createDiv("null-children", [null, undefined]);
    const nullDiv = document.querySelector("#null-children");
    expect(Array.from(nullDiv?.childNodes ?? []).every(n => n.nodeType === Node.COMMENT_NODE)).toBe(true);

    createDiv("function-text", [() => "dynamic"]);
    expectTextContent("#function-text", "dynamic");

    createDiv("function-node", [() => span("reactive")]);
    expectTextContent("#function-node span", "reactive");
  });

  test("updates on signal changes", () => {
    const count = signal(0);
    mount(() => ({ tag: "div", props: { id: "counter" }, children: [count] }));

    expectTextContent("#counter", "0");

    count(5);
    flush();
    expectTextContent("#counter", "5");
  });

  test("sets properties and attributes", () => {
    mount({ tag: "input", props: { value: "test", type: "text", "data-custom": "attr" }, children: [] });
    const input = document.querySelector("input")!;

    expect(input.value).toBe("test");
    expect(input.getAttribute("type")).toBe("text");
    expect(input.getAttribute("data-custom")).toBe("attr");
  });

  test("updates dynamic properties", () => {
    const className = signal("initial");
    mount({ tag: "input", props: { class: className }, children: [] });
    const input = document.querySelector("input")!;

    expect(input.className).toBe("initial");

    className("updated");
    flush();
    expect(input.className).toBe("updated");
  });

  test("handles event listeners", () => {
    let clicked = false;
    mount({ tag: "button", props: { onclick: () => { clicked = true; } }, children: [] });
    const button = document.querySelector("button")!;

    button.dispatchEvent(new Event("click"));
    expect(clicked).toBe(true);
  });

  test("renders fragments", () => {
    const items = ["x", "y", "z"];
    mount({
      tag: "div",
      props: { id: "fragment-container" },
      children: [{
        tag: "$",
        props: {},
        children: items.map(span)
      }]
    });

    const container = document.getElementById("fragment-container")!;
    expect(container.children.length).toBe(3);
    items.forEach((text, i) => {
      expect(container.children[i]?.textContent).toBe(text);
    });
  });

  test("calls lifecycle hooks", () => {
    const updateCounter = counter();
    const count = signal(0);

    mount(() => ({
      tag: "div",
      props: { onUpdate: updateCounter },
      children: [count]
    }));

    count(1);
    flush();
    expect(updateCounter()).toBeGreaterThan(1);
  });

  test("stores onDestroy hook", () => {
    const destroyCounter = counter();
    mount({
      tag: "div",
      props: { id: "destroyable", onDestroy: destroyCounter },
      children: ["content"]
    });

    const element = document.querySelector("#destroyable");
    (element as any)?.onDestroy?.();
    expect(destroyCounter()).toBe(2);
  });

  test("handles empty or missing children", () => {
    mount({ tag: "div", props: { id: "no-children" } });
    const noChildren = document.getElementById("no-children")!;
    expect(noChildren.children.length).toBe(0);

    const emptyChildren = createDiv("empty-children", []);
    expect(emptyChildren!.children.length).toBe(0);

    mount({
      tag: "div",
      props: { id: "empty-fragment" },
      children: [{ tag: "$" }]
    });
    const emptyFragment = document.getElementById("empty-fragment")!;
    expect(emptyFragment.children.length).toBe(0);
  });

  test("handles dynamic fragments", () => {
    const items = signal(["a", "b"]);
    mount(() => ({
      tag: "div",
      props: { id: "dynamic-list" },
      children: [
        () => ({
          tag: "$",
          props: {},
          children: items().map(span)
        })
      ]
    }));

    const list = document.getElementById("dynamic-list")!;
    expect(list.children.length).toBe(2);
    expectTextContent("#dynamic-list span:nth-child(1)", "a");
    expectTextContent("#dynamic-list span:nth-child(2)", "b");

    items(["x", "y", "z"]);
    flush();
    expect(list.children.length).toBe(3);
    expectTextContent("#dynamic-list span:nth-child(1)", "x");
    expectTextContent("#dynamic-list span:nth-child(2)", "y");
    expectTextContent("#dynamic-list span:nth-child(3)", "z");
  });

  test("batches static children with fragments", () => {
    mount({
      tag: "div",
      props: { id: "batch-test" },
      children: [
        "Text node 1",
        span("Static span 1"),
        "Text node 2",
        span("Static span 2"),
        "Text node 3"
      ]
    });

    const container = document.getElementById("batch-test")!;
    expect(container.childNodes.length).toBe(5);
    expect(container.childNodes[0]?.textContent).toBe("Text node 1");
    expect(container.childNodes[1]?.textContent).toBe("Static span 1");
    expect(container.childNodes[2]?.textContent).toBe("Text node 2");
    expect(container.childNodes[3]?.textContent).toBe("Static span 2");
    expect(container.childNodes[4]?.textContent).toBe("Text node 3");
  });

  test("flushes fragments before reactive children", () => {
    const reactiveText = signal("reactive");
    mount({
      tag: "div",
      props: { id: "flush-test" },
      children: [
        "Static before",
        span("Static span"),
        () => reactiveText(),
        "Static after"
      ]
    });

    const container = document.getElementById("flush-test")!;
    expect(container.childNodes.length).toBe(6);
    expect(container.childNodes[0]?.textContent).toBe("Static before");
    expect(container.childNodes[1]?.textContent).toBe("Static span");
    expect(container.childNodes[5]?.textContent).toBe("Static after");

    const startComment = container.childNodes[2];
    const reactiveNode = container.childNodes[3];
    const endComment = container.childNodes[4];

    expect(startComment?.nodeType).toBe(Node.COMMENT_NODE);
    expect(reactiveNode?.textContent).toBe("reactive");
    expect(endComment?.nodeType).toBe(Node.COMMENT_NODE);
  });

  test("handles effects array lifecycle", () => {
    const count = signal(0);
    let effectValue = 0;

    mount({
      tag: "div",
      props: {
        id: "effects-test",
        effects: [() => { effectValue = count(); }]
      },
      children: ["content"]
    });

    expect(effectValue).toBe(0);

    count(5);
    flush();
    expect(effectValue).toBe(5);
  });

  test("conditionals don't render false, null, or undefined as strings", () => {
    const showContent = signal(false);

    mount({
      tag: "div",
      props: { id: "conditional-test" },
      children: [
        "before",
        () => showContent() ? "visible" : false,
        "after"
      ]
    });

    const container = document.getElementById("conditional-test")!;
    expect(container.textContent).toBe("beforeafter");
    expect(container.textContent).not.toContain("false");

    showContent(true);
    flush();
    expect(container.textContent).toBe("beforevisibleafter");

    showContent(false);
    flush();
    expect(container.textContent).toBe("beforeafter");
    expect(container.textContent).not.toContain("false");
  });

  test("conditionals handle null and undefined correctly", () => {
    const value = signal<string | null | undefined>("content");

    mount({
      tag: "div",
      props: { id: "null-test" },
      children: [() => value()]
    });

    const container = document.getElementById("null-test")!;
    expect(container.textContent).toBe("content");

    value(null);
    flush();
    expect(container.textContent).toBe("");
    expect(container.textContent).not.toContain("null");

    value(undefined);
    flush();
    expect(container.textContent).toBe("");
    expect(container.textContent).not.toContain("undefined");

    value("restored");
    flush();
    expect(container.textContent).toBe("restored");
  });

  test("static false/null/undefined values don't render as strings", () => {
    mount({
      tag: "div",
      props: { id: "static-test" },
      children: ["text", false, null, undefined, "more"]
    });

    const container = document.getElementById("static-test")!;
    expect(container.textContent).toBe("textmore");
    expect(container.textContent).not.toContain("false");
    expect(container.textContent).not.toContain("null");
    expect(container.textContent).not.toContain("undefined");
  });

  test("zero is rendered correctly", () => {
    const num = signal(0);

    mount({
      tag: "div",
      props: { id: "zero-test" },
      children: [() => num()]
    });

    const container = document.getElementById("zero-test")!;
    expect(container.textContent).toBe("0");

    num(42);
    flush();
    expect(container.textContent).toBe("42");

    num(0);
    flush();
    expect(container.textContent).toBe("0");
  });

  test("disabled=false does NOT disable button (JSX)", () => {
    mount({
      tag: "button",
      props: { id: "btn", disabled: false as any },
      children: ["Click"]
    });

    const button = document.getElementById("btn") as HTMLButtonElement;

    // The button should NOT be disabled
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("disabled")).toBe(false);

    // Verify button is actually clickable
    let clicked = false;
    button.onclick = () => { clicked = true; };
    button.click();
    expect(clicked).toBe(true);
  });

  test("null prop values do not set attributes", () => {
    mount({
      tag: "input",
      props: { id: "input", readonly: null as any },
      children: []
    });

    const input = document.getElementById("input") as HTMLInputElement;
    expect(input.hasAttribute("readonly")).toBe(false);
  });

  test("undefined prop values do not set attributes", () => {
    mount({
      tag: "input",
      props: { id: "input2", disabled: undefined as any },
      children: []
    });

    const input = document.getElementById("input2") as HTMLInputElement;
    expect(input.hasAttribute("disabled")).toBe(false);
  });

  test("reactive false values remove attributes", () => {
    const isDisabled = signal(true);

    mount({
      tag: "button",
      props: { id: "reactive-btn", disabled: () => isDisabled() ? "disabled" : false },
      children: ["Toggle"]
    });

    const button = document.getElementById("reactive-btn") as HTMLButtonElement;
    expect(button.hasAttribute("disabled")).toBe(true);

    isDisabled(false);
    flush();
    expect(button.hasAttribute("disabled")).toBe(false);
  });
});
