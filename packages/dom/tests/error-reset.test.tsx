import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { component, mount, onError } from "@hellajs/dom";
import { child, errorConfig, mark, prop, template } from "@hellajs/dom/runtime";
import type { ComponentFn } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("error reset", () => {
    test("context includes reset function when boundary exists", () => {
      let resetFn: (() => void) | undefined;
      onError((_, context) => {
        resetFn = context.reset;
        return <span>Error</span>;
      });

      const container = setupContainer();
      mount(
        <div error:fallback={() => <span>F</span>}>
          {() => {
            throw new Error("test");
          }}
        </div>,
        container,
      );

      expect(resetFn).toBeDefined();
      expect(typeof resetFn).toBe("function");
    });

    test("reset re-renders original content", () => {
      const shouldThrow = signal(true);
      let resetFn: (() => void) | undefined;

      onError((_, context) => {
        resetFn = context.reset;
        return context.config?.fallback?.(_) ?? <span>F</span>;
      });

      const container = setupContainer();
      const app = mount(
        <div error:fallback={(e: Error) => <span>E: {e.message}</span>}>
          {() => {
            if (shouldThrow()) throw new Error("oops");
            return <span>OK</span>;
          }}
        </div>,
        container,
      );

      expect(container.textContent).toBe("E: oops");

      shouldThrow(false);
      resetFn!();
      app.flush();

      expect(container.textContent).toBe("OK");
    });

    test("reset without boundary does nothing", () => {
      let resetFn: (() => void) | undefined;
      onError((_, context) => {
        resetFn = context.reset;
        return <span>Error</span>;
      });

      const container = setupContainer();
      mount(
        <div>
          {() => {
            throw new Error("test");
          }}
        </div>,
        container,
      );

      expect(resetFn).toBeUndefined();
    });

    test("reset can be called multiple times", () => {
      const shouldThrow = signal(true);
      let resetFn: (() => void) | undefined;

      const errorHandler = vi.fn((_error: Error, context: { reset?: () => void }) => {
        if (!resetFn) resetFn = context.reset;
        return <span>Error #{errorHandler.mock.calls.length}</span>;
      });
      onError(errorHandler);

      const container = setupContainer();
      const app = mount(
        <div error:fallback={() => <span>F</span>}>
          {() => {
            if (shouldThrow()) throw new Error("oops");
            return <span>OK</span>;
          }}
        </div>,
        container,
      );

      expect(container.textContent).toBe("Error #1");

      resetFn!();
      app.flush();
      expect(container.textContent).toBe("Error #2");

      shouldThrow(false);
      resetFn!();
      app.flush();
      expect(container.textContent).toBe("OK");
    });

    test("same reset function restores content across multiple calls", () => {
      const shouldThrow = signal(true);
      let firstReset: (() => void) | undefined;

      const errorHandler = vi.fn((_error: Error, context: { reset?: () => void }) => {
        if (!firstReset) firstReset = context.reset;
        return <span>Error #{errorHandler.mock.calls.length}</span>;
      });
      onError(errorHandler);

      const container = setupContainer();
      mount(
        <div error:fallback={() => <span>F</span>}>
          {() => {
            if (shouldThrow()) throw new Error("oops");
            return <span>OK</span>;
          }}
        </div>,
        container,
      );

      expect(container.textContent).toBe("Error #1");

      firstReset!();
      expect(container.textContent).toBe("Error #2");

      firstReset!();
      expect(container.textContent).toBe("Error #3");

      shouldThrow(false);
      firstReset!();
      expect(container.textContent).toBe("OK");
    });

    test("reset preserves original template across error cycles", () => {
      const shouldThrow = signal(true);
      let resetFn: (() => void) | undefined;

      onError((_, context) => {
        resetFn = context.reset;
        return <span>Error</span>;
      });

      const container = setupContainer();
      const app = mount(
        <div error:fallback={() => <span>F</span>}>
          {() => {
            if (shouldThrow()) throw new Error("oops");
            return <span>Original</span>;
          }}
        </div>,
        container,
      );

      expect(container.textContent).toBe("Error");

      shouldThrow(false);
      resetFn!();
      expect(container.textContent).toBe("Original");

      shouldThrow(true);
      app.flush();
      expect(container.textContent).toBe("Error");

      shouldThrow(false);
      resetFn!();
      expect(container.textContent).toBe("Original");
    });

    test("flagged root error config dispatches to the fallback and reset re-invokes the build", async () => {
      const shouldThrow = signal(true);
      let resetFn: (() => void) | undefined;
      const destroyTracker = vi.fn();
      onError((_, context) => {
        resetFn = context.reset;
        return context.config?.fallback?.(_) ?? null;
      });

      const rowTpl = template(`<div id="rt-err"><span class="val"></span></div>`);
      const build = mark(
        vi.fn(() => {
          const root = rowTpl();
          errorConfig(
            root,
            {
              fallback: () => (
                <span id="rt-fb" hook:afterDestroy={destroyTracker}>
                  F
                </span>
              ),
            },
            build,
          );
          prop(root, "class", () => {
            if (shouldThrow()) throw new Error("boom");
            return "ok";
          });
          return root;
        }),
      );
      const Root = () => build;

      mount(<div id="rt-err-host"></div>);
      child(document.getElementById("rt-err-host")!, component(Root as ComponentFn, {}));
      const root = document.getElementById("rt-err")!;

      expect(root.textContent).toBe("F");
      expect(root.querySelector(".val")).toBeNull();
      expect(resetFn).toBeDefined();
      expect(build).toHaveBeenCalledTimes(1);

      shouldThrow(false);
      resetFn!();

      expect(build).toHaveBeenCalledTimes(2);
      const freshRoot = root.firstElementChild as Element;
      expect(freshRoot.classList.contains("ok")).toBe(true);
      expect(freshRoot.querySelector(".val")).not.toBeNull();
      expect(root.querySelector("#rt-fb")).toBeNull();
      for (let i = 0; i < 50; i++) {
        if (destroyTracker.mock.calls.length > 0) break;
        await delay();
      }
      expect(destroyTracker).toHaveBeenCalledTimes(1);
    });
  });
});
