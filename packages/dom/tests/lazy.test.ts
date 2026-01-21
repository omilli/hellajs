import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, Lazy } from "@hellajs/dom/bundle";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("async components verification", () => {
  test("verifies async function components don't render properly", () => {
    const AsyncComponent = async () => ({ tag: "div", children: ["Async"] });
    mount(() => AsyncComponent());
    expect(document.body.textContent).not.toContain("Async");
  });
});

describe("Lazy component", () => {
  test("shows loading state while loading, then success content", async () => {
    let resolveComponent!: (component: any) => void;
    const successPromise = new Promise(resolve => {
      resolveComponent = resolve;
    });
    const AsyncComponent = () => ({ tag: "div", children: ["Success"] });
    const loading = html`<div>Loading...</div>`;

    mount(html`
      <div id="container">
        <${Lazy} loader=${() => successPromise.then(() => AsyncComponent)} loading=${loading} />
      </div>
    `);

    const container = document.getElementById("container")!;

    // Loading state should be shown immediately
    expect(container.textContent).toContain("Loading...");

    // Resolve promise
    resolveComponent(AsyncComponent);
    await successPromise;
    await new Promise(res => setTimeout(res, 10));

    // Loading should be replaced with success content
    expect(container.textContent).not.toContain("Loading...");
    expect(container.textContent).toContain("Success");
  });

  test("loads async component with all paths", async () => {
    // Test success path
    let resolveComponent!: (component: any) => void;
    const successPromise = new Promise(resolve => {
      resolveComponent = resolve;
    });
    const AsyncComponent = () => ({ tag: "div", children: ["Success"] });

    // Test error path with fallback
    const errorLoader = () => Promise.reject(new Error("Failed"));
    const fallback = html`<div>Fallback</div>`;

    mount(html`
      <div id="container">
        <${Lazy} loader=${() => successPromise.then(() => AsyncComponent)} />
        <${Lazy} loader=${errorLoader} fallback=${fallback} />
      </div>
    `);

    const container = document.getElementById("container")!;
    expect(container.textContent).toBe("");

    // Test success
    resolveComponent(AsyncComponent);
    await successPromise;
    await new Promise(res => setTimeout(res, 10));

    // Test error fallback should be shown
    await new Promise(res => setTimeout(res, 20));

    expect(container.textContent).toContain("Success");
    expect(container.textContent).toContain("Fallback");
  });
});