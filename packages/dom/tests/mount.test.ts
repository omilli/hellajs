import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, flushMount, queueCleanup } from "@hellajs/dom/bundle";
import type { HellaNode, HellaElement } from "@hellajs/dom";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("reactive rendering", () => {
  test("mounts static and dynamic content", () => {
    mount(html`<div id="static">Hello</div>`);
    expect(document.getElementById("static")?.textContent).toBe("Hello");

    const nested = html`<div><span>Nested</span></div>` as HellaNode;
    expect(nested.children![0] as HellaNode).toHaveProperty("tag", "span");

    const multi = html`<div>A</div><div>B</div>` as HellaNode;
    expect(multi.tag).toBe("$");
    expect(multi.children!.length).toBe(2);

    const selfClose = html`<input type="text" placeholder="Enter" />` as HellaNode;
    expect(selfClose.tag).toBe("input");
    expect(selfClose.props!.type).toBe("text");

    const bool = html`<input disabled />` as HellaNode;
    expect(bool.props!.disabled).toBe(true);
  });

  test("renders reactive signals", () => {
    const count = signal(0);
    const className = signal("initial");

    mount(html`<div id="reactive" bind:class=${className}>${count}</div>`);
    const el = document.getElementById("reactive")!;

    expect(el.textContent).toBe("0");
    expect(el.className).toBe("initial");

    count(42);
    flush();
    expect(el.textContent).toBe("42");

    className("updated");
    flush();
    expect(el.className).toBe("updated");
  });

  test("handles computed values", () => {
    const a = signal(1);
    const b = signal(2);

    mount(html`<div id="computed">${a} + ${b} = ${() => a() + b()}</div>`);
    const el = document.getElementById("computed")!;

    expect(el.textContent).toBe("1 + 2 = 3");

    a(10);
    b(20);
    flush();
    expect(el.textContent).toBe("10 + 20 = 30");
  });

  test("conditionals without falsy strings", () => {
    const show = signal(true);
    const value = signal<string | null | undefined>("content");

    mount(html`
      <div id="cond-container">
        <span id="toggle">${() => show() ? html`<b>Yes</b>` : html`<b>No</b>`}</span>
        <span id="nullable">${() => value()}</span>
        <span id="static-falsy">before${false}${null}${undefined}after</span>
      </div>
    `);

    expect(document.querySelector("#toggle b")?.textContent).toBe("Yes");

    show(false);
    flush();
    expect(document.querySelector("#toggle b")?.textContent).toBe("No");

    expect(document.getElementById("nullable")?.textContent).toBe("content");

    value(null);
    flush();
    expect(document.getElementById("nullable")?.textContent).toBe("");
    expect(document.getElementById("nullable")?.textContent).not.toContain("null");

    value(undefined);
    flush();
    expect(document.getElementById("nullable")?.textContent).toBe("");

    expect(document.getElementById("static-falsy")?.textContent).toBe("beforeafter");

    value("0");
    flush();
    const zeroSig = signal(0);
    mount(html`<span id="zero">${zeroSig}</span>`);
    expect(document.getElementById("zero")?.textContent).toBe("0");
  });

  test("event handlers fire and delegate", () => {
    let clicked = 0;
    let delegatedClicked = 0;

    mount(html`
      <div id="event-container">
        <button id="btn" on:click=${() => clicked++}>Click</button>
        <div id="parent" on:click=${() => delegatedClicked++}>
          <span id="child">Child</span>
        </div>
      </div>
    `);

    document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicked).toBe(1);

    document.getElementById("child")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(delegatedClicked).toBe(1);

    let hovers = 0;
    mount(html`<div id="multi" on:click=${() => clicked++} on:mouseenter=${() => hovers++}></div>`);
    const multi = document.getElementById("multi")!;

    multi.dispatchEvent(new Event("click"));
    multi.dispatchEvent(new Event("mouseenter"));
    expect(clicked).toBe(2);
    expect(hovers).toBe(1);
  });

  test("mounts to selector or element", () => {
    mount({ tag: "div", props: { id: "default" }, children: ["Default"] });
    expect(document.getElementById("default")).not.toBeNull();

    document.body.innerHTML = '<div id="custom"></div>';
    mount({ tag: "span", children: ["Custom"] }, "#custom");
    expect(document.querySelector("#custom span")).not.toBeNull();

    const container = document.createElement("div");
    document.body.appendChild(container);
    mount({ tag: "b", children: ["Direct"] }, container);
    expect(container.querySelector("b")?.textContent).toBe("Direct");
  });

  test("static and reactive props", () => {
    const isDisabled = signal(true);

    mount({
      tag: "button",
      props: { id: "prop-test", type: "submit", "data-custom": "value" },
      bind: { disabled: () => isDisabled() ? "disabled" : false },
      children: ["Submit"]
    });

    const btn = document.getElementById("prop-test") as HTMLButtonElement;
    expect(btn.getAttribute("type")).toBe("submit");
    expect(btn.getAttribute("data-custom")).toBe("value");
    expect(btn.hasAttribute("disabled")).toBe(true);

    isDisabled(false);
    flush();
    expect(btn.hasAttribute("disabled")).toBe(false);

    mount({ tag: "input", props: { id: "null-prop", readonly: null } });
    expect(document.getElementById("null-prop")?.hasAttribute("readonly")).toBe(false);
  });

  test("fragments and dynamic fragments", () => {
    const items = signal(["a", "b"]);

    mount({
      tag: "div",
      props: { id: "frag-container" },
      children: [
        { tag: "$", children: [{ tag: "span", children: ["Static 1"] }, { tag: "span", children: ["Static 2"] }] },
        () => ({ tag: "$", children: items().map(i => ({ tag: "em", children: [i] })) })
      ]
    });

    const container = document.getElementById("frag-container")!;
    expect(container.querySelectorAll("span").length).toBe(2);
    expect(container.querySelectorAll("em").length).toBe(2);

    items(["x", "y", "z"]);
    flush();
    expect(container.querySelectorAll("em").length).toBe(3);
    expect(container.querySelectorAll("em")[2]?.textContent).toBe("z");
  });
});

