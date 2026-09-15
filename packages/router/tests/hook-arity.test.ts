import { describe, test, expect, beforeEach } from "bun:test";

import { router, navigate } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
describe("hook arity", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;

  beforeEach(() => {
    const env = setupRouterEnv();
    container = env.container;
    render = env.render;
  });

  test("runs zero-arg and single-arg global hooks", () => {
    const calls: string[] = [];
    router({
      routes: {
        "/home": () => render("home"),
        "/about": () => render("about")
      },
      hooks: {
        before: () => calls.push("before"),
        after: (to) => calls.push(`after:${to}`)
      }
    });

    navigate("/home");
    calls.length = 0;

    navigate("/about");

    expect(calls).toEqual(["before", "after:/about"]);
    expect(container.textContent).toBe("about");
  });

  test("handles hooks with function arity edge cases", () => {
    const calls: string[] = [];

    router({
      routes: {
        "/test": {
          before: (params: unknown, query: unknown) => {
            calls.push(`before-${params || "undefined"}-${query || "undefined"}`);
          },
          handler: (params: unknown, query: unknown) => {
            calls.push(`handler-${params || "undefined"}-${query || "undefined"}`);
            render("test");
          },
          after: (params: unknown, query: unknown) => {
            calls.push(`after-${params || "undefined"}-${query || "undefined"}`);
          }
        }
      }
    });

    navigate("/test");
    expect(calls).toEqual([
      "before-undefined-[object Object]",
      "handler-undefined-[object Object]",
      "after-undefined-[object Object]"
    ]);
  });

  test("handles nested hooks with no params but 2+ arity functions", () => {
    const hookCalls: string[] = [];

    router({
      routes: {
        "/admin": {
          before: (params: unknown, query: unknown) => {
            hookCalls.push(`before-${params === undefined ? "undefined" : params}-${query ? "query" : "no-query"}`);
          },
          children: {
            "/dashboard": {
              before: (params: unknown, query: unknown) => {
                hookCalls.push(`nested-before-${params === undefined ? "undefined" : params}-${query ? "query" : "no-query"}`);
              },
              handler: (params: unknown, query: unknown) => {
                hookCalls.push(`handler-${params === undefined ? "undefined" : params}-${query ? "query" : "no-query"}`);
                render("dashboard");
              },
              after: (params: unknown, query: unknown) => {
                hookCalls.push(`nested-after-${params === undefined ? "undefined" : params}-${query ? "query" : "no-query"}`);
              }
            }
          },
          after: (params: unknown, query: unknown) => {
            hookCalls.push(`after-${params === undefined ? "undefined" : params}-${query ? "query" : "no-query"}`);
          }
        }
      }
    });

    navigate("/admin/dashboard");
    expect(hookCalls).toEqual([
      "before-undefined-query",
      "nested-before-undefined-query",
      "handler-undefined-query",
      "nested-after-undefined-query",
      "after-undefined-query"
    ]);
    expect(container.textContent).toBe("dashboard");
  });
});
});
