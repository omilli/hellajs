import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, Lazy } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("dom", () => {
  describe("lazy", () => {
    test("verifies async function components don't render properly", async () => {
      const AsyncComponent = async () => html`<div>Async</div>` as HellaNode;
      mount(AsyncComponent);
      expect(document.body.textContent).not.toContain("Async");
    });

    test("shows loading state while loading, then success content", async () => {
      let resolveComponent!: (component: () => HellaNode) => void;
      const successPromise = new Promise(resolve => {
        resolveComponent = resolve;
      });
      const AsyncComponent = () => html`<div>Success</div>` as HellaNode;
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
      let resolveComponent!: (component: () => HellaNode) => void;
      const successPromise = new Promise(resolve => {
        resolveComponent = resolve;
      });
      const AsyncComponent = () => html`<div>Success</div>` as HellaNode;

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

    test("forwards props to loaded component", async () => {
      const ProfileComponent = (props: { userId: number; theme: string }) =>
        html`<div id="profile" class=${props.theme}>User: ${props.userId}</div>` as HellaNode;

      let resolveLoader!: (comp: typeof ProfileComponent) => void;
      const loaderPromise = new Promise<typeof ProfileComponent>(r => { resolveLoader = r; });

      mount(html`
        <div id="container">
          <${Lazy}
            loader=${() => loaderPromise}
            props=${{ userId: 42, theme: "dark" }}
          />
        </div>
      `);

      resolveLoader(ProfileComponent);
      await loaderPromise;
      await new Promise(res => setTimeout(res, 10));

      const profile = document.getElementById("profile")!;
      expect(profile.textContent).toContain("42");
      expect(profile.className).toBe("dark");
    });

    test("removes loading state before showing fallback on error", async () => {
      const loading = html`<div id="loading-indicator">Loading...</div>`;
      const fallback = html`<div id="error-fallback">Error!</div>`;

      mount(html`
        <div id="container">
          <${Lazy}
            loader=${() => Promise.reject(new Error("load failed"))}
            loading=${loading}
            fallback=${fallback}
          />
        </div>
      `);

      const container = document.getElementById("container")!;
      expect(container.textContent).toContain("Loading...");

      await new Promise(res => setTimeout(res, 20));

      expect(document.getElementById("loading-indicator")).toBeNull();
      expect(container.textContent).not.toContain("Loading...");
      expect(document.getElementById("error-fallback")).not.toBeNull();
      expect(container.textContent).toContain("Error!");
    });

    test("bare minimum with no loading or fallback", async () => {
      let resolveComponent!: () => void;
      const promise = new Promise<void>(r => { resolveComponent = r; });

      mount(html`
        <div id="container">
          <${Lazy} loader=${() => promise.then(() => html`<span>Done</span>` as HellaNode)} />
        </div>
      `);

      const container = document.getElementById("container")!;
      expect(container.textContent).toBe("");

      resolveComponent();
      await promise;
      await new Promise(res => setTimeout(res, 10));

      expect(container.textContent).toBe("Done");
    });
  });
});
