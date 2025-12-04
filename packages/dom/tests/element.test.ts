import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, ForEach, element, component, queueCleanup } from "@hellajs/dom/bundle";
import type { AugmentedElement } from "@hellajs/dom";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

const tick = () => Promise.resolve();

describe("custom element definitions", () => {
  test("defines elements with reactive props and internal signals", async () => {
    element("test-counter", (props: { initial: () => string | null }) => {
      const count = signal(Number(props.initial?.()) || 0);
      return {
        tag: "div",
        children: [
          { tag: "span", props: { id: "count" }, children: [count] },
          { tag: "button", props: { id: "inc" }, on: { click: () => count(count() + 1) }, children: ["+"] }
        ]
      };
    });

    document.body.innerHTML = '<test-counter initial="5"></test-counter>';
    await tick();

    const el = document.querySelector("test-counter")!;
    expect(el.querySelector("#count")?.textContent).toBe("5");

    el.querySelector<HTMLButtonElement>("#inc")!.click();
    flush();
    expect(el.querySelector("#count")?.textContent).toBe("6");
  });

  test("cleans up on disconnect and reinitializes on reconnect", async () => {
    let connectCount = 0;

    element("test-reconnect", () => {
      const count = signal(0);
      effect(() => { count(); });
      connectCount++;
      return { tag: "span", children: [`Count: ${connectCount}`] };
    });

    document.body.innerHTML = "<test-reconnect></test-reconnect>";
    await tick();
    expect(connectCount).toBe(1);

    const el = document.querySelector("test-reconnect") as AugmentedElement & { _initialized?: boolean };
    expect(el._initialized).toBe(true);

    el.remove();
    expect(el._initialized).toBe(false);

    document.body.appendChild(el);
    await tick();
    expect(connectCount).toBe(2);
  });

  test("reactive props handle attribute removal", async () => {
    element("test-attr-remove", (props: { value: () => string | null }) => ({
      tag: "span",
      children: [() => props.value?.() ?? "fallback"]
    }));

    document.body.innerHTML = '<test-attr-remove value="set"></test-attr-remove>';
    await tick();
    const el = document.querySelector("test-attr-remove")!;
    expect(el.querySelector("span")?.textContent).toBe("set");

    el.removeAttribute("value");
    expect(el.querySelector("span")?.textContent).toBe("fallback");
  });

  test("captures default and named slots", async () => {
    element("test-slots", (props: { children?: Node[]; slots?: Record<string, Node[]> }) => ({
      tag: "article",
      children: [
        { tag: "header", children: props.slots?.title },
        { tag: "main", children: props.children },
        { tag: "aside", children: props.slots?.sidebar }
      ]
    }));

    document.body.innerHTML = `
      <test-slots>
        <h1 slot="title">Title</h1>
        <p>Main content 1</p>
        <p>Main content 2</p>
        <nav slot="sidebar">Sidebar</nav>
      </test-slots>
    `;
    await tick();

    const el = document.querySelector("test-slots")!;
    expect(el.querySelector("header h1")?.textContent).toBe("Title");
    expect(el.querySelectorAll("main p").length).toBe(2);
    expect(el.querySelector("aside nav")?.textContent).toBe("Sidebar");
  });

  test("complex element with html components and ForEach", async () => {
    const Button = (props: { label: string; onClick: () => void }) =>
      html`<button class="btn" on:click=${props.onClick}>${props.label}</button>`;

    element<{ title: () => string | null; children?: Node[]; slots?: Record<string, Node[]> }>("test-complex", (props) => {
      const count = signal(0);
      const items = signal<string[]>([]);

      const addItem = () => {
        items([...items(), `Item ${items().length + 1}`]);
        count(count() + 1);
      };

      return html`
        <div class="card">
          <header><h2>${() => props.title?.() ?? "Untitled"}</h2><span class="badge">${count}</span></header>
          <nav class="actions">${props.slots?.actions}</nav>
          <main>
            <div class="controls">
              <${Button} label="Add" onClick=${addItem} />
            </div>
            <ul class="item-list">
              <${ForEach} each=${items} use=${(item: string) => html`<li>${item}</li>`} />
            </ul>
            <section class="slotted">${props.children}</section>
          </main>
          <footer>${props.slots?.footer}</footer>
        </div>
      `;
    });

    document.body.innerHTML = `
      <test-complex title="My Card">
        <button slot="actions">Action</button>
        <p>Default content</p>
        <small slot="footer">© 2025</small>
      </test-complex>
    `;
    await tick();

    const el = document.querySelector("test-complex")!;
    expect(el.querySelector(".card-header h2, header h2")?.textContent).toBe("My Card");
    expect(el.querySelector(".badge")?.textContent).toBe("0");
    expect(el.querySelector(".actions button, nav button")?.textContent).toBe("Action");
    expect(el.querySelector(".slotted p, section p")?.textContent).toBe("Default content");

    el.querySelector<HTMLButtonElement>(".controls .btn")!.click();
    flush();
    expect(el.querySelector(".badge")?.textContent).toBe("1");
    expect(el.querySelectorAll(".item-list li").length).toBe(1);

    el.setAttribute("title", "Updated");
    expect(el.querySelector("header h2")?.textContent).toBe("Updated");
  });
});

