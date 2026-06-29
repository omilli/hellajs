import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { effect, flush, signal } from "@hellajs/core";
import { html, ForEach, element } from "@hellajs/dom/bundle";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("element", () => {
    test("with reactive props and signals", async () => {
      element("test-counter", (props: { initial: () => string | null }) => {
        const count = signal(Number(props.initial?.()) || 0);
        return html`
          <div>
            <span id="count">${count}</span>
            <button id="inc" on:click=${() => count(count() + 1)}>+</button>
          </div>
        `;
      });

      resetTestState('<test-counter initial="5"></test-counter>');
      await delay();

      const el = document.querySelector("test-counter")!;
      expect(el.querySelector("#count")?.textContent).toBe("5");

      el.querySelector<HTMLButtonElement>("#inc")!.click();
      flush();
      expect(el.querySelector("#count")?.textContent).toBe("6");
    });

    test("cleanup on disconnect and reinitialize", async () => {
      const renderFn = mock(() => {
        const count = signal(0);
        effect(() => { count(); });
        return html`<span>Count: ${renderFn.mock.calls.length}</span>`;
      });

      element("test-reconnect", renderFn);

      resetTestState("<test-reconnect></test-reconnect>");
      await delay();
      expect(renderFn).toHaveBeenCalledTimes(1);

      const el = document.querySelector("test-reconnect") as HellaElement;
      el.remove();

      document.body.appendChild(el);
      await delay();
      expect(renderFn).toHaveBeenCalledTimes(2);
    });

    test("reactive props handle attribute removal", async () => {
      element("test-attr-remove", (props: { value: () => string | null }) =>
        html`<span>${() => props.value?.() ?? "fallback"}</span>`
      );

      resetTestState('<test-attr-remove value="set"></test-attr-remove>');
      await delay();
      const el = document.querySelector("test-attr-remove")!;
      expect(el.querySelector("span")?.textContent).toBe("set");

      el.removeAttribute("value");
      expect(el.querySelector("span")?.textContent).toBe("fallback");
    });

    test("default and named slots", async () => {
      element("test-slots", (props: { children?: Node[]; slots?: Record<string, Node[]> }) =>
        html`
          <article>
            <header>${props.slots?.title}</header>
            <main>${props.children}</main>
            <aside>${props.slots?.sidebar}</aside>
          </article>
        `
      );

      resetTestState(`
        <test-slots>
          <h1 slot="title">Title</h1>
          <p>Main content 1</p>
          <p>Main content 2</p>
          <nav slot="sidebar">Sidebar</nav>
        </test-slots>
      `);
      await delay();

      const el = document.querySelector("test-slots")!;
      expect(el.querySelector("header h1")?.textContent).toBe("Title");
      expect(el.querySelectorAll("main p").length).toBe(2);
      expect(el.querySelector("aside nav")?.textContent).toBe("Sidebar");
    });

    test("throws on tag without hyphen", () => {
      expect(() => element("bad", () => html`<div></div>`)).toThrow(/\[dom\] element:/);
    });

    test("throws on non-function render", () => {
      expect(() => element("good-tag", "not a fn" as never)).toThrow(/\[dom\] element:/);
    });

    test("complex element with components", async () => {
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

      resetTestState(`
        <test-complex title="My Card">
          <button slot="actions">Action</button>
          <p>Default content</p>
          <small slot="footer">© 2025</small>
        </test-complex>
      `);
      await delay();

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
});