import { describe, it, expect, beforeEach } from "bun:test";
import { signal } from "../packages/core/dist/hella-core.esm";
import { show, html, mount } from "../packages/dom/dist/hella-dom.esm";
import { tick } from "./tick.js";

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
    visible(false);
    await tick();
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
    visible(true);
    await tick();
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
    await tick();
    expect(document.querySelector("span")?.textContent).toBe("Default case");
    count(1);
    await tick();
    expect(document.querySelector("span")?.textContent).toBe("Is 1");
    count(2);
    await tick();
    expect(document.querySelector("span")?.textContent).toBe("Is 2");
    count(3);
    await tick();
    expect(document.querySelector("span")?.textContent).toBe("Is 3");
  });

  it("should warn when using $ fragment in show content", async () => {
    const consoleSpy = {
      warnings: [],
      warn: console.warn
    };
    console.warn = (msg) => consoleSpy.warnings.push(msg);
    
    try {
      const visible = signal(true);
      const vnode = html.div(
        show(visible, () => html.$("Fragment content"))
      );
      mount(vnode);
      await tick();
      
      expect(consoleSpy.warnings).toContain("Using $ as a tag in show is not supported. Use html instead.");
    } finally {
      console.warn = consoleSpy.warn;
    }
  });

  it("should handle show with alternative argument pattern", async () => {
    const count = signal(1);
    const vnode = html.div(
      show(
        [() => count() === 1, () => html.span("Case 1")],
        [() => count() === 2, () => html.span("Case 2")],
        () => html.span("Default") // This pattern tests lines 453-455
      )
    );
    mount(vnode);
    expect(document.querySelector("span")?.textContent).toBe("Case 1");
    
    count(5); // Should hit default case
    await tick();
    expect(document.querySelector("span")?.textContent).toBe("Default");
  });
});
