import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  spyOn,
  mock,
} from "bun:test";
import { render, html } from "../lib/render";
import { signal } from "../lib/reactive";
import { tick } from "./utils";

describe("render", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "app";
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("elements", () => {
    test("basic", () => {
      render({ tag: "div", content: "Hello" }, "#app");
      expect(container.innerHTML).toBe("<div>Hello</div>");
    });

    test("nested", () => {
      render(
        {
          tag: "div",
          content: [
            { tag: "h1", content: "Title" },
            { tag: "p", content: "Text" },
          ],
        },
        "#app"
      );
      expect(container.innerHTML).toBe("<div><h1>Title</h1><p>Text</p></div>");
    });

    test("attributes", () => {
      render(
        {
          tag: "div",
          id: "test",
          classes: "foo bar",
          data: { test: "value" },
        },
        "#app"
      );
      const div = container.firstElementChild as HTMLElement;
      expect(div.id).toBe("test");
      expect(div.className).toBe("foo bar");
      expect(div.dataset.test).toBe("value");
    });

    test("null/undefined", () => {
      render(
        {
          tag: "div",
          content: [null, undefined, "valid"],
        },
        "#app"
      );
      expect(container.innerHTML).toBe("<div>valid</div>");
    });
  });

  describe("sanitize", () => {
    test("attributes", () => {
      expect(() => {
        render(
          {
            tag: "a",
            href: "javascript:alert('xss')",
            // @ts-expect-error
            onclick: "alert('xss')",
          },
          "#app"
        );
      }).toThrow();
    });

    test("tags", () => {
      expect(() => render({ tag: "script" }, "#app")).toThrow();
      expect(() => render({ tag: "iframe" }, "#app")).toThrow();
    });
  });

  describe("reactive", () => {
    test("updates", async () => {
      const count = signal(0);
      render(
        () => ({
          tag: "div",
          content: count,
        }),
        "#app"
      );

      await tick();
      expect(container.innerHTML).toBe("<div>0</div>");

      count.set(1);
      await tick();
      expect(container.innerHTML).toBe("<div>1</div>");
    });

    test("classes", async () => {
      const active = signal(false);
      render(
        () => ({
          tag: "div",
          classes: { active: active() },
        }),
        "#app"
      );
      await tick();
      expect(container.firstElementChild?.className).toBe("");

      active.set(true);
      await new Promise((r) => setTimeout(r, 0));
      expect(container.firstElementChild?.className).toBe("active");
    });

    test("nested", async () => {
      const items = signal(["a", "b"]);
      render(
        () => ({
          tag: "ul",
          content: items().map((item) => ({
            tag: "li",
            content: item,
          })),
        }),
        "#app"
      );
      await tick();
      expect(container.innerHTML).toBe("<ul><li>a</li><li>b</li></ul>");

      items.set(["c"]);
      await tick();
      expect(container.innerHTML).toBe("<ul><li>c</li></ul>");
    });
  });

  describe("events", () => {
    test("delegate", async () => {
      const clicks: number[] = [];
      render(
        () => ({
          tag: "div",
          content: [1, 2].map((n) => ({
            tag: "button",
            onclick: () => clicks.push(n),
          })),
        }),
        "#app"
      );

      await tick();
      const buttons = container.getElementsByTagName("button");
      buttons[0].click();
      buttons[1].click();
      expect(clicks).toEqual([1, 2]);
    });

    test("cleanup", async () => {
      const spy = spyOn(container, "removeEventListener");
      const cleanup = render(
        () => ({
          tag: "button",
          onclick: () => {},
        }),
        "#app"
      );
      await tick();
      cleanup();
      expect(spy).toHaveBeenCalled();
    });

    test("blocks", () => {
      expect(() =>
        render(
          {
            tag: "button",
            // @ts-expect-error
            onclick: new Function("alert('xss')"),
          },
          "#app"
        )
      ).toThrow();
    });
  });

  describe("html", () => {
    test("tags", () => {
      const { div, p } = html;
      render(div([p("Hello"), p("World")]), "#app");
      expect(container.innerHTML).toBe("<div><p>Hello</p><p>World</p></div>");
    });

    test("fragments", () => {
      const { $, p } = html;
      render($([p("One"), p("Two")]), "#app");
      expect(container.innerHTML).toBe("<p>One</p><p>Two</p>");
    });

    test("props", async () => {
      const { button } = html;
      const onClick = () => {};
      render(
        () =>
          button(
            {
              classes: "btn",
              onclick: onClick,
            },
            "Click me"
          ),
        "#app"
      );

      await tick();
      const btn = container.firstElementChild as HTMLElement;
      expect(btn.className).toBe("btn");
      expect(btn.onclick).toBeDefined();
    });
  });

  describe("lifecycle", () => {
    test("calls", async () => {
      const hooks = {
        pre: mock(() => {}),
        post: mock((el: HTMLElement) => {}),
      };

      render(
        () => ({
          tag: "div",
          onPreRender: hooks.pre,
          onRender: hooks.post,
        }),
        "#app"
      );

      await tick();
      expect(hooks.pre).toHaveBeenCalled();
      expect(hooks.post).toHaveBeenCalledWith(container.firstElementChild);
    });

    // test("cleanup", async () => {
    //   const cleanup = mock(() => {});
    //   const dispose = render(
    //     () => ({
    //       tag: "div",
    //       onRender: () => cleanup,
    //     }),
    //     "#app"
    //   );
    //   await tick();
    //   dispose();
    //   await tick();
    //   expect(cleanup).toHaveBeenCalled();
    // });
  });

  describe("errors", () => {
    test("mount", () => {
      expect(() => render({ tag: "div" }, "#missing")).toThrow();
    });
  });

  describe("performance", () => {
    test("batch", async () => {
      const items = signal(new Array(1000).fill("item"));
      const start = performance.now();

      render(
        () => ({
          tag: "ul",
          content: items().map((item) => ({
            tag: "li",
            content: item,
          })),
        }),
        "#app"
      );

      items.set(["single"]);
      await tick();

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should be fast
      expect(container.innerHTML).toBe("<ul><li>single</li></ul>");
    });
  });
});
