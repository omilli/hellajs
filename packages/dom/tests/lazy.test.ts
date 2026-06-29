import { describe, test, expect, beforeEach } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, html, Lazy } from "@hellajs/dom/bundle";
import type { HellaNode, LazyOptions } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("lazy", () => {
    test("throws when loader is not a function", () => {
      expect(() => Lazy(
        // @ts-expect-error — intentionally invalid: loader is not a function
        { loader: "not a function" }
      )).toThrow("[dom] Lazy: loader must be a function");
    });

    test("async component functions render via mount", async () => {
      const AsyncComponent = async () => html`<div id="async-comp">Async</div>` as HellaNode;
      mount(AsyncComponent);
      expect(document.body.textContent).not.toContain("Async");
      await delay();
      expect(document.getElementById("async-comp")?.textContent).toBe("Async");
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

      expect(container.textContent).toContain("Loading...");

      resolveComponent(AsyncComponent);
      await successPromise;
      await delay(10);

      expect(container.textContent).not.toContain("Loading...");
      expect(container.textContent).toContain("Success");
    });

    test("shows success content after async component loads", async () => {
      let resolveComponent!: (component: () => HellaNode) => void;
      const successPromise = new Promise(resolve => {
        resolveComponent = resolve;
      });
      const AsyncComponent = () => html`<div>Success</div>` as HellaNode;

      mount(html`
        <div id="container">
          <${Lazy} loader=${() => successPromise.then(() => AsyncComponent)} />
        </div>
      `);

      const container = document.getElementById("container")!;
      expect(container.textContent).toBe("");

      resolveComponent(AsyncComponent);
      await successPromise;
      await delay(10);

      expect(container.textContent).toContain("Success");
    });

    test("shows fallback content when loader rejects with fallback prop", async () => {
      const errorLoader = () => Promise.reject(new Error("Failed"));
      const fallback = html`<div>Fallback</div>`;

      mount(html`
        <div id="container">
          <${Lazy} loader=${errorLoader} fallback=${fallback} />
        </div>
      `);

      const container = document.getElementById("container")!;
      expect(container.textContent).toBe("");

      await delay(20);

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
      await delay(10);

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

      await delay(20);

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
      await delay(10);

      expect(container.textContent).toBe("Done");
    });

    test("prevents rendering when unmounted during load", async () => {
      let resolveComponent!: (val: () => HellaNode) => void;
      const pendingPromise = new Promise<() => HellaNode>(resolve => {
        resolveComponent = resolve;
      });
      const AsyncComponent = () => html`<div>Should not render</div>` as HellaNode;

      const app = mount(html`
        <div id="container">
          <${Lazy} loader=${() => pendingPromise} loading=${html`<div>Loading</div>`} />
        </div>
      `);

      const container = document.getElementById("container")!;
      expect(container.textContent).toContain("Loading");

      app.unmount();

      resolveComponent(AsyncComponent);
      await pendingPromise;
      await delay();

      expect(container.textContent).toContain("Loading");
      expect(container.textContent).not.toContain("Should not render");
    });

    test("prevents fallback rendering when unmounted during failed load", async () => {
      let rejectLoader!: (err: Error) => void;
      const pendingPromise = new Promise<never>((_, reject) => {
        rejectLoader = reject;
      });

      const app = mount(html`
        <div id="container">
          <${Lazy}
            loader=${() => pendingPromise}
            loading=${html`<div>Loading</div>`}
            fallback=${html`<div>Fallback</div>`}
          />
        </div>
      `);

      const container = document.getElementById("container")!;
      expect(container.textContent).toContain("Loading");

      app.unmount();

      rejectLoader(new Error("load failed"));
      await delay(20);

      expect(container.textContent).not.toContain("Fallback");
      expect(container.textContent).toContain("Loading");
    });

    test("passes abort signal to loader and aborts on cleanup", async () => {
      let receivedSignal: AbortSignal | undefined;
      let resolveComponent!: (val: () => HellaNode) => void;
      const pendingPromise = new Promise<() => HellaNode>(resolve => {
        resolveComponent = resolve;
      });
      const AsyncComponent = () => html`<div>Content</div>` as HellaNode;

      const app = mount(html`
        <div id="container">
          <${Lazy} loader=${(options?: LazyOptions) => {
            receivedSignal = options?.signal;
            return pendingPromise;
          }} loading=${html`<div>Loading</div>`} />
        </div>
      `);

      expect(receivedSignal).toBeDefined();
      expect(receivedSignal!.aborted).toBe(false);

      app.unmount();

      expect(receivedSignal!.aborted).toBe(true);

      resolveComponent(AsyncComponent);
      await pendingPromise;
      await delay();
    });
  });
});
