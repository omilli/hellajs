import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay } from "@utils/test-helpers.js";

import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
describe("hooks", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;
  let log: string[];

  beforeEach(() => {
    const env = setupRouterEnv();
    container = env.container;
    log = [];
    render = (content: string) => {
      log.push(content);
      container.textContent = content;
    };
  });

  const logHook = (name: string) => () => log.push(name);

  test("executes global hooks around route", () => {
    router({
      routes: {
        "/": () => render("home")
      },
      hooks: {
        before: logHook("global-before"),
        after: logHook("global-after")
      }
    });

    navigate("/");
    expect(log).toEqual(["global-before", "home", "global-after"]);
  });

  test("passes to and from paths to global before hook", () => {
    const globalBefore = mock(() => {});
    router({
      routes: {
        "/home": () => render("home"),
        "/users/:id": ({ id }) => render(`user-${id}`)
      },
      hooks: { before: globalBefore }
    });

    navigate("/home");
    globalBefore.mockClear();

    navigate("/users/7?tab=posts");

    expect(globalBefore).toHaveBeenCalledWith("/users/7?tab=posts", "/home");
  });

  test("passes to and from paths to global after hook", () => {
    const globalAfter = mock(() => {});
    router({
      routes: {
        "/home": () => render("home"),
        "/users/:id": ({ id }) => render(`user-${id}`)
      },
      hooks: { after: globalAfter }
    });

    navigate("/home");
    globalAfter.mockClear();

    navigate("/users/7");

    expect(globalAfter).toHaveBeenCalledWith("/users/7", "/home");
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

  test("redirects to login carrying the attempted path from global before", () => {
    let authed = true;
    router({
      routes: {
        "/home": () => render("home"),
        "/login": (params, query) => render(`login?next=${query.next ?? "/"}`),
        "/admin": () => render("admin")
      },
      hooks: {
        before: (to) =>
          authed || to.startsWith("/login")
            ? true
            : `/login?next=${encodeURIComponent(to)}`
      }
    });

    navigate("/home");
    authed = false;

    navigate("/admin");

    expect(route().path).toBe("/login?next=%2Fadmin");
    expect(container.textContent).toBe("login?next=/admin");
  });

  test("executes route-specific hooks", () => {
    router({
      routes: {
        "/test": {
          before: logHook("route-before"),
          handler: () => render("test"),
          after: logHook("route-after")
        }
      }
    });

    navigate("/test");
    expect(log).toEqual(["route-before", "test", "route-after"]);
  });

  test("passes parameters to hooks", () => {
    const params: string[] = [];
    router({
      routes: {
        "/users/:id": {
          before: ({ id }) => params.push(`before-${id}`),
          handler: ({ id }) => render(`user-${id}`),
          after: ({ id }) => params.push(`after-${id}`)
        }
      }
    });

    navigate("/users/42");
    expect(params).toEqual(["before-42", "after-42"]);
    expect(container.textContent).toBe("user-42");
  });

  test("executes nested hooks in correct order", () => {
    router({
      routes: {
        "/admin": {
          before: logHook("admin-before"),
          after: logHook("admin-after"),
          children: {
            "/users": {
              before: logHook("users-before"),
              handler: () => render("users"),
              after: logHook("users-after")
            }
          }
        }
      }
    });

    navigate("/admin/users");
    expect(log).toEqual([
      "admin-before",
      "users-before",
      "users",
      "users-after",
      "admin-after"
    ]);
  });

  test("executes global and nested hooks together", () => {
    router({
      routes: {
        "/api": {
          before: logHook("route-before"),
          children: {
            "/v1": () => render("api-v1")
          },
          after: logHook("route-after")
        }
      },
      hooks: {
        before: logHook("global-before"),
        after: logHook("global-after")
      }
    });

    navigate("/api/v1");
    expect(log).toEqual([
      "global-before",
      "route-before",
      "api-v1",
      "route-after",
      "global-after"
    ]);
  });

  test("handles async hooks without blocking", async () => {
    const done = mock();

    router({
      routes: {
        "/test": {
          before: async () => {
            await delay(10);
            done();
          },
          handler: () => render("test")
        }
      }
    });

    navigate("/test");
    expect(container.textContent).toBe("test");
    expect(done).toHaveBeenCalledTimes(0);

    await delay(20);
    expect(done).toHaveBeenCalled();
  });

  test("supports mixed sync and async hooks", async () => {
    const done = mock();

    router({
      routes: {
        "/mixed": {
          before: logHook("sync-before"),
          handler: () => render("mixed"),
          after: async () => {
            await Promise.resolve();
            done();
          }
        }
      }
    });

    navigate("/mixed");
    expect(log).toEqual(["sync-before", "mixed"]);
    expect(done).toHaveBeenCalledTimes(0);

    await delay(10);
    expect(done).toHaveBeenCalled();
  });

  test("executes hooks for parent routes without handlers", () => {
    router({
      routes: {
        "/parent": {
          before: logHook("parent-before"),
          after: logHook("parent-after"),
          children: {
            "/child": () => render("child")
          }
        }
      }
    });

    navigate("/parent/child");
    expect(log).toEqual(["parent-before", "child", "parent-after"]);
  });

  test("passes inherited parameters to nested hooks", () => {
    const hookParams: Record<string, unknown>[] = [];

    router({
      routes: {
        "/org/:orgId": {
          before: ({ orgId }) =>
            hookParams.push({ hook: "parent", orgId }),
          children: {
            "/projects/:projectId": {
              before: ({ orgId, projectId }) =>
                hookParams.push({ hook: "child", orgId, projectId }),
              handler: () => render("project")
            }
          }
        }
      }
    });

    navigate("/org/acme/projects/website");
    expect(hookParams).toEqual([
      { hook: "parent", orgId: "acme" },
      { hook: "child", orgId: "acme", projectId: "website" }
    ]);
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

  test("inherits parameters through three levels of nesting", () => {
    const hookCalls: string[] = [];

    router({
      routes: {
        "/users": {
          children: {
            "/:userId": {
              before: ({ userId }) => {
                hookCalls.push(`nested-before-${userId}`);
              },
              children: {
                "/posts": {
                  children: {
                    "/:postId": {
                      before: ({ userId, postId }) => {
                        hookCalls.push(`deep-before-${userId}-${postId}`);
                      },
                      handler: ({ userId, postId }) => {
                        hookCalls.push(`handler-${userId}-${postId}`);
                        render(`post-${userId}-${postId}`);
                      },
                      after: ({ userId, postId }) => {
                        hookCalls.push(`deep-after-${userId}-${postId}`);
                      }
                    }
                  }
                }
              },
              after: ({ userId }) => {
                hookCalls.push(`nested-after-${userId}`);
              }
            }
          }
        }
      }
    });

    navigate("/users/john/posts/hello");
    expect(hookCalls).toEqual([
      "nested-before-john",
      "deep-before-john-hello",
      "handler-john-hello",
      "deep-after-john-hello",
      "nested-after-john"
    ]);
    expect(container.textContent).toBe("post-john-hello");
  });
});
});
