import { describe, test, expect, beforeEach } from "bun:test";
import { mount, element, html, ForEach } from "../";

// Helper to wait for element mount (deferred via microtask)
const tick = () => Promise.resolve();

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("mount with Element", () => {
  test("mounts HellaNode into container element", () => {
    const container = document.getElementById("app")!;
    mount({ tag: "div", props: { id: "rendered" }, children: ["Hello"] }, container);

    const rendered = document.getElementById("rendered");
    expect(rendered).not.toBeNull();
    expect(rendered?.textContent).toBe("Hello");
  });

  test("replaces existing content in container", () => {
    const container = document.getElementById("app")!;
    container.innerHTML = "<span>Old content</span>";

    mount({ tag: "div", children: ["New content"] }, container);

    expect(container.querySelector("span")).toBeNull();
    expect(container.textContent).toBe("New content");
  });

  test("mounts function component", () => {
    const container = document.getElementById("app")!;
    mount(() => ({ tag: "p", children: ["Dynamic"] }), container);

    expect(container.querySelector("p")?.textContent).toBe("Dynamic");
  });

  test("sets __hella_mounted flag", () => {
    const container = document.getElementById("app")!;
    mount({ tag: "div", props: { id: "mounted" }, children: [] }, container);

    const el = document.getElementById("mounted") as any;
    expect(el.__hella_mounted).toBe(true);
  });
});

