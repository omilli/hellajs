import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, onError, clearErrorHandlers, flushMount, queueCleanup } from "@hellajs/dom/bundle";
import { signal, flush, scope } from "@hellajs/core";
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

  test("static and reactive props", () => {
    const isDisabled = signal(true);

    mount(html`
      <button
        id="prop-test"
        type="submit"
        data-custom="value"
        bind:disabled=${() => isDisabled() ? "disabled" : false}
      >
        Submit
      </button>
    `);

    const btn = document.getElementById("prop-test") as HTMLButtonElement;
    expect(btn.getAttribute("type")).toBe("submit");
    expect(btn.getAttribute("data-custom")).toBe("value");
    expect(btn.hasAttribute("disabled")).toBe(true);

    isDisabled(false);
    flush();
    expect(btn.hasAttribute("disabled")).toBe(false);

    mount(html`<input id="null-prop" readonly=${null} />`);
    expect(document.getElementById("null-prop")?.hasAttribute("readonly")).toBe(false);
  });

  test("fragments and dynamic fragments", () => {
    const items = signal(["a", "b"]);

    mount(html`
      <div id="frag-container">
        <span>Static 1</span><span>Static 2</span>
        ${() => ({ tag: "$", children: items().map(i => ({ tag: "em", children: [i] })) })}
      </div>
    `);

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

    mount(html`
      <div
        id="lifecycle-test"
        hook:beforeMount=${() => callOrder.push("beforeMount")}
        hook:afterMount=${(node: Element) => {
        callOrder.push("afterMount");
        receivedNode = node;
      }}
        hook:beforeUpdate=${() => callOrder.push("beforeUpdate")}
        hook:afterUpdate=${() => callOrder.push("afterUpdate")}
        bind:data-value=${value}
      ></div>
    `);

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

    mount(html`
      <button
        id="destroyable"
        hook:beforeDestroy=${() => callOrder.push("beforeDestroy")}
        hook:afterDestroy=${() => callOrder.push("afterDestroy")}
        on:click=${() => clicked++}
      >Click</button>
    `);

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

    mount(html`
      <div
        id="parent"
        hook:beforeMount=${() => parentCalls.push("beforeMount")}
        hook:afterMount=${() => parentCalls.push("afterMount")}
      >
        <span
          hook:beforeMount=${() => childCalls.push("beforeMount")}
          hook:afterMount=${() => childCalls.push("afterMount")}
        ></span>
      </div>
    `);

    expect(parentCalls).toEqual(["beforeMount"]);
    expect(childCalls).toEqual(["beforeMount"]);

    flushMount(document.getElementById("app")!);
    expect(parentCalls).toEqual(["beforeMount", "afterMount"]);
    expect(childCalls).toEqual(["beforeMount", "afterMount"]);
  });

  test("deeply nested afterMount order", () => {
    const calls: string[] = [];

    mount(html`
      <div id="grandparent" hook:afterMount=${() => calls.push("grandparent")}>
        <div id="parent" hook:afterMount=${() => calls.push("parent")}>
          <span hook:afterMount=${() => calls.push("child")}>
            <b hook:afterMount=${() => calls.push("grandchild")}>Deep</b>
          </span>
        </div>
      </div>
    `);

    flushMount(document.getElementById("app")!);
    expect(calls).toEqual(["grandparent", "parent", "child", "grandchild"]);
  });
});

