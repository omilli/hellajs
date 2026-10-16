import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { resetTestState, setupContainer, suppressConsole } from "@utils/test-helpers.js";
import { mount, onError } from "@hellajs/dom";
import type { HellaNode, ErrorContext } from "@hellajs/dom";
import { fallbackHandler } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("error", () => {
    test("uses element fallback when config present", () => {
      fallbackHandler(<span>Default</span>);

      const container = setupContainer();
      mount(
        <div error:fallback={(e: Error) => <span>Custom: {e.message}</span>}>
          {() => {
            throw new Error("oops");
          }}
        </div>,
        container,
      );

      expect(container.textContent).toBe("Custom: oops");
    });

    test("falls back to handler default when no element config", () => {
      onError((error: Error) => (<span>Default: {error.message}</span>) as HellaNode);

      const container = setupContainer();
      mount(
        <div>
          {() => {
            throw new Error("oops");
          }}
        </div>,
        container,
      );

      expect(container.textContent).toBe("Default: oops");
    });

    test("render phase has no config (no element)", () => {
      let receivedConfig: unknown = "set";
      onError((_, context) => {
        receivedConfig = context.config;
        return null;
      });

      const Thrower = () => {
        throw new Error("render");
      };
      mount(<Thrower />);

      expect(receivedConfig).toBeUndefined();
    });

    test("config does not merge from parents", () => {
      fallbackHandler(<span>Parent</span>);

      const container = setupContainer();
      mount(
        <div error:fallback={() => <span>Parent</span>} error:category="outer">
          <div error:fallback={() => <span>Child</span>}>
            {() => {
              throw new Error("oops");
            }}
          </div>
        </div>,
        container,
      );

      expect(container.textContent).toBe("Child");
    });

    test("category is passed to handler", () => {
      let receivedCategory: string | undefined;
      onError((_, context) => {
        receivedCategory = context.config?.category;
        return null;
      });

      const container = setupContainer();
      mount(
        <div error:category="sidebar">
          <button
            on:click={() => {
              throw new Error("click");
            }}
          >
            Click
          </button>
        </div>,
        container,
      );

      container.querySelector("button")?.click();
      expect(receivedCategory).toBe("sidebar");
    });

    test("catches errors in shallow reactive child", () => {
      fallbackHandler();

      const container = setupContainer();
      mount(
        <div error:fallback={() => <span>Caught</span>}>
          {() => {
            throw new Error("shallow");
          }}
        </div>,
        container,
      );
      expect(container.textContent).toBe("Caught");
    });

    test("catches errors in deeply nested reactive child", () => {
      fallbackHandler();

      const container = setupContainer();
      mount(
        <div error:fallback={() => <span>Caught</span>}>
          <div>
            <span>
              {() => {
                throw new Error("deep");
              }}
            </span>
          </div>
        </div>,
        container,
      );
      expect(container.textContent).toBe("Caught");
    });

    test("catches error in event handler", () => {
      fallbackHandler();

      const container = setupContainer();
      mount(
        <div error:fallback={() => <span>Event error</span>}>
          <button
            on:click={() => {
              throw new Error("Click error");
            }}
          >
            Click
          </button>
        </div>,
        container,
      );

      container.querySelector("button")!.click();
      expect(container.textContent).toBe("Event error");
    });

    test("nearest element config wins", () => {
      const outerCalled = vi.fn(() => {});
      onError((_, context) => {
        if (context.config?.category === "inner") return <span>Inner</span>;
        outerCalled();
        return <span>Outer</span>;
      });

      const container = setupContainer();
      mount(
        <div error:category="outer" error:fallback={() => <span>Outer</span>}>
          <div error:category="inner" error:fallback={() => <span>Inner</span>}>
            {() => {
              throw new Error("Nested");
            }}
          </div>
        </div>,
        container,
      );

      expect(outerCalled).not.toHaveBeenCalled();
      expect(container.textContent).toBe("Inner");
    });

    test("handler returning null logs error without UI change", () => {
      const suppressed = suppressConsole();
      try {
        const called = vi.fn(() => {});
        onError(() => {
          called();
          return null;
        });

        const container = setupContainer();
        mount(
          <div id="content">
            {() => {
              throw new Error("Logged");
            }}
          </div>,
          container,
        );

        expect(called).toHaveBeenCalledTimes(1);
      } finally {
        suppressed.restore();
      }
    });

    test("works with JSX error: prefix", () => {
      let capturedError: Error | null = null;
      onError((e) => {
        capturedError = e;
        return null;
      });

      const node = (
        <div error:fallback={(e: Error) => <span>{e.message}</span>}>
          {() => {
            throw new Error("tpl");
          }}
        </div>
      );

      expect(node.error?.fallback).toBeDefined();
      mount(node);
      expect(capturedError!.message).toBe("tpl");
    });

    test("prevents infinite loop during mount error", () => {
      const suppressed = suppressConsole();
      try {
        const calls = vi.fn(() => {});

        onError((error: Error, context: ErrorContext) => {
          calls();
          return context.config?.fallback?.(error) ?? null;
        });

        const container = setupContainer();
        mount(
          <div
            error:fallback={() => {
              throw new Error("fb");
            }}
          >
            {() => {
              throw new Error("orig");
            }}
          </div>,
          container,
        );

        expect(calls).toHaveBeenCalledTimes(1);
      } finally {
        suppressed.restore();
      }
    });

    test("prevents infinite loop during event error", () => {
      const suppressed = suppressConsole();
      try {
        const calls = vi.fn(() => {});

        onError((error: Error, context: ErrorContext) => {
          calls();
          return context.config?.fallback?.(error) ?? null;
        });

        const container = setupContainer();
        mount(
          <div
            error:fallback={() => {
              throw new Error("fb");
            }}
          >
            <button
              on:click={() => {
                throw new Error("orig");
              }}
            >
              X
            </button>
          </div>,
          container,
        );

        const btn = container.querySelector("button");
        if (btn) btn.click();

        expect(calls).toHaveBeenCalledTimes(1);
      } finally {
        suppressed.restore();
      }
    });

    test("prevents infinite loop during update error", () => {
      const suppressed = suppressConsole();
      try {
        const calls = vi.fn(() => {});
        const s = signal(false);

        onError((error: Error, context: ErrorContext) => {
          calls();
          return context.config?.fallback?.(error) ?? null;
        });

        const container = setupContainer();
        const app = mount(
          <div
            error:fallback={() => {
              throw new Error("fb");
            }}
          >
            {() => {
              if (s()) throw new Error("orig");
              return "ok";
            }}
          </div>,
          container,
        );

        s(true);
        app.flush();

        expect(calls).toHaveBeenCalledTimes(1);
      } finally {
        suppressed.restore();
      }
    });

    test("supports multiple handlers, first non-null wins", () => {
      const order: string[] = [];

      onError(() => {
        order.push("first");
        return null;
      });
      onError(() => {
        order.push("second");
        return <span>Second</span>;
      });
      onError(() => {
        order.push("third");
        return <span>Third</span>;
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

      expect(order).toEqual(["first", "second"]);
      expect(container.textContent).toBe("Second");
    });

    test("remove function unregisters handler", () => {
      const firstCalled = vi.fn(() => (<span>First</span>) as HellaNode);
      const remove = onError(firstCalled);

      remove();
      onError(() => (<span>Second</span>) as HellaNode);

      const container = setupContainer();
      mount(
        <div>
          {() => {
            throw new Error("test");
          }}
        </div>,
        container,
      );

      expect(firstCalled).not.toHaveBeenCalled();
      expect(container.textContent).toBe("Second");
    });

    test("onError(null) clears all handlers", () => {
      const suppressed = suppressConsole();
      try {
        onError(() => (<span>H1</span>) as HellaNode);
        onError(() => (<span>H2</span>) as HellaNode);
        onError(null);

        const container = setupContainer();
        mount(
          <div>
            {() => {
              throw new Error("test");
            }}
          </div>,
          container,
        );

        expect(suppressed.errors.length).toBeGreaterThan(0);
        expect(suppressed.errors[0]![0]).toContain("[dom]");
      } finally {
        suppressed.restore();
      }
    });

    test("without boundary, fallback replaces error element content", () => {
      onError(() => (<span>Global</span>) as HellaNode);

      const container = setupContainer();
      mount(
        <div id="parent">
          <div id="child">
            {() => {
              throw new Error("no boundary");
            }}
          </div>
        </div>,
        container,
      );

      expect(container.querySelector("#child")?.textContent).toBe("Global");
      expect(container.querySelector("#parent")).not.toBeNull();
    });

    test("bind error replaces element content when no boundary", () => {
      const suppressed = suppressConsole();
      try {
        onError((error: Error) => (<span>E: {error.message}</span>) as HellaNode);

        const shouldThrow = signal(false);
        const container = setupContainer();
        const app = mount(
          <div id="parent">
            <span
              id="child"
              test={() => {
                if (shouldThrow()) throw new Error("bind");
                return "ok";
              }}
            >
              Content
            </span>
          </div>,
          container,
        );

        expect(container.querySelector("#child")?.textContent).toBe("Content");

        shouldThrow(true);
        app.flush();

        expect(container.querySelector("#child")?.textContent).toBe("E: bind");
      } finally {
        suppressed.restore();
      }
    });

    test("useful for library integration (tracking + UI)", () => {
      const tracked: Error[] = [];

      const remove = onError((error: Error) => {
        tracked.push(error);
        return null;
      });
      onError((error: Error) => (<span>Error: {error.message}</span>) as HellaNode);

      const container = setupContainer();
      mount(
        <div>
          {() => {
            throw new Error("tracked");
          }}
        </div>,
        container,
      );

      expect(tracked.length).toBe(1);
      expect(tracked[0]!.message).toBe("tracked");
      expect(container.textContent).toBe("Error: tracked");

      remove();
    });
  });
});
