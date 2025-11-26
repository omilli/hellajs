import { html, mount, forEach } from "../";
import { describe, test, expect, beforeEach } from "bun:test";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("html", () => {
  test("parses static single element", () => {
    const node = html`<div>Hello</div>`;

    expect(node).toEqual({
      tag: "div",
      props: {},
      children: ["Hello"]
    });
  });

  test("parses static nested elements", () => {
    const node = html`<div><span>Nested</span></div>`;

    expect(node).toEqual({
      tag: "div",
      props: {},
      children: [{
        tag: "span",
        props: {},
        children: ["Nested"]
      }]
    });
  });

  test("parses multiple root elements as fragment", () => {
    const node = html`<div>A</div><div>B</div>`;

    expect(node).toEqual({
      tag: "$",
      children: [
        { tag: "div", props: {}, children: ["A"] },
        { tag: "div", props: {}, children: ["B"] }
      ]
    });
  });

  test("parses self-closing tags", () => {
    const node = html`<input />`;

    expect(node).toEqual({
      tag: "input",
      props: {},
      children: []
    });
  });

  test("parses self-closing tags without space", () => {
    const node = html`<input/>`;

    expect(node).toEqual({
      tag: "input",
      props: {},
      children: []
    });
  });

  test("parses self-closing tags with attributes and space", () => {
    const node = html`<input type="text" placeholder="Enter text" />`;

    expect(node).toEqual({
      tag: "input",
      props: { type: "text", placeholder: "Enter text" },
      children: []
    });
  });

  test("parses self-closing tags with attributes and no space", () => {
    const node = html`<img src="logo.png" alt="Logo"/>`;

    expect(node).toEqual({
      tag: "img",
      props: { src: "logo.png", alt: "Logo" },
      children: []
    });
  });

  test("parses static attributes", () => {
    const node = html`<div class="container" id="main">Content</div>`;

    expect(node).toEqual({
      tag: "div",
      props: { class: "container", id: "main" },
      children: ["Content"]
    });
  });

  test("parses boolean attributes", () => {
    const node = html`<input disabled />`;

    expect(node).toEqual({
      tag: "input",
      props: { disabled: true },
      children: []
    });
  });

  test("handles dynamic text content with signal", () => {
    const count = signal(5);
    const node = html`<div>Count: ${count}</div>`;

    expect(node).toEqual({
      tag: "div",
      props: {},
      children: ["Count: ", count]
    });
  });

  test("handles dynamic text content with function", () => {
    const getValue = () => "dynamic";
    const node = html`<div>Value: ${getValue}</div>`;

    expect(node).toEqual({
      tag: "div",
      props: {},
      children: ["Value: ", getValue]
    });
  });

  test("handles multiple interpolations in text", () => {
    const a = signal(1);
    const b = signal(2);
    const node = html`<div>${a} + ${b} = ${() => a() + b()}</div>`;

    expect(node).toEqual({
      tag: "div",
      props: {},
      children: [a, " + ", b, " = ", expect.any(Function)]
    });
  });

  test("handles dynamic attribute values", () => {
    const className = signal("active");
    const node = html`<div class=${className}>Content</div>`;

    expect(node).toEqual({
      tag: "div",
      props: { class: className },
      children: ["Content"]
    });
  });

  test("handles function attribute values", () => {
    const getClass = () => "computed";
    const node = html`<div class=${getClass}>Content</div>`;

    expect(node).toEqual({
      tag: "div",
      props: { class: getClass },
      children: ["Content"]
    });
  });

  test("handles conditional rendering as function child", () => {
    const show = signal(true);
    const node = html`<div>${() => show() ? html`<span>Yes</span>` : html`<span>No</span>`}</div>`;

    const div = node as any;
    expect(div.tag).toBe("div");
    expect(div.children).toHaveLength(1);
    expect(typeof div.children[0]).toBe("function");
  });

  test("handles nested component functions", () => {
    const Inner = (props: { text: string }) => html`<span>${props.text}</span>`;
    const node = html`<div>${Inner({ text: "nested" })}</div>`;

    const div = node as any;
    expect(div.tag).toBe("div");
    expect(div.children).toHaveLength(1);
    expect(div.children[0]).toEqual({
      tag: "span",
      props: {},
      children: ["nested"]
    });
  });

  test("handles dynamic component with children", () => {
    const Wrapper = (props: { children?: any }) => html`<div class="wrapper">${props.children}</div>`;
    const node = html`<${Wrapper}><span>Child content</span></${Wrapper}>`;

    const wrapper = node as any;
    expect(wrapper.tag).toBe("div");
    expect(wrapper.props.class).toBe("wrapper");
    expect(wrapper.children).toHaveLength(1);
    expect(wrapper.children[0].tag).toBe("span");
    expect(wrapper.children[0].children).toEqual(["Child content"]);
  });

  test("handles forEach integration", () => {
    const items = signal([1, 2, 3]);
    const node = html`<ul>${forEach(items, (item: number) => html`<li>${item}</li>`)}</ul>`;

    const ul = node as any;
    expect(ul.tag).toBe("ul");
    expect(ul.children).toHaveLength(1);
    expect(typeof ul.children[0]).toBe("function");
    expect(ul.children[0].isForEach).toBe(true);
  });

  test("handles empty elements", () => {
    const node = html`<div></div>`;

    expect(node).toEqual({
      tag: "div",
      props: {},
      children: []
    });
  });

  test("handles whitespace correctly", () => {
    const node = html`
      <div>
        <span>Text</span>
      </div>
    `;

    const div = node as any;
    expect(div.tag).toBe("div");
    expect(div.children).toHaveLength(1);
    expect(div.children[0].tag).toBe("span");
  });

  test("renders to DOM with static content", () => {
    mount(html`<div id="static">Hello World</div>`);

    const el = document.getElementById("static");
    expect(el?.textContent).toBe("Hello World");
  });

  test("renders to DOM with dynamic content", () => {
    const count = signal(0);
    mount(html`<div id="dynamic">${count}</div>`);

    const el = document.getElementById("dynamic");
    expect(el?.textContent).toBe("0");

    count(5);
    flush();
    expect(el?.textContent).toBe("5");
  });

  test("renders to DOM with dynamic attributes", () => {
    const className = signal("initial");
    mount(html`<div id="attr-test" bind:class=${className}>Content</div>`);

    const el = document.getElementById("attr-test");
    expect(el?.className).toBe("initial");

    className("updated");
    flush();
    expect(el?.className).toBe("updated");
  });

  test("renders to DOM with event handlers", () => {
    let clicked = false;
    mount(html`<button id="btn" on:click=${() => { clicked = true; }}>Click</button>`);

    const btn = document.getElementById("btn");
    btn?.dispatchEvent(new Event("click"));
    expect(clicked).toBe(true);
  });

  test("handles lifecycle hooks with hooks: prefix in AST", () => {
    const mount = () => console.log("mounted");
    const destroy = () => console.log("destroyed");
    const node = html`<div hooks:mount=${mount} hooks:destroy=${destroy}>Content</div>`;

    expect(node).toEqual({
      tag: "div",
      props: {},
      hooks: { mount, destroy },
      children: ["Content"]
    });
  });

  test("handles multiple lifecycle hooks in AST", () => {
    const beforeMount = () => console.log("before mount");
    const mount = () => console.log("mounted");
    const beforeDestroy = () => console.log("before destroy");
    const destroy = () => console.log("destroyed");

    const node = html`<div
      hooks:beforeMount=${beforeMount}
      hooks:mount=${mount}
      hooks:beforeDestroy=${beforeDestroy}
      hooks:destroy=${destroy}
    >Lifecycle</div>`;

    expect(node).toEqual({
      tag: "div",
      props: {},
      hooks: { beforeMount, mount, beforeDestroy, destroy },
      children: ["Lifecycle"]
    });
  });

  test("lifecycle hooks are passed through to DOM mount", () => {
    const hooks = {
      beforeMount: () => console.log("before mount"),
      mount: () => console.log("mount")
    };

    const node = html`<div hooks:beforeMount=${hooks.beforeMount} hooks:mount=${hooks.mount}>Test</div>`;

    // Verify the node structure has lifecycle
    expect(node).toMatchObject({
      tag: "div",
      hooks: {
        beforeMount: hooks.beforeMount,
        mount: hooks.mount
      }
    });
  });

  test("combines props, bind, on, and lifecycle", () => {
    const className = signal("active");
    const handleClick = () => console.log("clicked");
    const mount = () => console.log("mounted");

    const node = html`<div
      id="combo"
      bind:class=${className}
      on:click=${handleClick}
      hooks:mount=${mount}
    >Combined</div>`;

    expect(node).toEqual({
      tag: "div",
      props: { id: "combo" },
      bind: { class: className },
      on: { click: handleClick },
      hooks: { mount },
      children: ["Combined"]
    });
  });

  test("renders to DOM with conditional content", () => {
    const show = signal(true);
    mount(html`<div id="cond">${() => show() ? html`<span>Visible</span>` : html`<span>Hidden</span>`}</div>`);

    const el = document.getElementById("cond");
    expect(el?.querySelector("span")?.textContent).toBe("Visible");

    show(false);
    flush();
    expect(el?.querySelector("span")?.textContent).toBe("Hidden");
  });

  test("renders to DOM with forEach", () => {
    const items = signal([{ id: 1, name: "A" }, { id: 2, name: "B" }]);

    mount(html`
      <ul id="list">
        ${forEach(items, (item: any) => html`<li key=${item.id}>${item.name}</li>`)}
      </ul>
    `);

    const list = document.getElementById("list");
    expect(list?.children.length).toBe(2);
    expect(list?.children[0]?.textContent).toBe("A");
    expect(list?.children[1]?.textContent).toBe("B");

    items([{ id: 3, name: "C" }]);
    flush();
    expect(list?.children.length).toBe(1);
    expect(list?.children[0]?.textContent).toBe("C");
  });

  test("handles null and undefined in content", () => {
    const node = html`<div>${null} ${undefined}</div>`;
    mount(node);

    const div = document.querySelector("#app > div");
    // Should render as empty comments, not literal "null" or "undefined"
    expect(div?.textContent?.trim()).toBe("");
  });

  test("handles zero value in content", () => {
    const count = signal(0);
    mount(html`<div id="zero">${count}</div>`);

    const el = document.getElementById("zero");
    expect(el?.textContent).toBe("0");
  });

  test("handles false boolean in content", () => {
    const flag = signal(false);
    mount(html`<div id="bool">${flag}</div>`);

    const el = document.getElementById("bool");
    // false should render as empty string, not "false"
    expect(el?.textContent).toBe("");
  });

  test("handles root-level text nodes in html component", () => {
    mount(html`Text before<div>element</div>Text after`);

    const app = document.getElementById("app");
    expect(app?.textContent).toContain("Text before");
    expect(app?.textContent).toContain("Text after");
    expect(app?.textContent).toContain("element");

    // Verify structure - should have 3 children (text, div, text)
    expect(app?.childNodes.length).toBe(3);
  });

  test("handles unclosed tags gracefully", () => {
    // This tests the stack flushing mechanism for malformed HTML
    mount(html`<div><span>Unclosed tags`);

    const app = document.getElementById("app");
    // Should recover and render content despite missing closing tags
    expect(app?.textContent).toContain("Unclosed tags");
    expect(app?.querySelector("div")).toBeTruthy();
    expect(app?.querySelector("span")).toBeTruthy();
  });
});
