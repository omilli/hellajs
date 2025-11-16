import { html, template } from "../lib/template";
import { forEach } from "../lib/forEach";
import { mount } from "../lib/mount";
import { describe, test, expect, beforeEach } from "bun:test";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("html tagged template", () => {
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

  test("handles event handlers", () => {
    const handleClick = () => console.log("clicked");
    const node = html`<button onClick=${handleClick}>Click</button>`;

    expect(node).toEqual({
      tag: "button",
      props: { onClick: handleClick },
      children: ["Click"]
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

  test("handles nested template components", () => {
    const Inner = template((props: { text: string }) => html`<span>${props.text}</span>`);
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

  test("handles forEach integration", () => {
    const items = signal([1, 2, 3]);
    const node = html`<ul>${forEach(items, (item) => html`<li>${item}</li>`)}</ul>`;

    const ul = node as any;
    expect(ul.tag).toBe("ul");
    expect(ul.children).toHaveLength(1);
    expect(typeof ul.children[0]).toBe("function");
    expect(ul.children[0].isForEach).toBe(true);
  });

  test("handles <ForEach> tag syntax", () => {
    const items = signal([1, 2, 3]);
    const node = html`<ul><ForEach for=${items} each=${(item: number) => html`<li>${item}</li>`} /></ul>`;

    const ul = node as any;
    expect(ul.tag).toBe("ul");
    expect(ul.children).toHaveLength(1);
    expect(typeof ul.children[0]).toBe("function");
    expect(ul.children[0].isForEach).toBe(true);
  });

  test("handles <ForEach> with keyed items", () => {
    const items = signal([{ id: 1, name: "A" }, { id: 2, name: "B" }]);
    const node = html`<ul><ForEach for=${items} each=${(item: any) => html`<li key=${item.id}>${item.name}</li>`} /></ul>`;

    const ul = node as any;
    expect(ul.tag).toBe("ul");
    expect(ul.children).toHaveLength(1);
    expect(typeof ul.children[0]).toBe("function");
    expect(ul.children[0].isForEach).toBe(true);
  });

  test("renders <ForEach> to DOM", () => {
    const items = signal([{ id: 1, name: "A" }, { id: 2, name: "B" }]);

    mount(html`
      <ul id="forEach-list">
        <ForEach for=${items} each=${(item: any) => html`<li key=${item.id}>${item.name}</li>`} />
      </ul>
    `);

    const list = document.getElementById("forEach-list");
    expect(list?.children.length).toBe(2);
    expect(list?.children[0]?.textContent).toBe("A");
    expect(list?.children[1]?.textContent).toBe("B");

    items([{ id: 3, name: "C" }]);
    flush();
    expect(list?.children.length).toBe(1);
    expect(list?.children[0]?.textContent).toBe("C");
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
    mount(html`<div id="attr-test" class=${className}>Content</div>`);

    const el = document.getElementById("attr-test");
    expect(el?.className).toBe("initial");

    className("updated");
    flush();
    expect(el?.className).toBe("updated");
  });

  test("renders to DOM with event handlers", () => {
    let clicked = false;
    mount(html`<button id="btn" onClick=${() => { clicked = true; }}>Click</button>`);

    const btn = document.getElementById("btn");
    btn?.dispatchEvent(new Event("click"));
    expect(clicked).toBe(true);
  });

  test("renders to DOM with conditional content", () => {
    const show = signal(true);
    mount(() => html`<div id="cond">${() => show() ? html`<span>Visible</span>` : html`<span>Hidden</span>`}</div>`);

    const el = document.getElementById("cond");
    expect(el?.querySelector("span")?.textContent).toBe("Visible");

    show(false);
    flush();
    expect(el?.querySelector("span")?.textContent).toBe("Hidden");
  });

  test("renders to DOM with forEach", () => {
    const items = signal([{ id: 1, name: "A" }, { id: 2, name: "B" }]);

    mount(() => html`
      <ul id="list">
        ${forEach(items, (item) => html`<li key=${item.id}>${item.name}</li>`)}
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
});

describe("template function", () => {
  test("creates component with typed props", () => {
    const Greeting = template((props: { name: string }) => html`<div>Hello ${props.name}</div>`);

    const node = Greeting({ name: "World" });
    expect(node).toEqual({
      tag: "div",
      props: {},
      children: ["Hello ", "World"]
    });
  });

  test("creates component with signal props", () => {
    const Counter = template((props: { count: Signal<number> }) => html`<div>Count: ${props.count}</div>`);

    const count = signal(5);
    const node = Counter({ count });

    expect(node).toEqual({
      tag: "div",
      props: {},
      children: ["Count: ", count]
    });
  });

  test("creates reusable component", () => {
    const Button = template((props: { label: string; onClick: () => void }) =>
      html`<button onClick=${props.onClick}>${props.label}</button>`
    );

    let clicked1 = false;
    let clicked2 = false;

    mount(html`
      <div id="buttons">
        ${Button({ label: "First", onClick: () => { clicked1 = true; } })}
        ${Button({ label: "Second", onClick: () => { clicked2 = true; } })}
      </div>
    `);

    const buttons = document.querySelectorAll("#buttons button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.textContent).toBe("First");
    expect(buttons[1]?.textContent).toBe("Second");

    buttons[0]?.dispatchEvent(new Event("click"));
    expect(clicked1).toBe(true);
    expect(clicked2).toBe(false);

    buttons[1]?.dispatchEvent(new Event("click"));
    expect(clicked2).toBe(true);
  });

  test("creates nested components", () => {
    const Inner = template((props: { text: string }) => html`<span>${props.text}</span>`);
    const Outer = template((props: { title: string; content: string }) => html`
      <div>
        <h1>${props.title}</h1>
        ${Inner({ text: props.content })}
      </div>
    `);

    mount(Outer({ title: "Header", content: "Body" }));

    expect(document.querySelector("h1")?.textContent).toBe("Header");
    expect(document.querySelector("span")?.textContent).toBe("Body");
  });

  test("supports reactive component updates", () => {
    const Display = template((props: { value: Signal<number> }) => html`<div id="display">${props.value}</div>`);

    const count = signal(10);
    mount(Display({ value: count }));

    const el = document.getElementById("display");
    expect(el?.textContent).toBe("10");

    count(20);
    flush();
    expect(el?.textContent).toBe("20");
  });

  // test("button with reactive text and dynamic sibling", () => {
  //   const counter = signal(0);
  //   let clickCount = 0;

  //   mount(html`
  //     <div id="test-app">
  //       <button id="test-btn" onClick=${() => { clickCount++; counter(counter() + 1); }}>Count: ${counter}</button>
  //       <div class=${() => counter() % 2 === 0 ? "even" : "odd"}>Status</div>
  //     </div>
  //   `);

  //   const btn = document.getElementById("test-btn");

  //   expect(btn?.textContent).toBe("Count: 0");

  //   btn?.click();
  //   flush();

  //   expect(clickCount).toBe(1);
  //   expect(counter()).toBe(1);
  //   expect(btn?.textContent).toBe("Count: 1");
  //   expect(document.querySelector(".odd")).toBeTruthy();

  //   btn?.click();
  //   flush();

  //   expect(clickCount).toBe(2);
  //   expect(counter()).toBe(2);
  //   expect(btn?.textContent).toBe("Count: 2");
  //   expect(document.querySelector(".even")).toBeTruthy();
  // });

  test("registers named components for declarative usage", () => {
    template("greeting-card", (props: { name: string }) => html`<div class="card">Hello ${props.name}</div>`);

    const node = html`<greeting-card name="World"></greeting-card>`;

    expect(node).toEqual({
      tag: "div",
      props: { class: "card" },
      children: ["Hello ", "World"]
    });
  });

  test("named components with dynamic props", () => {
    const name = signal("Alice");
    template("user-badge", (props: { name: any }) => html`<span class="badge">${props.name}</span>`);

    mount(html`<div id="badges"><user-badge name=${name}></user-badge></div>`);

    const badge = document.querySelector(".badge");
    expect(badge?.textContent).toBe("Alice");

    name("Bob");
    flush();
    expect(badge?.textContent).toBe("Bob");
  });

  test("named components with children", () => {
    template("fancy-button", (props: { children: any }) => html`
      <button class="fancy">${props.children}</button>
    `);

    mount(html`<fancy-button>Click Me!</fancy-button>`);

    const btn = document.querySelector(".fancy");
    expect(btn?.textContent).toBe("Click Me!");
  });

  test("named components with event handlers", () => {
    let clicked = false;
    template("action-btn", (props: { onClick: any; children: any }) => html`
      <button onClick=${props.onClick}>${props.children}</button>
    `);

    mount(html`<action-btn onClick=${() => { clicked = true; }}>Press</action-btn>`);

    const btn = document.querySelector("button");
    btn?.click();
    expect(clicked).toBe(true);
  });

  test("nested named components", () => {
    template("card-title", (props: { children: any }) => html`<h2 class="title">${props.children}</h2>`);
    template("card-body", (props: { children: any }) => html`<p class="body">${props.children}</p>`);
    template("card", (props: { children: any }) => html`<div class="card">${props.children}</div>`);

    mount(html`
      <card>
        <card-title>My Title</card-title>
        <card-body>My Body</card-body>
      </card>
    `);

    expect(document.querySelector(".title")?.textContent).toBe("My Title");
    expect(document.querySelector(".body")?.textContent).toBe("My Body");
  });

  test("named components with multiple props", () => {
    template("user-info", (props: { name: string; age: number; active: boolean }) => html`
      <div class="user">
        <span class="name">${props.name}</span>
        <span class="age">${props.age}</span>
        <span class="status">${props.active ? "Active" : "Inactive"}</span>
      </div>
    `);

    mount(html`<user-info name="Alice" age=${30} active=${true}></user-info>`);

    expect(document.querySelector(".name")?.textContent).toBe("Alice");
    expect(document.querySelector(".age")?.textContent).toBe("30");
    expect(document.querySelector(".status")?.textContent).toBe("Active");
  });
});