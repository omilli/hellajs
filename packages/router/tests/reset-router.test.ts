import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush } from "@hellajs/core";
import { router, route, navigate, resetRouter } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("resetRouter", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    const env = setupRouterEnv();
    container = env.container;
  });

  test("resets config signals — after reset routes are empty so new navigation yields no match", () => {
    router({
      routes: { "/test": () => { container.textContent = "test"; } },
    });
    navigate("/test");
    expect(container.textContent).toBe("test");
    expect(route().handler).not.toBeNull();

    resetRouter();

    navigate("/test");
    expect(route().handler).toBeNull();
  });

  test("detaches prior listeners so re-init does not double-fire", () => {
    const handler = mock(() => {});
    router({
      routes: { "/": () => handler() },
    });
    flush();

    resetRouter();
    expect(route().handler).toBeNull();

    router({
      routes: { "/": () => handler() },
    });
    navigate("/");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("does not mutate window.location or history", () => {
    const pathBefore = window.location.pathname;
    const lengthBefore = history.length;

    resetRouter();

    expect(window.location.pathname).toBe(pathBefore);
    expect(history.length).toBe(lengthBefore);
  });
});