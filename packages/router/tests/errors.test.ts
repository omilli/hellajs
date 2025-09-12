import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import { router, navigate } from "../dist/router";

describe("errors", () => {
  let container: HTMLDivElement;
  let consoleSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.history.replaceState({}, "", "/");
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.removeChild(container);
    consoleSpy.mockRestore();
  });

  const render = (content: string) => { container.textContent = content; };

  test("handles global hook errors", () => {
    let handlerCalled = false;

    router({
      routes: {
        "/test": () => {
          handlerCalled = true;
          render("test");
        }
      },
      hooks: {
        before: () => { throw new Error("Global before error"); },
        after: () => { throw new Error("Global after error"); }
      }
    });

    navigate("/test");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Router Global before:",
      expect.any(Error)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router Global after:",
      expect.any(Error)
    );
    expect(handlerCalled).toBe(true);
    expect(container.textContent).toBe("test");
  });

  test("handles route hook errors", () => {
    let handlerCalled = false;

    router({
      routes: {
        "/test": {
          before: () => { throw new Error("Before error"); },
          handler: () => {
            handlerCalled = true;
            render("test");
          },
          after: () => { throw new Error("After error"); }
        }
      }
    });

    navigate("/test");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Router hook:",
      expect.any(Error)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router hook:",
      expect.any(Error)
    );
    expect(handlerCalled).toBe(true);
  });

  test("handles handler errors", () => {
    router({
      routes: {
        "/test": () => { throw new Error("Handler error"); }
      }
    });

    navigate("/test");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Router handler:",
      expect.any(Error)
    );
  });

  test("handles nested route errors", () => {
    let handlerCalled = false;

    router({
      routes: {
        "/parent": {
          children: {
            "/child": {
              before: () => { throw new Error("Nested before error"); },
              handler: () => {
                handlerCalled = true;
                render("child");
              },
              after: () => { throw new Error("Nested after error"); }
            }
          }
        }
      }
    });

    navigate("/parent/child");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Router Nested before:",
      expect.any(Error)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router Nested after:",
      expect.any(Error)
    );
    expect(handlerCalled).toBe(true);
    expect(container.textContent).toBe("child");
  });

  test("handles async hook errors", async () => {
    let handlerCalled = false;

    router({
      routes: {
        "/test": {
          before: async () => { throw new Error("Async error"); },
          handler: () => {
            handlerCalled = true;
            render("test");
          }
        }
      }
    });

    navigate("/test");
    expect(handlerCalled).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router hook async:",
      expect.any(Error)
    );
  });

  test("handles multiple errors in single navigation", () => {
    router({
      routes: {
        "/test": {
          before: () => { throw new Error("Before error"); },
          handler: () => { throw new Error("Handler error"); },
          after: () => { throw new Error("After error"); }
        }
      },
      hooks: {
        before: () => { throw new Error("Global before error"); },
        after: () => { throw new Error("Global after error"); }
      }
    });

    navigate("/test");

    expect(consoleSpy).toHaveBeenCalledTimes(5);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router Global before:",
      expect.any(Error)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router hook:",
      expect.any(Error)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router handler:",
      expect.any(Error)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router hook:",
      expect.any(Error)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router Global after:",
      expect.any(Error)
    );
  });

  test("continues navigation after errors", () => {
    let handlerCalled = false;

    router({
      routes: {
        "/test": {
          before: () => { throw new Error("Before error"); },
          handler: () => {
            handlerCalled = true;
            render("test");
          }
        }
      }
    });

    navigate("/test");
    expect(handlerCalled).toBe(true);
    expect(container.textContent).toBe("test");
  });

  test("handles malformed route structures", () => {
    let errorOccurred = false;

    try {
      router({
        routes: {
          "/malformed": {
            // @ts-expect-error - intentionally malformed
            children: null
          }
        }
      });
      navigate("/malformed/test");
    } catch (e) {
      errorOccurred = true;
    }

    expect(errorOccurred).toBe(false);
  });

  test("handles nested handler errors", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    router({
      routes: {
        "/parent": {
          children: {
            "/child": () => { throw new Error("Nested handler error"); }
          }
        }
      }
    });

    navigate("/parent/child");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router Nested handler:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});