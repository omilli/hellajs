import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import { router, navigate } from "../../packages/router";

describe("hooks", () => {
  let container: HTMLDivElement;
  let log: string[];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.history.replaceState({}, "", "/");
    log = [];
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const render = (content: string) => {
    log.push(content);
    container.textContent = content;
  };

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
          before: ({ id }: { id: string }) => params.push(`before-${id}`),
          handler: ({ id }: { id: string }) => render(`user-${id}`),
          after: ({ id }: { id: string }) => params.push(`after-${id}`)
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
    let asyncCompleted = false;

    router({
      routes: {
        "/test": {
          before: async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            asyncCompleted = true;
          },
          handler: () => render("test")
        }
      }
    });

    navigate("/test");
    expect(container.textContent).toBe("test");
    expect(asyncCompleted).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(asyncCompleted).toBe(true);
  });

  test("supports mixed sync and async hooks", async () => {
    let asyncCompleted = false;

    router({
      routes: {
        "/mixed": {
          before: logHook("sync-before"),
          handler: () => render("mixed"),
          after: async () => {
            await Promise.resolve();
            asyncCompleted = true;
          }
        }
      }
    });

    navigate("/mixed");
    expect(log).toEqual(["sync-before", "mixed"]);
    expect(asyncCompleted).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(asyncCompleted).toBe(true);
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
    const hookParams: Record<string, any>[] = [];

    router({
      routes: {
        "/org/:orgId": {
          before: ({ orgId }: { orgId: string }) =>
            hookParams.push({ hook: "parent", orgId }),
          children: {
            "/projects/:projectId": {
              before: ({ orgId, projectId }: { orgId: string, projectId: string }) =>
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
          before: (params: any, query: any) => {
            calls.push(`before-${params || "undefined"}-${query || "undefined"}`);
          },
          handler: (params: any, query: any) => {
            calls.push(`handler-${params || "undefined"}-${query || "undefined"}`);
            render("test");
          },
          after: (params: any, query: any) => {
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

  test("handles global after hook errors in nested routes", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });

    router({
      routes: {
        "/parent": {
          children: {
            "/child": () => render("child")
          }
        }
      },
      hooks: {
        after: () => { throw new Error("EXPECTED Global after error in nested"); }
      }
    });

    navigate("/parent/child");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router Global after:",
      expect.any(Error)
    );
    expect(container.textContent).toBe("child");

    consoleSpy.mockRestore();
  });

  test("handles global before hook errors in nested routes", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });

    router({
      routes: {
        "/parent": {
          children: {
            "/child": () => render("child")
          }
        }
      },
      hooks: {
        before: () => { throw new Error("EXPECTED Global before error in nested"); }
      }
    });

    navigate("/parent/child");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Router Global before:",
      expect.any(Error)
    );
    expect(container.textContent).toBe("child");

    consoleSpy.mockRestore();
  });

  test("handles nested hooks with no params but 2+ arity functions", () => {
    const hookCalls: string[] = [];

    router({
      routes: {
        "/admin": {
          before: (params: any, query: any) => {
            hookCalls.push(`before-${params === undefined ? "undefined" : params}-${query ? "query" : "no-query"}`);
          },
          children: {
            "/dashboard": {
              before: (params: any, query: any) => {
                hookCalls.push(`nested-before-${params === undefined ? "undefined" : params}-${query ? "query" : "no-query"}`);
              },
              handler: (params: any, query: any) => {
                hookCalls.push(`handler-${params === undefined ? "undefined" : params}-${query ? "query" : "no-query"}`);
                render("dashboard");
              },
              after: (params: any, query: any) => {
                hookCalls.push(`nested-after-${params === undefined ? "undefined" : params}-${query ? "query" : "no-query"}`);
              }
            }
          },
          after: (params: any, query: any) => {
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

  test("handles nested hooks with parameters", () => {
    const hookCalls: string[] = [];

    router({
      routes: {
        "/users": {
          children: {
            "/:userId": {
              before: ({ userId }: { userId: string }) => {
                hookCalls.push(`nested-before-${userId}`);
              },
              children: {
                "/posts": {
                  children: {
                    "/:postId": {
                      before: ({ userId, postId }: { userId: string, postId: string }) => {
                        hookCalls.push(`deep-before-${userId}-${postId}`);
                      },
                      handler: ({ userId, postId }: { userId: string, postId: string }) => {
                        hookCalls.push(`handler-${userId}-${postId}`);
                        render(`post-${userId}-${postId}`);
                      },
                      after: ({ userId, postId }: { userId: string, postId: string }) => {
                        hookCalls.push(`deep-after-${userId}-${postId}`);
                      }
                    }
                  }
                }
              },
              after: ({ userId }: { userId: string }) => {
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