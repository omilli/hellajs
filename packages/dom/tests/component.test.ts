import { html, component, mount } from "../";
import { describe, test, expect, beforeEach } from "bun:test";
import type { Signal } from "@hellajs/core";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("component function", () => {
  test("creates component with typed props", () => {
    const Greeting = component((props: { name: string }) => html`<div>Hello ${props.name}</div>`);

    const node = Greeting({ name: "World" });
    expect(node).toEqual({
      tag: "div",
      props: {},
      children: ["Hello ", "World"]
    });
  });

  test("creates component with signal props", () => {
    const Counter = component((props: { count: Signal<number> }) => html`<div>Count: ${props.count}</div>`);

    const count = signal(5);
    const node = Counter({ count });

    expect(node).toEqual({
      tag: "div",
      props: {},
      children: ["Count: ", count]
    });
  });

  test("creates reusable component", () => {
    const Button = component((props: { label: string; onClick: () => void }) =>
      html`<button on:click=${props.onClick}>${props.label}</button>`
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
    const Inner = component((props: { text: string }) => html`<span>${props.text}</span>`);
    const Outer = component((props: { title: string; content: string }) => html`
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
    const Display = component((props: { value: Signal<number> }) => html`<div id="display">${props.value}</div>`);

    const count = signal(10);
    mount(Display({ value: count }));

    const el = document.getElementById("display");
    expect(el?.textContent).toBe("10");

    count(20);
    flush();
    expect(el?.textContent).toBe("20");
  });

  test("components work with function interpolation", () => {
    const GreetingCard = component((props: { name: string }) => html`<div class="card">Hello ${props.name}</div>`);

    const node = html`<${GreetingCard} name="World"></${GreetingCard}>`;

    expect(node).toEqual({
      tag: "div",
      props: { class: "card" },
      children: ["Hello ", "World"]
    });
  });

  test("components with dynamic props", () => {
    const name = signal("Alice");
    const UserBadge = component((props: { name: any }) => html`<span class="badge">${props.name}</span>`);

    mount(html`<div id="badges"><${UserBadge} name=${name}></${UserBadge}></div>`);

    const badge = document.querySelector(".badge");
    expect(badge?.textContent).toBe("Alice");

    name("Bob");
    flush();
    expect(badge?.textContent).toBe("Bob");
  });

  test("components with children", () => {
    const FancyButton = component((props: { children: any }) => html`
      <button class="fancy">${props.children}</button>
    `);

    mount(html`<${FancyButton}>Click Me!</${FancyButton}>`);

    const btn = document.querySelector(".fancy");
    expect(btn?.textContent).toBe("Click Me!");
  });

  test("components with event handlers", () => {
    let clicked = false;
    const ActionBtn = component((props: { click: any; children: any }) => html`
      <button on:click=${props.click}>${props.children}</button>
    `);

    mount(html`<${ActionBtn} on:click=${() => { clicked = true; }}>Press</${ActionBtn}>`);

    const btn = document.querySelector("button");
    btn?.click();
    expect(clicked).toBe(true);
  });

  test("nested components", () => {
    const CardTitle = component((props: { children: any }) => html`<h2 class="title">${props.children}</h2>`);
    const CardBody = component((props: { children: any }) => html`<p class="body">${props.children}</p>`);
    const Card = component((props: { children: any }) => html`<div class="card">${props.children}</div>`);

    mount(html`
      <${Card}>
        <${CardTitle}>My Title</${CardTitle}>
        <${CardBody}>My Body</${CardBody}>
      </${Card}>
    `);

    expect(document.querySelector(".title")?.textContent).toBe("My Title");
    expect(document.querySelector(".body")?.textContent).toBe("My Body");
  });

  test("components with multiple props", () => {
    const UserInfo = component((props: { name: string; age: number; active: boolean }) => html`
      <div class="user">
        <span class="name">${props.name}</span>
        <span class="age">${props.age}</span>
        <span class="status">${props.active ? "Active" : "Inactive"}</span>
      </div>
    `);

    mount(html`<${UserInfo} name="Alice" age=${30} active=${true}></${UserInfo}>`);

    expect(document.querySelector(".name")?.textContent).toBe("Alice");
    expect(document.querySelector(".age")?.textContent).toBe("30");
    expect(document.querySelector(".status")?.textContent).toBe("Active");
  });

  test("component() components cache AST parsing", () => {
    const Counter = component((props: { count: number }) => html`<div>Count: ${props.count}</div>`);

    // Call component multiple times
    const node1 = Counter({ count: 1 }) as any;
    const node2 = Counter({ count: 2 }) as any;
    const node3 = Counter({ count: 3 });

    // All should produce correct output
    expect(node1).toEqual({ tag: "div", props: {}, children: ["Count: ", 1] });
    expect(node2).toEqual({ tag: "div", props: {}, children: ["Count: ", 2] });
    expect(node3).toEqual({ tag: "div", props: {}, children: ["Count: ", 3] });

    // Each call reuses cached AST with different values
    expect(node1).not.toBe(node2); // Different instances
    expect(node1.tag).toBe(node2.tag); // Same structure
  });

  test("standalone html() calls work without caching", () => {
    // Standalone calls should work fine
    const node1 = html`<div>Test 1</div>`;
    const node2 = html`<div>Test 2</div>`;

    expect(node1).toEqual({ tag: "div", props: {}, children: ["Test 1"] });
    expect(node2).toEqual({ tag: "div", props: {}, children: ["Test 2"] });
  });

  test("multiple component() components have separate caches", () => {
    const Button = component((props: { label: string }) => html`<button>${props.label}</button>`);
    const Link = component((props: { text: string }) => html`<a>${props.text}</a>`);

    const btn1 = Button({ label: "Click" });
    const btn2 = Button({ label: "Press" });
    const link1 = Link({ text: "Home" });
    const link2 = Link({ text: "About" });

    expect(btn1).toEqual({ tag: "button", props: {}, children: ["Click"] });
    expect(btn2).toEqual({ tag: "button", props: {}, children: ["Press"] });
    expect(link1).toEqual({ tag: "a", props: {}, children: ["Home"] });
    expect(link2).toEqual({ tag: "a", props: {}, children: ["About"] });
  });
});