describe("lifecycle hooks", () => {
  test("lifecycle execution order", () => {
    const value = signal("initial");
    const callOrder: string[] = [];
    let receivedNode: Element | undefined;

    mount({
      tag: "div",
      props: { id: "lifecycle-test" },
      hooks: {
        beforeMount: () => callOrder.push("beforeMount"),
        afterMount: (node) => {
          callOrder.push("afterMount");
          receivedNode = node;
        },
        beforeUpdate: () => callOrder.push("beforeUpdate"),
        afterUpdate: () => callOrder.push("afterUpdate")
      },
      bind: { "data-value": value }
    });

    expect(callOrder).toEqual(["beforeMount"]);

    flushMount(document.getElementById("app")!);
    expect(callOrder).toEqual(["beforeMount", "afterMount"]);
    expect(receivedNode?.id).toBe("lifecycle-test");

    value("updated");
    flush();
    expect(callOrder).toEqual(["beforeMount", "afterMount", "beforeUpdate", "afterUpdate"]);
  });

  test("destroy hooks and cleanup", () => {
    const callOrder: string[] = [];
    let clicked = 0;

    mount({
      tag: "button",
      props: { id: "destroyable" },
      hooks: {
        beforeDestroy: () => callOrder.push("beforeDestroy"),
        afterDestroy: () => callOrder.push("afterDestroy")
      },
      on: { click: () => clicked++ },
      children: ["Click"]
    });

    const el = document.getElementById("destroyable")!;
    el.dispatchEvent(new Event("click"));
    expect(clicked).toBe(1);

    el.remove();
    queueCleanup(el);

    expect(callOrder).toEqual(["beforeDestroy", "afterDestroy"]);
    expect((el as HellaElement).__hella_handlers).toBeUndefined();
  });

  test("nested hooks execute independently", () => {
    const parentCalls: string[] = [];
    const childCalls: string[] = [];

    mount({
      tag: "div",
      props: { id: "parent" },
      hooks: {
        beforeMount: () => parentCalls.push("beforeMount"),
        afterMount: () => parentCalls.push("afterMount")
      },
      children: [{
        tag: "span",
        hooks: {
          beforeMount: () => childCalls.push("beforeMount"),
          afterMount: () => childCalls.push("afterMount")
        }
      }]
    });

    expect(parentCalls).toEqual(["beforeMount"]);
    expect(childCalls).toEqual(["beforeMount"]);

    flushMount(document.getElementById("app")!);
    expect(parentCalls).toEqual(["beforeMount", "afterMount"]);
    expect(childCalls).toEqual(["beforeMount", "afterMount"]);
  });

  test("deeply nested afterMount order", () => {
    const calls: string[] = [];

    mount({
      tag: "div",
      props: { id: "grandparent" },
      hooks: { afterMount: () => calls.push("grandparent") },
      children: [{
        tag: "div",
        props: { id: "parent" },
        hooks: { afterMount: () => calls.push("parent") },
        children: [{
          tag: "span",
          hooks: { afterMount: () => calls.push("child") },
          children: [{
            tag: "b",
            hooks: { afterMount: () => calls.push("grandchild") },
            children: ["Deep"]
          }]
        }]
      }]
    });

    flushMount(document.getElementById("app")!);
    expect(calls).toEqual(["grandparent", "parent", "child", "grandchild"]);
  });
});