describe("html template features", () => {
  test("lifecycle hooks via hook: prefix", () => {
    const hooks = {
      beforeMount: () => { },
      afterMount: () => { },
      beforeDestroy: () => { },
      afterDestroy: () => { }
    };

    const node = html`<div
      hook:beforeMount=${hooks.beforeMount}
      hook:afterMount=${hooks.afterMount}
      hook:beforeDestroy=${hooks.beforeDestroy}
      hook:afterDestroy=${hooks.afterDestroy}
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
      hook:afterMount=${afterMount}
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

describe("html parsing edge cases", () => {
  test("unclosed tags auto-close", () => {
    document.body.innerHTML = '<div id="app"></div>';

    mount(html`<div><span>Unclosed`);
    expect(document.querySelector("#app div span")?.textContent).toBe("Unclosed");

    document.body.innerHTML = '<div id="app"></div>';
    mount(html`<div><p><b>Nested unclosed`);
    expect(document.querySelector("#app div p b")?.textContent).toBe("Nested unclosed");
  });

  test("self-closing tags", () => {
    const input = html`<input type="text" value="test" />` as HellaNode;
    expect(input.tag).toBe("input");
    expect(input.props?.type).toBe("text");
    expect(input.children?.length).toBe(0);

    const br = html`<br />` as HellaNode;
    expect(br.tag).toBe("br");
    expect(br.children?.length).toBe(0);

    const img = html`<img src="test.jpg" alt="test" />` as HellaNode;
    expect(img.tag).toBe("img");
    expect(img.props?.src).toBe("test.jpg");
  });

  test("boolean attributes", () => {
    const disabled = html`<input disabled />` as HellaNode;
    expect(disabled.props?.disabled).toBe(true);

    const checked = html`<input checked />` as HellaNode;
    expect(checked.props?.checked).toBe(true);

    const readonlyTrue = html`<input readonly=${true} />` as HellaNode;
    expect(readonlyTrue.props?.readonly).toBe(true);

    const readonlyFalse = html`<input readonly=${false} />` as HellaNode;
    expect(readonlyFalse.props?.readonly).toBe(false);

    const readonlyNull = html`<input readonly=${null} />` as HellaNode;
    expect(readonlyNull.props?.readonly).toBeNull();

    mount(html`<input id="bool-test" disabled />`);
    expect(document.getElementById("bool-test")?.hasAttribute("disabled")).toBe(true);

    mount(html`<input id="bool-false" disabled=${false} />`);
    expect(document.getElementById("bool-false")?.hasAttribute("disabled")).toBe(false);
  });

  test("array attribute values (class lists)", () => {
    const node = html`<div class=${["a", "b", "c"]}>Array class</div>` as HellaNode;
    expect(node.props?.class).toEqual(["a", "b", "c"]);

    mount(html`<div id="array-class" class=${["foo", "bar", "baz"]}>Content</div>`);
    expect(document.getElementById("array-class")?.className).toBe("foo bar baz");

    // Falsy values filtered
    mount(html`<div id="filtered-class" class=${["active", null, "visible", undefined, ""]}>Content</div>`);
    expect(document.getElementById("filtered-class")?.className).toBe("active visible");
  });

  test("multiple root elements become fragment", () => {
    const fragment = html`<span>A</span><span>B</span>` as HellaNode;
    expect(fragment.tag).toBe("$");
    expect(fragment.children?.length).toBe(2);
    expect((fragment.children![0] as HellaNode).tag).toBe("span");
    expect((fragment.children![1] as HellaNode).tag).toBe("span");

    const threeRoots = html`<div>1</div><div>2</div><div>3</div>` as HellaNode;
    expect(threeRoots.tag).toBe("$");
    expect(threeRoots.children?.length).toBe(3);
  });

  test("dynamic component with merged props", () => {
    const Comp = (props: { id: string; class?: string; onClick?: () => void }) =>
      html`<div id=${props.id} class=${props.class} on:click=${props.onClick}>Component</div>`;

    const handler = () => { };
    const className = signal("dynamic");

    const node = html`<${Comp}
      id="test-id"
      class="static-class"
      bind:class=${className}
      on:click=${handler}
    />` as HellaNode;

    // Dynamic component gets resolved to the component's returned node
    expect(node.tag).toBe("div");
    expect(node.props?.id).toBe("test-id");
  });

  test("attribute prefix detection (on:, bind:, hook:, e:)", () => {
    const handler = () => { };
    const bindVal = signal("bound");
    const hookFn = () => { };

    const node = html`<div
      id="prefix-test"
      on:click=${handler}
      bind:class=${bindVal}
      hook:afterMount=${hookFn}
      e:focus=${handler}
    >Prefixes</div>` as HellaNode;

    expect(node.props?.id).toBe("prefix-test");
    expect(node.on?.click).toBe(handler);
    expect(node.bind?.class).toBe(bindVal);
    expect(node.hooks?.afterMount).toBe(hookFn);
    expect((node as any).e?.focus).toBe(handler);
  });

  test("whitespace handling in templates", () => {
    // Whitespace-only text nodes between elements should be preserved
    const node = html`
      <div>
        <span>A</span>
        <span>B</span>
      </div>
    ` as HellaNode;

    expect(node.tag).toBe("div");
    // Children should include text nodes (whitespace) and elements
    expect(node.children!.length).toBeGreaterThan(1);
  });

  test("nested placeholders", () => {
    const outer = signal("outer");
    const inner = signal("inner");

    const node = html`<div>${() => html`<span>${inner}</span>`}</div>` as HellaNode;
    expect(node.tag).toBe("div");

    mount(html`<div id="nested-placeholder">${() => html`<span>${inner}</span>`}</div>`);
    expect(document.querySelector("#nested-placeholder span")?.textContent).toBe("inner");

    inner("updated");
    flush();
    expect(document.querySelector("#nested-placeholder span")?.textContent).toBe("updated");
  });

  test("placeholder in attribute value", () => {
    const dynamicId = signal("dynamic-id");
    const node = html`<div id=${dynamicId}>Content</div>` as HellaNode;

    // Placeholder in attribute becomes the signal directly
    expect(node.props?.id).toEqual(dynamicId);
  });
});

// AST-specific tests for mount target variations
describe("mount targets", () => {
  test("mounts to selector or element", () => {
    mount(html`<div id="default">Default</div>`);
    expect(document.getElementById("default")).not.toBeNull();

    document.body.innerHTML = '<div id="custom"></div>';
    mount(html`<span>Custom</span>`, "#custom");
    expect(document.querySelector("#custom span")).not.toBeNull();

    const container = document.createElement("div");
    document.body.appendChild(container);
    mount(html`<b>Direct</b>`, container);
    expect(container.querySelector("b")?.textContent).toBe("Direct");
  });
});

describe("mount edge cases", () => {
  test("resolveNode with raw Node instance appends directly", () => {
    const rawSpan = document.createElement("span");
    rawSpan.id = "raw-node";
    rawSpan.textContent = "raw";

    // A child that resolves to a raw Node (not HellaNode) is appended as-is
    mount(html`<div id="raw-parent">${rawSpan}</div>`);
    expect(document.querySelector("#raw-parent #raw-node")?.textContent).toBe("raw");
  });

  test("__scope transfers to mounted DOM element", () => {
    const disposed = mock(() => { });
    const Comp = () => {
      const dispose = scope(() => { });
      const node = html`<div id="scoped-comp">Comp</div>` as HellaNode;
      node.__scope = disposed;
      return node;
    };

    mount(html`<div><${Comp} /></div>`);

    const el = document.getElementById("scoped-comp")! as HellaElement;
    // __scope should have been transferred to __hella_component_scope
    expect(typeof el.__hella_component_scope).toBe("function");
  });

  test("error config transfers to element during mount", () => {
    onError((err, ctx) => ctx.config?.fallback?.(err) ?? null);

    const fallback = (err: Error) => html`<span id="fallback">error</span>` as HellaNode;
    mount(html`
      <div id="boundary" error:boundary error:fallback=${fallback}>
        ${() => { throw new Error("mount error"); }}
      </div>
    `);

    // Fallback rendered due to error in reactive child
    expect(document.getElementById("fallback")).not.toBeNull();
    clearErrorHandlers();
  });

});

describe("direct property binding", () => {
  test("value set via direct property with falsy fallback", () => {
    const inputValue = signal("hello");

    mount(html`
      <div>
        <input id="val-input" bind:value=${inputValue} />
      </div>
    `);

    const valInput = document.getElementById("val-input") as HTMLInputElement;

    expect(valInput.value).toBe("hello");

    inputValue("");
    flush();

    expect(valInput.value).toBe("");

    inputValue("restored");
    flush();
    expect(valInput.value).toBe("restored");
  });
});