describe("component scope lifecycle", () => {
  test("component effects dispose when element removed", () => {
    const count = signal(0);
    let effectRuns = 0;

    const Counter = () => {
      effect(() => { count(); effectRuns++; });
      return { tag: "div", props: { id: "counter" }, children: ["Counter"] };
    };

    mount(component(Counter, {}));
    expect(effectRuns).toBe(1);

    count(1);
    expect(effectRuns).toBe(2);

    const counter = document.getElementById("counter") as AugmentedElement;
    counter.remove();
    queueCleanup(counter);

    count(2);
    expect(effectRuns).toBe(2);
  });

  test("nested components have isolated scopes", () => {
    const trigger1 = signal(0);
    const trigger2 = signal(0);
    let effect1Runs = 0;
    let effect2Runs = 0;

    const Inner = () => {
      effect(() => { trigger2(); effect2Runs++; });
      return { tag: "span", props: { id: "inner" }, children: ["Inner"] };
    };

    const Outer = () => {
      effect(() => { trigger1(); effect1Runs++; });
      return { tag: "div", props: { id: "outer" }, children: [component(Inner, {})] };
    };

    mount(component(Outer, {}));
    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);

    trigger1(1);
    trigger2(1);
    expect(effect1Runs).toBe(2);
    expect(effect2Runs).toBe(2);

    const inner = document.getElementById("inner") as AugmentedElement;
    inner.remove();
    queueCleanup(inner);

    trigger1(2);
    trigger2(2);
    expect(effect1Runs).toBe(3);
    expect(effect2Runs).toBe(2);

    const outer = document.getElementById("outer") as AugmentedElement;
    outer.remove();
    queueCleanup(outer);

    trigger1(3);
    expect(effect1Runs).toBe(3);
  });

  test("html components with scope cleanup", () => {
    const count = signal(0);
    let effectRuns = 0;

    const Counter = () => {
      effect(() => { count(); effectRuns++; });
      return html`<div id="html-counter">${count}</div>`;
    };

    mount(html`<${Counter} />`);
    expect(effectRuns).toBe(1);

    count(1);
    expect(effectRuns).toBe(2);

    const counter = document.getElementById("html-counter") as AugmentedElement;
    counter.remove();
    queueCleanup(counter);

    count(2);
    expect(effectRuns).toBe(2);
  });

  test("multiple components maintain isolation", () => {
    const trigger1 = signal(0);
    const trigger2 = signal(0);
    let effect1Runs = 0;
    let effect2Runs = 0;

    const Component1 = () => {
      effect(() => { trigger1(); effect1Runs++; });
      return html`<div id="comp1">Component 1</div>`;
    };

    const Component2 = () => {
      effect(() => { trigger2(); effect2Runs++; });
      return html`<div id="comp2">Component 2</div>`;
    };

    mount(html`<div><${Component1} /><${Component2} /></div>`);
    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);

    const comp1 = document.getElementById("comp1");
    comp1!.remove();
    queueCleanup(comp1!);

    trigger1(1);
    trigger2(1);
    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(2);

    const comp2 = document.getElementById("comp2");
    comp2!.remove();
    queueCleanup(comp2!);

    trigger2(2);
    expect(effect2Runs).toBe(2);
  });
});