describe("html template features", () => {
  test("lifecycle hooks via hooks: prefix", () => {
    const hooks = {
      beforeMount: () => { },
      afterMount: () => { },
      beforeDestroy: () => { },
      afterDestroy: () => { }
    };

    const node = html`<div
      hooks:beforeMount=${hooks.beforeMount}
      hooks:afterMount=${hooks.afterMount}
      hooks:beforeDestroy=${hooks.beforeDestroy}
      hooks:afterDestroy=${hooks.afterDestroy}
    >Lifecycle</div>` as HellaNode;

    expect(node.hooks).toEqual(hooks);
  });

  test("combines props, bind, on, hooks", () => {
    const className = signal("active");
    const handleClick = () => { };
    const afterMount = () => { };

    const node = html`<div
      id="combo"
      bind:class=${className}
      on:click=${handleClick}
      hooks:afterMount=${afterMount}
    >Combined</div>` as HellaNode;

    expect(node.props!.id).toBe("combo");
    expect(node.bind!.class).toBe(className);
    expect(node.on!.click).toBe(handleClick);
    expect(node.hooks!.afterMount).toBe(afterMount);
  });

  test("component functions with children", () => {
    const Wrapper = (props: { children?: HellaNode; title: string }) =>
      html`<div class="wrapper"><h1>${props.title}</h1>${props.children}</div>`;

    const node = html`<${Wrapper} title="Hello"><span>Child</span></${Wrapper}>` as HellaNode;

    expect(node.tag).toBe("div");
    expect(node.props!.class).toBe("wrapper");
    expect((node.children![0] as HellaNode).children![0]).toBe("Hello");
  });

  test("handles unclosed tags and whitespace", () => {
    const whitespace = html`
      <div>
        <span>Text</span>
      </div>
    ` as HellaNode;
    expect(whitespace.children!.length).toBe(1);
    expect((whitespace.children![0] as HellaNode).tag).toBe("span");

    mount(html`<div><span>Unclosed`);
    expect(document.querySelector("#app div span")?.textContent).toBe("Unclosed");

    mount(html`Before<div>Middle</div>After`);
    expect(document.getElementById("app")?.textContent).toContain("Before");
    expect(document.getElementById("app")?.textContent).toContain("After");
  });

  test("root-level interpolation", () => {
    const getValue = () => ({ tag: "span", children: ["Dynamic"] });
    const funcNode = html`${getValue}`;
    expect(funcNode).toBe(getValue);

    const count = signal(42);
    const sigNode = html`${count}`;
    expect(sigNode as unknown).toEqual(count);

    const value = { tag: "div", children: ["Static"] };
    const staticNode = html`${value}`;
    expect(staticNode).toEqual(value);
  });
});
