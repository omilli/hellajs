import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, flushMountQueue, queueCleanup } from "../";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("reactive DOM rendering", () => {
  test("mounts static and dynamic content with html templates", () => {
    mount(html`<div id="static">Hello</div>`);
    expect(document.getElementById("static")?.textContent).toBe("Hello");

    const nested = html`<div><span>Nested</span></div>`;
    expect((nested as any).children[0].tag).toBe("span");

    const multi = html`<div>A</div><div>B</div>`;
    expect((multi as any).tag).toBe("$");
    expect((multi as any).children.length).toBe(2);

    const selfClose = html`<input type="text" placeholder="Enter" />`;
    expect((selfClose as any).tag).toBe("input");
    expect((selfClose as any).props.type).toBe("text");

    const bool = html`<input disabled />`;
    expect((bool as any).props.disabled).toBe(true);
  });

  test("renders reactive signals in text and attributes", () => {
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

  test("handles computed values and multiple interpolations", () => {
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

  test("conditionals render correctly without false/null/undefined as strings", () => {
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

  test("event handlers fire and delegate correctly", () => {
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

  test("mounts to selector or element directly", () => {
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

  test("static and reactive props with attribute removal", () => {
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

    mount({ tag: "input", props: { id: "null-prop", readonly: null as any } });
    expect(document.getElementById("null-prop")?.hasAttribute("readonly")).toBe(false);
  });

  test("fragments and dynamic fragments update correctly", () => {
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
  test("execute in correct order with node argument", () => {
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

    flushMountQueue(document.getElementById("app")!);
    expect(callOrder).toEqual(["beforeMount", "afterMount"]);
    expect(receivedNode?.id).toBe("lifecycle-test");

    value("updated");
    flush();
    expect(callOrder).toEqual(["beforeMount", "afterMount", "beforeUpdate", "afterUpdate"]);
  });

  test("destroy hooks and cleanup on element removal", () => {
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
    expect((el as any).__hella_handlers).toBeUndefined();
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

    flushMountQueue(document.getElementById("app")!);
    expect(parentCalls).toEqual(["beforeMount", "afterMount"]);
    expect(childCalls).toEqual(["beforeMount", "afterMount"]);
  });

  test("deeply nested afterMount hooks fire in document order", () => {
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

    flushMountQueue(document.getElementById("app")!);
    expect(calls).toEqual(["grandparent", "parent", "child", "grandchild"]);
  });
});

describe("html template features", () => {
  test("lifecycle hooks via hooks: prefix", () => {
    const hooks = {
      beforeMount: () => {},
      afterMount: () => {},
      beforeDestroy: () => {},
      afterDestroy: () => {}
    };

    const node = html`<div
      hooks:beforeMount=${hooks.beforeMount}
      hooks:afterMount=${hooks.afterMount}
      hooks:beforeDestroy=${hooks.beforeDestroy}
      hooks:afterDestroy=${hooks.afterDestroy}
    >Lifecycle</div>`;

    expect((node as any).hooks).toEqual(hooks);
  });

  test("combines props, bind, on, and hooks", () => {
    const className = signal("active");
    const handleClick = () => {};
    const afterMount = () => {};

    const node = html`<div
      id="combo"
      bind:class=${className}
      on:click=${handleClick}
      hooks:afterMount=${afterMount}
    >Combined</div>`;

    expect((node as any).props.id).toBe("combo");
    expect((node as any).bind.class).toBe(className);
    expect((node as any).on.click).toBe(handleClick);
    expect((node as any).hooks.afterMount).toBe(afterMount);
  });

  test("component functions with children and props", () => {
    const Wrapper = (props: { children?: any; title: string }) =>
      html`<div class="wrapper"><h1>${props.title}</h1>${props.children}</div>`;

    const node = html`<${Wrapper} title="Hello"><span>Child</span></${Wrapper}>`;

    expect((node as any).tag).toBe("div");
    expect((node as any).props.class).toBe("wrapper");
    expect((node as any).children[0].children[0]).toBe("Hello");
  });

  test("handles unclosed tags and whitespace gracefully", () => {
    const whitespace = html`
      <div>
        <span>Text</span>
      </div>
    `;
    expect((whitespace as any).children.length).toBe(1);
    expect((whitespace as any).children[0].tag).toBe("span");

    mount(html`<div><span>Unclosed`);
    expect(document.querySelector("#app div span")?.textContent).toBe("Unclosed");

    mount(html`Before<div>Middle</div>After`);
    expect(document.getElementById("app")?.textContent).toContain("Before");
    expect(document.getElementById("app")?.textContent).toContain("After");
  });

  test("root-level interpolation returns value directly", () => {
    const getValue = () => ({ tag: "span", children: ["Dynamic"] });
    const funcNode = html`${getValue}` as any;
    expect(funcNode).toBe(getValue);

    const count = signal(42);
    const sigNode = html`${count}` as any;
    expect(sigNode).toBe(count);

    const value = { tag: "div", children: ["Static"] };
    const staticNode = html`${value}` as any;
    expect(staticNode).toEqual(value);
  });
});
