import { describe, test, expect, beforeEach, mock } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;

  beforeEach(() => {
    const env = setupRouterEnv();
    container = env.container;
    render = env.render;
  });

  describe("history integration", () => {
    test("handles browser popstate events", () => {
      const originalWindow = global.window;
      const mockAddEventListener = mock(() => { });
      const mockRemoveEventListener = mock(() => { });

      global.window = {
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
        location: {
          pathname: "/test",
          search: "?q=hello"
        }
      } as unknown as typeof global.window;

      try {
        router({
          routes: {
            "/test": () => render("test-page")
          }
        });

        expect(mockAddEventListener).toHaveBeenCalledWith("popstate", expect.any(Function));

        const calls = mockAddEventListener.mock.calls as unknown as [string, (...args: unknown[]) => void][];
        const popstateHandler = calls[0]?.[1];
        popstateHandler?.();

        expect(route().path).toBe("/test?q=hello");
      } finally {
        global.window = originalWindow;
      }
    });

    test("sets handler reference on route signal", () => {
      const homeHandler = () => render("home");
      const aboutHandler = () => render("about");

      router({
        routes: {
          "/": homeHandler,
          "/about": aboutHandler
        }
      });

      navigate("/");
      expect(route().handler as () => void).toBe(homeHandler);

      navigate("/about");
      expect(route().handler as () => void).toBe(aboutHandler);
    });

    test("navigates with replace option affecting history", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/page1": () => render("page1"),
          "/page2": () => render("page2")
        }
      });

      navigate("/");
      const initialLength = window.history.length;

      navigate("/page1");
      navigate("/page2", { replace: true });

      expect(window.history.length).toBe(initialLength + 1);
    });
  });

  test("defaults to history mode when not specified", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/test": () => render("test-page")
      }
    });

    navigate("/test");
    expect(route().path).toBe("/test");
    expect(container.textContent).toBe("test-page");
  });
});
