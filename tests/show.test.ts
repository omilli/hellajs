import { show } from "../lib/show";
import { html } from "../lib/html";
import { signal } from "../lib/reactive/signal";
import { mount } from "../lib/mount";
import { describe, it, expect, beforeEach } from "bun:test";
import { flushEffects } from "../lib/reactive";

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
