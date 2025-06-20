import { describe, it, expect, beforeEach } from "bun:test";
import { signal, flushEffects } from "../packages/core/dist/hella-core.esm";
import { show, html, mount } from "../packages/dom/dist/hella-dom.esm";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("show", () => {
  it("should show and hide content", async () => {
    const visible = signal(true);
    const vnode = html.div(
      "Count: ",
      show(visible, () => html.span("Visible!"), () => html.span("Hidden!"))
    );
    mount(vnode);
    expect(document.querySelector("span")?.textContent).toBe("Visible!");
    visible.set(false);
    await flushEffects();
    expect(document.querySelector("span")?.textContent).toBe("Hidden!");
  });

  it("should render fallback when condition is false", async () => {
    const visible = signal(false);
    const vnode = html.div(
      "Show",
      show(visible, () => html.span("Visible!"), () => html.span("Hidden!"))
    );
    mount(vnode);
    expect(document.querySelector("span")?.textContent).toBe("Hidden!");
    visible.set(true);
    await flushEffects();
    expect(document.querySelector("span")?.textContent).toBe("Visible!");
  });

  it("should handle multiple conditions", async () => {
    const count = signal(0);
    const vnode = html.div(
      "Show",
      show(
        [() => count() === 1, () => html.span("Is 1")],
        [() => count() === 2, () => html.span("Is 2")],
        [() => count() === 3, () => html.span("Is 3")],
        [() => html.span("Default case")],
      )
    );
    mount(vnode);
    await flushEffects();
    expect(document.querySelector("span")?.textContent).toBe("Default case");
    count.set(1);
    await flushEffects();
    expect(document.querySelector("span")?.textContent).toBe("Is 1");
    count.set(2);
    await flushEffects();
    expect(document.querySelector("span")?.textContent).toBe("Is 2");
    count.set(3);
    await flushEffects();
    expect(document.querySelector("span")?.textContent).toBe("Is 3");
  });
});