describe("element", () => {
  test("defines a custom element", async () => {
    element("test-basic", () => ({ tag: "span", children: ["Custom content"] }));

    document.body.innerHTML = "<test-basic></test-basic>";
    await tick();
    const el = document.querySelector("test-basic");
    expect(el?.querySelector("span")?.textContent).toBe("Custom content");
  });

  test("accesses attributes via props", async () => {
    element("test-attrs", (props: { title: () => string | null }) => ({ tag: "h1", children: [props.title?.()] }));

    document.body.innerHTML = '<test-attrs title="Hello"></test-attrs>';
    await tick();
    const el = document.querySelector("test-attrs")!;
    expect(el.querySelector("h1")?.textContent).toBe("Hello");
  });

  test("props return null for missing attributes", async () => {
    element("test-null-attr", (props: { optional: () => string | null }) => ({
      tag: "span",
      children: [props.optional?.() ?? "default"]
    }));

    document.body.innerHTML = "<test-null-attr></test-null-attr>";
    await tick();
    const el = document.querySelector("test-null-attr")!;
    expect(el.querySelector("span")?.textContent).toBe("default");
  });

  test("props are reactive when passed as functions", async () => {
    element("test-reactive-props", (props) => ({
      tag: "span",
      children: [props.value]
    }));

    document.body.innerHTML = '<test-reactive-props value="initial"></test-reactive-props>';
    await tick();
    const el = document.querySelector("test-reactive-props")!;
    expect(el.querySelector("span")?.textContent).toBe("initial");

    el.setAttribute("value", "updated");
    expect(el.querySelector("span")?.textContent).toBe("updated");
  });

  test("reactive props handle attribute removal", async () => {
    element("test-reactive-remove", (props: { value: () => string | null }) => ({
      tag: "span",
      children: [() => props.value?.() ?? "fallback"]
    }));

    document.body.innerHTML = '<test-reactive-remove value="set"></test-reactive-remove>';
    await tick();
    const el = document.querySelector("test-reactive-remove")!;
    expect(el.querySelector("span")?.textContent).toBe("set");

    el.removeAttribute("value");
    expect(el.querySelector("span")?.textContent).toBe("fallback");
  });

  test("internal signals are reactive", async () => {
    element("test-internal-signal", (props: { initial: () => string | null }) => {
      const count = signal(Number(props.initial?.()) || 0);
      return {
        tag: "div",
        children: [
          { tag: "span", props: { id: "count" }, children: [count] },
          { tag: "button", props: { id: "inc" }, on: { click: () => count(count() + 1) }, children: ["+"] }
        ]
      };
    });

    document.body.innerHTML = '<test-internal-signal initial="5"></test-internal-signal>';
    await tick();
    const el = document.querySelector("test-internal-signal")!;
    expect(el.querySelector("#count")?.textContent).toBe("5");

    el.querySelector<HTMLButtonElement>("#inc")!.click();
    flush();
    expect(el.querySelector("#count")?.textContent).toBe("6");
  });

  test("cleans up on disconnect", async () => {
    element("test-cleanup", () => {
      const count = signal(0);
      effect(() => { count(); });
      return { tag: "div", children: ["Cleanup test"] };
    });

    document.body.innerHTML = "<test-cleanup></test-cleanup>";
    await tick();
    const el = document.querySelector("test-cleanup") as any;
    expect(el._initialized).toBe(true);

    el.remove();
    expect(el._initialized).toBe(false);
    expect(el._dispose).toBeUndefined();
  });

  test("resets state on reconnect", async () => {
    let connectCount = 0;

    element("test-reconnect", () => {
      connectCount++;
      return { tag: "span", children: [`Count: ${connectCount}`] };
    });

    document.body.innerHTML = "<test-reconnect></test-reconnect>";
    await tick();
    const el = document.querySelector("test-reconnect")!;
    expect(connectCount).toBe(1);

    el.remove();
    document.body.appendChild(el);
    await tick();
    expect(connectCount).toBe(2);
  });

  test("multiple attributes", async () => {
    element("test-multi-attrs", (props: {
      first: () => string | null;
      last: () => string | null;
    }) => ({
      tag: "span",
      children: [`${props.first?.() ?? ""} ${props.last?.() ?? ""}`]
    }));

    document.body.innerHTML = '<test-multi-attrs first="John" last="Doe"></test-multi-attrs>';
    await tick();
    const el = document.querySelector("test-multi-attrs")!;
    expect(el.querySelector("span")?.textContent).toBe("John Doe");
  });

  test("works with html template", async () => {
    element("test-html-tpl", (props: { count: () => string | null }) => {
      const count = signal(Number(props.count?.()) || 0);
      return html`<div>Count: ${count}</div>`;
    });

    document.body.innerHTML = '<test-html-tpl count="5"></test-html-tpl>';
    await tick();
    const el = document.querySelector("test-html-tpl")!;
    expect(el.querySelector("div")?.textContent).toBe("Count: 5");
  });

  test("computed from props", async () => {
    element("test-computed", (props: { value: () => string | null }) => {
      const doubled = computed(() => Number(props.value?.()) * 2);
      return { tag: "span", children: [doubled] };
    });

    document.body.innerHTML = '<test-computed value="21"></test-computed>';
    await tick();
    const el = document.querySelector("test-computed")!;
    expect(el.querySelector("span")?.textContent).toBe("42");
  });

  test("captures default slot children", async () => {
    element("test-default-slot", (props: { children?: Node[] }) => ({
      tag: "div",
      props: { class: "wrapper" },
      children: props.children
    }));

    document.body.innerHTML = "<test-default-slot><span>Slotted content</span></test-default-slot>";
    await tick();
    const el = document.querySelector("test-default-slot")!;
    expect(el.querySelector(".wrapper span")?.textContent).toBe("Slotted content");
  });

  test("captures named slots", async () => {
    element("test-named-slots", (props: { slots?: Record<string, Node[]> }) => ({
      tag: "div",
      children: [
        { tag: "header", children: props.slots?.header },
        { tag: "footer", children: props.slots?.footer }
      ]
    }));

    document.body.innerHTML = `
      <test-named-slots>
        <h1 slot="header">Header</h1>
        <p slot="footer">Footer</p>
      </test-named-slots>
    `;
    await tick();
    const el = document.querySelector("test-named-slots")!;
    expect(el.querySelector("header h1")?.textContent).toBe("Header");
    expect(el.querySelector("footer p")?.textContent).toBe("Footer");
  });

  test("slots preserve reactivity in slotted content", async () => {
    const reactiveSpan = document.createElement("span");
    reactiveSpan.id = "reactive";

    element("test-reactive-slot", (props: { children?: Node[] }) => ({
      tag: "div",
      children: props.children
    }));

    document.body.innerHTML = "<test-reactive-slot></test-reactive-slot>";
    await tick();
    const el = document.querySelector("test-reactive-slot")!;

    // Manually add a reactive child and reconnect
    el.appendChild(reactiveSpan);
    el.remove();
    document.body.appendChild(el);
    await tick();

    // The span should be moved into the wrapper
    expect(el.querySelector("#reactive")).not.toBeNull();
  });

  test("mixed default and named slots", async () => {
    element("test-mixed-slots", (props: { children?: Node[]; slots?: Record<string, Node[]> }) => ({
      tag: "article",
      children: [
        { tag: "header", children: props.slots?.title },
        { tag: "main", children: props.children },
        { tag: "aside", children: props.slots?.sidebar }
      ]
    }));

    document.body.innerHTML = `
      <test-mixed-slots>
        <h1 slot="title">Article Title</h1>
        <p>Main content paragraph 1</p>
        <p>Main content paragraph 2</p>
        <nav slot="sidebar">Sidebar nav</nav>
      </test-mixed-slots>
    `;
    await tick();
    const el = document.querySelector("test-mixed-slots")!;
    expect(el.querySelector("header h1")?.textContent).toBe("Article Title");
    expect(el.querySelectorAll("main p").length).toBe(2);
    expect(el.querySelector("aside nav")?.textContent).toBe("Sidebar nav");
  });

  test("empty slots render nothing", async () => {
    element("test-empty-slots", (props: { slots?: Record<string, Node[]> }) => ({
      tag: "div",
      children: [
        { tag: "header", children: props.slots?.header || [{ tag: "span", children: ["Default header"] }] }
      ]
    }));

    document.body.innerHTML = "<test-empty-slots></test-empty-slots>";
    await tick();
    const el = document.querySelector("test-empty-slots")!;
    expect(el.querySelector("header span")?.textContent).toBe("Default header");
  });

  test("complex element with html function components", async () => {
    // Reusable component function
    const Button = (props: { label: string; onClick: () => void }) =>
      html`<button class="btn" on:click=${props.onClick}>${props.label}</button>`;

    const Badge = (props: { count: () => number }) =>
      html`<span class="badge">${props.count}</span>`;

    interface CardProps {
      title: () => string | null;
      children?: Node[];
      slots?: Record<string, Node[]>;
    }

    element<CardProps>("test-complex-html", (props) => {
      const count = signal(0);
      const items = signal<string[]>([]);
      const title = computed(() => props.title?.() ?? "Untitled");

      const addItem = () => {
        items([...items(), `Item ${items().length + 1}`]);
        count(count() + 1);
      };

      const removeItem = () => {
        const current = items();
        if (current.length > 0) {
          items(current.slice(0, -1));
          count(Math.max(0, count() - 1));
        }
      };

      return html`
        <div class="card">
          <header class="card-header">
            <h2>${title}</h2>
            <${Badge} count=${count} />
          </header>

          <nav class="card-actions">
            ${props.slots?.actions}
          </nav>

          <main class="card-body">
            <div class="controls">
              <${Button} label="Add" onClick=${addItem} />
              <${Button} label="Remove" onClick=${removeItem} />
            </div>

            <ul class="item-list">
              <${ForEach} each=${items} use=${(item: string) => html`<li>${item}</li>`} />
            </ul>

            <section class="slotted-content">
              ${props.children}
            </section>
          </main>

          <footer class="card-footer">
            ${props.slots?.footer}
          </footer>
        </div>
      `;
    });

    document.body.innerHTML = `
      <test-complex-html title="My Card">
        <button slot="actions">Custom Action</button>
        <p>Default slot content</p>
        <span>More content</span>
        <small slot="footer">© 2025</small>
      </test-complex-html>
    `;
    await tick();

    const el = document.querySelector("test-complex-html")!;

    // Verify structure
    expect(el.querySelector(".card")).not.toBeNull();
    expect(el.querySelector(".card-header h2")?.textContent).toBe("My Card");
    expect(el.querySelector(".badge")?.textContent).toBe("0");

    // Verify slots
    expect(el.querySelector(".card-actions button")?.textContent).toBe("Custom Action");
    expect(el.querySelector(".slotted-content p")?.textContent).toBe("Default slot content");
    expect(el.querySelector(".slotted-content span")?.textContent).toBe("More content");
    expect(el.querySelector(".card-footer small")?.textContent).toBe("© 2025");

    // Verify reactivity with Button components
    const addBtn = el.querySelector(".controls button.btn") as HTMLButtonElement;
    addBtn.click();
    flush();
    expect(el.querySelector(".badge")?.textContent).toBe("1");
    expect(el.querySelectorAll(".item-list li").length).toBe(1);
    expect(el.querySelector(".item-list li")?.textContent).toBe("Item 1");

    // Add more items
    addBtn.click();
    addBtn.click();
    flush();
    expect(el.querySelector(".badge")?.textContent).toBe("3");
    expect(el.querySelectorAll(".item-list li").length).toBe(3);

    // Remove item
    const removeBtn = el.querySelectorAll(".controls button.btn")[1] as HTMLButtonElement;
    removeBtn.click();
    flush();
    expect(el.querySelector(".badge")?.textContent).toBe("2");
    expect(el.querySelectorAll(".item-list li").length).toBe(2);

    // Verify computed title reacts to attribute change
    el.setAttribute("title", "Updated Title");
    expect(el.querySelector(".card-header h2")?.textContent).toBe("Updated Title");
  });
});
