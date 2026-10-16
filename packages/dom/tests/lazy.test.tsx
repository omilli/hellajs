import { describe, test, expect, beforeEach } from "vite-plus/test";
import { delay, resetTestState, suppressConsole } from "@utils/test-helpers.js";
import { mount, Lazy } from "@hellajs/dom";
import type { HellaNode, LazyOptions } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("lazy", () => {
    test("throws when loader is not a function", () => {
      expect(() =>
        Lazy(
          // @ts-expect-error — intentionally invalid: loader is not a function
          { loader: "not a function" },
        ),
      ).toThrow("[dom] Lazy: loader must be a function");
    });

    test("async component functions render via mount", async () => {
      const AsyncComponent = async () => <div id="async-comp">Async</div>;
      mount(AsyncComponent);
      expect(document.body.textContent).not.toContain("Async");
      await delay();
      expect(document.getElementById("async-comp")?.textContent).toBe("Async");
    });

    test("shows loading state while loading, then success content", async () => {
      let resolveComponent!: (component: () => HellaNode) => void;
      const successPromise = new Promise((resolve) => {
        resolveComponent = resolve;
      });
      const AsyncComponent = () => <div>Success</div>;
      const loading = <div>Loading...</div>;

      mount(
        <div id="container">
          <Lazy loader={() => successPromise.then(() => AsyncComponent)} loading={loading}></Lazy>
        </div>,
      );

      const container = document.getElementById("container")!;

      expect(container.textContent).toContain("Loading...");

      resolveComponent(AsyncComponent);
      await successPromise;
      await delay(0);

      expect(container.textContent).not.toContain("Loading...");
      expect(container.textContent).toContain("Success");
    });

    test("shows success content after async component loads", async () => {
      let resolveComponent!: (component: () => HellaNode) => void;
      const successPromise = new Promise((resolve) => {
        resolveComponent = resolve;
      });
      const AsyncComponent = () => <div>Success</div>;

      mount(
        <div id="container">
          <Lazy loader={() => successPromise.then(() => AsyncComponent)}></Lazy>
        </div>,
      );

      const container = document.getElementById("container")!;
      expect(container.textContent).toBe("");

      resolveComponent(AsyncComponent);
      await successPromise;
      await delay(0);

      expect(container.textContent).toContain("Success");
    });

    test("shows fallback content when loader rejects with fallback prop", async () => {
      const errorLoader = () => Promise.reject(new Error("Failed"));
      const fallback = <div>Fallback</div>;

      mount(
        <div id="container">
          <Lazy loader={errorLoader} fallback={fallback}></Lazy>
        </div>,
      );

      const container = document.getElementById("container")!;
      expect(container.textContent).toBe("");

      await delay(0);

      expect(container.textContent).toContain("Fallback");
    });

    test("logs and renders nothing when the loader rejects with no fallback", async () => {
      const suppressed = suppressConsole();
      try {
        mount(
          <div id="container">
            <Lazy loader={() => Promise.reject(new Error("boom"))}></Lazy>
          </div>,
        );

        const container = document.getElementById("container")!;
        expect(container.textContent).toBe("");

        await delay(0);

        expect(container.textContent).toBe("");
        expect(suppressed.errors).toHaveLength(1);
        const logged = suppressed.errors[0] as unknown[];
        expect(logged[0]).toBe("[dom] Lazy:");
        expect(logged[1]).toBeInstanceOf(Error);
      } finally {
        suppressed.restore();
      }
    });

    test("forwards props to loaded component", async () => {
      const ProfileComponent = (props: Record<string, unknown>) => {
        const { userId, theme } = props as { userId: number; theme: string };
        return (
          <div id="profile" class={theme}>
            User: {userId}
          </div>
        );
      };

      let resolveLoader!: (comp: typeof ProfileComponent) => void;
      const loaderPromise = new Promise<typeof ProfileComponent>((r) => {
        resolveLoader = r;
      });

      mount(
        <div id="container">
          <Lazy loader={() => loaderPromise} props={{ userId: 42, theme: "dark" }}></Lazy>
        </div>,
      );

      resolveLoader(ProfileComponent);
      await loaderPromise;
      await delay(0);

      const profile = document.getElementById("profile")!;
      expect(profile.textContent).toContain("42");
      expect(profile.className).toBe("dark");
    });

    test("removes loading state before showing fallback on error", async () => {
      const loading = <div id="loading-indicator">Loading...</div>;
      const fallback = <div id="error-fallback">Error!</div>;

      mount(
        <div id="container">
          <Lazy
            loader={() => Promise.reject(new Error("load failed"))}
            loading={loading}
            fallback={fallback}
          ></Lazy>
        </div>,
      );

      const container = document.getElementById("container")!;
      expect(container.textContent).toContain("Loading...");

      await delay(0);

      expect(document.getElementById("loading-indicator")).toBeNull();
      expect(container.textContent).not.toContain("Loading...");
      expect(document.getElementById("error-fallback")).not.toBeNull();
      expect(container.textContent).toContain("Error!");
    });

    test("bare minimum with no loading or fallback", async () => {
      let resolveComponent!: () => void;
      const promise = new Promise<void>((r) => {
        resolveComponent = r;
      });

      mount(
        <div id="container">
          <Lazy loader={() => promise.then(() => (<span>Done</span>) as HellaNode)}></Lazy>
        </div>,
      );

      const container = document.getElementById("container")!;
      expect(container.textContent).toBe("");

      resolveComponent();
      await promise;
      await delay(0);

      expect(container.textContent).toBe("Done");
    });

    test("prevents rendering when unmounted during load", async () => {
      let resolveComponent!: (val: () => HellaNode) => void;
      const pendingPromise = new Promise<() => HellaNode>((resolve) => {
        resolveComponent = resolve;
      });
      const AsyncComponent = () => <div>Should not render</div>;

      const app = mount(
        <div id="container">
          <Lazy loader={() => pendingPromise} loading={<div>Loading</div>}></Lazy>
        </div>,
      );

      const container = document.getElementById("container")!;
      expect(container.textContent).toContain("Loading");

      app.unmount();

      resolveComponent(AsyncComponent);
      await pendingPromise;
      await delay();

      // unmount ran lazyCleanup: the loading node is removed with the anchor, and the late
      // resolution inserts nothing
      expect(container.textContent).toBe("");
      expect(container.textContent).not.toContain("Should not render");
    });

    test("prevents fallback rendering when unmounted during failed load", async () => {
      let rejectLoader!: (err: Error) => void;
      const pendingPromise = new Promise<never>((_, reject) => {
        rejectLoader = reject;
      });

      const app = mount(
        <div id="container">
          <Lazy
            loader={() => pendingPromise}
            loading={<div>Loading</div>}
            fallback={<div>Fallback</div>}
          ></Lazy>
        </div>,
      );

      const container = document.getElementById("container")!;
      expect(container.textContent).toContain("Loading");

      app.unmount();

      rejectLoader(new Error("load failed"));
      await delay(0);

      expect(container.textContent).not.toContain("Fallback");
      expect(container.textContent).toBe("");
    });

    test("passes abort signal to loader and aborts on cleanup", async () => {
      let receivedSignal: AbortSignal | undefined;
      let resolveComponent!: (val: () => HellaNode) => void;
      const pendingPromise = new Promise<() => HellaNode>((resolve) => {
        resolveComponent = resolve;
      });
      const AsyncComponent = () => <div>Content</div>;

      const app = mount(
        <div id="container">
          <Lazy
            loader={(options?: LazyOptions) => {
              receivedSignal = options?.signal;
              return pendingPromise;
            }}
            loading={<div>Loading</div>}
          ></Lazy>
        </div>,
      );

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
