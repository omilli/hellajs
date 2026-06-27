import { describe, test, expect, beforeEach, mock } from "bun:test";
import { onError } from "@hellajs/dom/bundle";
import { signal } from "@hellajs/core";
import {resetTestState, setupContainer, suppressConsole} from "../../../utils/test-helpers.js";
import { mount, html, peekState } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import { fallbackHandler } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("error boundary", () => {
    test("caches resolved boundary on error-origin element", () => {
      fallbackHandler(html`<span>E</span>`);

      const container = setupContainer();
      const app = mount(html`
        <div id="b" error:fallback=${() => html`<span>F</span>`}>
          <div id="mid">
            <span id="deep">
              <button id="btn" on:click=${() => { throw new Error("click"); }}>X</button>
            </span>
          </div>
        </div>
      `, container);

      const btn = (container.querySelector("#btn") as HTMLElement) as Element;
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      app.flush();

      expect(peekState(btn)?.cachedBoundary?.id).toBe("b");
    });

    test("uses cached boundary for repeated errors", () => {
      fallbackHandler(html`<span>E</span>`);

      const shouldThrow = signal(false);
      const container = setupContainer();
      const app = mount(html`
        <div id="b" error:fallback=${() => html`<span>F</span>`}>
          <span id="deep">${() => { if (shouldThrow()) throw new Error("up"); return "OK"; }}</span>
        </div>
      `, container);

      const deep = container.querySelector("#deep") as Element;

      shouldThrow(true);
      app.flush();
      expect(peekState(deep)?.cachedBoundary?.id).toBe("b");

      shouldThrow(false);
      app.flush();
      shouldThrow(true);
      app.flush();

      expect(peekState(deep)?.cachedBoundary?.id).toBe("b");
    });

    test("error:boundary explicitly marks boundary", () => {
      fallbackHandler(html`<span>D</span>`);

      const container = setupContainer();
      mount(html`
        <div id="explicit" error:boundary error:fallback=${() => html`<span>FB</span>`}>
          <button on:click=${() => { throw new Error("click"); }}>X</button>
        </div>
      `, container);

      container.querySelector("button")!.click();
      expect(container.textContent).toBe("FB");
    });

    test("element with only error:category is NOT a boundary", () => {
      onError(() => html`<span>Global</span>` as HellaNode);

      const container = setupContainer();
      mount(html`
        <div id="parent" error:category="sidebar">
          <span id="child"><button on:click=${() => { throw new Error("click"); }}>X</button></span>
        </div>
      `, container);

      container.querySelector("button")!.click();
      expect(container.textContent).toBe("Global");
      expect(container.querySelector("#child")).not.toBeNull();
    });

    test("error:fallback implicitly creates boundary", () => {
      fallbackHandler(html`<span>D</span>`);

      const container = setupContainer();
      mount(html`
        <div id="implicit" error:fallback=${() => html`<span>FB</span>`}>
          <button on:click=${() => { throw new Error("click"); }}>X</button>
        </div>
      `, container);

      container.querySelector("button")!.click();
      expect(container.textContent).toBe("FB");
    });

    test("nested boundaries with explicit designation", () => {
      const outerCalled = mock(() => {});
      onError((_, context) => {
        if (context.config?.category === "inner") return html`<span>Inner</span>` as HellaNode;
        outerCalled();
        return html`<span>Outer</span>` as HellaNode;
      });

      const container = setupContainer();
      mount(html`
        <div error:boundary error:category="outer" error:fallback=${() => html`<span>O</span>`}>
          <div error:boundary error:category="inner" error:fallback=${() => html`<span>I</span>`}>
            <button on:click=${() => { throw new Error("click"); }}>X</button>
          </div>
        </div>
      `, container);

      container.querySelector("button")!.click();
      expect(outerCalled).not.toHaveBeenCalled();
      expect(container.textContent).toBe("Inner");
    });

    test("error:boundary without error:fallback still acts as boundary", () => {
      onError(() => html`<span>Handler FB</span>` as HellaNode);

      const container = setupContainer();
      mount(html`
        <div error:boundary>
          <button on:click=${() => { throw new Error("click"); }}>X</button>
        </div>
      `, container);

      container.querySelector("button")!.click();
      expect(container.textContent).toBe("Handler FB");
    });

    test("cache invalidation when boundary config is removed", () => {
      const suppressed = suppressConsole();

      fallbackHandler(html`<span>E</span>`);

      const shouldThrow = signal(false);
      const container = setupContainer();
      const app = mount(html`
        <div id="b" error:fallback=${() => html`<span>F</span>`}>
          <span id="deep">${() => { if (shouldThrow()) throw new Error("up"); return "OK"; }}</span>
        </div>
      `, container);

      const deep = container.querySelector("#deep") as Element;

      shouldThrow(true);
      app.flush();
      expect(peekState(deep)?.cachedBoundary).toBeDefined();

      const boundary = container.querySelector("#b") as HTMLElement;
      peekState(boundary)!.errorConfig = undefined;

      shouldThrow(false);
      app.flush();
      shouldThrow(true);
      app.flush();

      suppressed.restore();
    });

    test("direct event handler error is caught with boundary", () => {
      fallbackHandler(html`<span>E</span>`);

      const container = setupContainer();
      mount(html`
        <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
          <button id="btn" e:click=${() => { throw new Error("direct"); }}>X</button>
          <span id="sib">Sibling</span>
        </div>
      `, container);

      expect((container.querySelector("#btn") as HTMLElement)).not.toBeNull();

      (container.querySelector("#btn") as HTMLElement)!.click();

      expect(container.textContent).toBe("FB: direct");
      expect((container.querySelector("#btn") as HTMLElement)).toBeNull();
      expect(container.querySelector("#sib")).toBeNull();
    });

    test("preserves sibling elements when reactive child errors", () => {
      fallbackHandler(html`<span>E</span>`);

      const shouldThrow = signal(false);
      const container = setupContainer();
      const app = mount(html`
        <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
          <span id="sib1">${() => { if (shouldThrow()) throw new Error("oops1"); return "OK1"; }}</span>
          <span id="sib2">${() => { return "OK2"; }}</span>
        </div>
      `, container);

      expect(container.textContent).toBe("OK1OK2");

      shouldThrow(true);
      app.flush();

      expect(container.textContent).toContain("FB: oops1");
      expect(container.textContent).toContain("OK2");
      expect(container.querySelector("#sib1")).not.toBeNull();
      expect(container.querySelector("#sib1")?.textContent).toContain("FB: oops1");
      expect(container.querySelector("#sib2")).not.toBeNull();
      expect(container.querySelector("#sib2")?.textContent).toBe("OK2");
    });

    test("preserves static text when reactive child errors", () => {
      fallbackHandler(html`<span>E</span>`);

      const shouldThrow = signal(false);
      const container = setupContainer();
      const app = mount(html`
        <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
          <span>Static Before</span>
          <span id="dynamic">${() => { if (shouldThrow()) throw new Error("static"); return "Dynamic"; }}</span>
          <span>Static After</span>
        </div>
      `, container);

      expect(container.textContent).toBe("Static BeforeDynamicStatic After");

      shouldThrow(true);
      app.flush();

      expect(container.textContent).toContain("Static Before");
      expect(container.textContent).toContain("Static After");
      expect(container.textContent).toContain("FB: static");
      expect(container.querySelector("#dynamic")).not.toBeNull();
      expect(container.querySelector("#dynamic")?.textContent).toContain("FB: static");
    });

    test("initial mount error with direct child shows fallback in boundary", () => {
      fallbackHandler(html`<span>Default</span>`);

      const container = setupContainer();
      mount(html`
        <div id="b" error:fallback=${() => html`<span>Mount FB</span>`}>
          ${() => { throw new Error("direct"); }}
        </div>
      `, container);

      expect(container.querySelector("#b")?.textContent).toContain("Mount FB");
    });

    test("bind error replaces boundary content when boundary exists", () => {
      fallbackHandler(html`<span>E</span>`);

      const shouldThrow = signal(false);
      const container = setupContainer();
      const app = mount(html`
        <div id="b" error:fallback=${(e: Error) => html`<span>FB: ${e.message}</span>`}>
          <span id="c1">C1</span>
          <span id="c2" bind:test=${() => { if (shouldThrow()) throw new Error("bind"); return "ok"; }}>C2</span>
          <span id="c3">C3</span>
        </div>
      `, container);

      expect(container.querySelector("#c1")).not.toBeNull();

      shouldThrow(true);
      app.flush();

      expect(container.textContent).toBe("FB: bind");
      expect(container.querySelector("#c1")).toBeNull();
      expect(container.querySelector("#c3")).toBeNull();
    });

    test("nested boundaries preserve outer boundary content", () => {
      fallbackHandler(html`<span>Global</span>`);

      const shouldThrowInner = signal(false);
      const container = setupContainer();
      const app = mount(html`
        <div id="outer" error:fallback=${(e: Error) => html`<span>Outer FB: ${e.message}</span>`}>
          <span id="outer-static">Outer Static</span>
          <div id="inner" error:fallback=${(e: Error) => html`<span>Inner FB: ${e.message}</span>`}>
            <span id="inner-dynamic">${() => { if (shouldThrowInner()) throw new Error("inner"); return "Inner Dynamic"; }}</span>
          </div>
        </div>
      `, container);

      expect(container.textContent).toBe("Outer StaticInner Dynamic");

      shouldThrowInner(true);
      app.flush();

      expect(container.textContent).toContain("Outer Static");
      expect(container.textContent).toContain("Inner FB: inner");
      expect(container.querySelector("#outer-static")).not.toBeNull();
      expect(container.querySelector("#inner-dynamic")).not.toBeNull();
      expect(container.querySelector("#inner-dynamic")?.textContent).toContain("Inner FB: inner");
    });
  });
});