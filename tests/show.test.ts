import { describe, it, expect, beforeEach } from "bun:test";
import { show, html, mount } from "../lib/dom";
import { signal, flushEffects } from "../lib/reactive";

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
});
