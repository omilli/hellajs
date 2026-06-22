import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv, expectLoggedError } from "./helpers";

describe("router", () => {
describe("errors", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;
  let sup: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    const env = setupRouterEnv();
    container = env.container;
    render = env.render;
    sup = suppressConsole();
  });

  afterEach(() => {
    sup.restore();
  });

  test("handles global hook errors", () => {
    const handler = mock(() => render("test"));

    router({
      routes: {
        "/test": handler
      },
      hooks: {
        before: () => { throw new Error("Global before error"); },
        after: () => { throw new Error("Global after error"); }
      }
    });

    navigate("/test");

    expectLoggedError(sup, "[router] Global before:");
    expectLoggedError(sup, "[router] Global after:");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("test");
  });

  test("handles async global hook errors", async () => {
    const handler = mock(() => render("test"));

    router({
      routes: {
        "/test": handler
      },
      hooks: {
        before: async () => { throw new Error("Async global before error"); },
        after: async () => { throw new Error("Async global after error"); }
      }
    });

    navigate("/test");
    expect(handler).toHaveBeenCalledTimes(1);

    await tick(10);
    expectLoggedError(sup, "[router] Global before:");
    expectLoggedError(sup, "[router] Global after:");
  });

  test("handles route hook errors", () => {
    const handler = mock(() => render("test"));

    router({
      routes: {
        "/test": {
          before: () => { throw new Error("Before error"); },
          handler,
          after: () => { throw new Error("After error"); }
        }
      }
    });

    navigate("/test");

    expectLoggedError(sup, "[router] hook:", "Before error");
    expectLoggedError(sup, "[router] hook:", "After error");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("handles handler errors", () => {
    router({
      routes: {
        "/test": () => { throw new Error("Handler error"); }
      }
    });

    navigate("/test");

    expectLoggedError(sup, "[router] handler:");
  });

  test("handles nested route errors", () => {
    const handler = mock(() => render("child"));

    router({
      routes: {
        "/parent": {
          children: {
            "/child": {
              before: () => { throw new Error("Nested before error"); },
              handler,
              after: () => { throw new Error("Nested after error"); }
            }
          }
        }
      }
    });

    navigate("/parent/child");

    expectLoggedError(sup, "[router] Nested before:");
    expectLoggedError(sup, "[router] Nested after:");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("child");
  });

  test("handles async hook errors", async () => {
    const handler = mock(() => render("test"));

    router({
      routes: {
        "/test": {
          before: async () => { throw new Error("Async error"); },
          handler
        }
      }
    });

    navigate("/test");
    expect(handler).toHaveBeenCalledTimes(1);

    await tick(10);
    expectLoggedError(sup, "[router] hook:");
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

    expect(sup.errors).toHaveLength(5);
    expectLoggedError(sup, "[router] Global before:");
    expectLoggedError(sup, "[router] hook:");
    expectLoggedError(sup, "[router] handler:");
    expectLoggedError(sup, "[router] hook:");
    expectLoggedError(sup, "[router] Global after:");
  });

  test("treats route with null children as a leaf with no handler", () => {
    router({
      routes: {
        "/malformed": {
          // @ts-expect-error - intentionally malformed
          children: null
        }
      }
    });
    navigate("/malformed/test");
    expect(route().handler).toBeNull();
    expect(route().path).toBe("/malformed/test");
  });

  test("handles nested handler errors", () => {
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
    expectLoggedError(sup, "[router] Nested handler:");
  });

  test("handles global after hook errors in nested routes", () => {
    router({
      routes: {
        "/parent": {
          children: {
            "/child": () => render("child")
          }
        }
      },
      hooks: {
        after: () => { throw new Error("Global after error in nested"); }
      }
    });

    navigate("/parent/child");
    expectLoggedError(sup, "[router] Global after:");
    expect(container.textContent).toBe("child");
  });

  test("handles global before hook errors in nested routes", () => {
    router({
      routes: {
        "/parent": {
          children: {
            "/child": () => render("child")
          }
        }
      },
      hooks: {
        before: () => { throw new Error("Global before error in nested"); }
      }
    });

    navigate("/parent/child");
    expectLoggedError(sup, "[router] Global before:");
    expect(container.textContent).toBe("child");
  });
});
});
