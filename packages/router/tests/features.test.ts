import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { renderInto } from "./helpers";

describe("router", () => {
  describe("hash mode", () => {
    let container: HTMLDivElement;
    let render: (content: string) => void;

    beforeEach(() => {
      resetTestState();
      container = setupContainer();
      render = renderInto(container);
      window.history.replaceState({}, "", "/");
      window.location.hash = "";
    });

    afterEach(() => {
      window.location.hash = "";
    });

    test("uses hash for navigation in hash mode", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/about": () => render("about")
        },
        mode: "hash"
      });

      navigate("/about");
      expect(window.location.hash).toBe("#/about");
      expect(container.textContent).toBe("about");
    });

    test("handles hashchange events", () => {
      const originalWindow = global.window;
      const mockAddEventListener = mock(() => { });

      global.window = {
        addEventListener: mockAddEventListener,
        location: {
          pathname: "/",
          search: "",
          hash: "#/test"
        }
      } as unknown as typeof global.window;

      try {
        router({
          routes: {
            "/test": () => render("test-page")
          },
          mode: "hash"
        });

        expect(mockAddEventListener).toHaveBeenCalledWith("hashchange", expect.any(Function));
      } finally {
        global.window = originalWindow;
      }
    });

    test("extracts params in hash mode", () => {
      router({
        routes: {
          "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
        },
        mode: "hash"
      });

      navigate("/users/123");
      expect(container.textContent).toBe("user-123");
      expect(route().params["id"]).toBe("123");
    });

    test("handles query params in hash mode", () => {
      router({
        routes: {
          "/search": (_p: unknown, query: { q: string }) => render(`query-${query?.q}`)
        },
        mode: "hash"
      });

      navigate("/search", { query: { q: "test" } });
      expect(container.textContent).toBe("query-test");
      expect(window.location.hash).toBe("#/search?q=test");
    });
  });
});

describe("router", () => {
  describe("meta", () => {
    let container: HTMLDivElement;
    let render: (content: string) => void;

    beforeEach(() => {
      resetTestState();
      container = setupContainer();
      render = renderInto(container);
      window.history.replaceState({}, "", "/");
    });

    test("exposes meta on route signal", () => {
      router({
        routes: {
          "/about": {
            meta: { title: "About Us", description: "Learn more" },
            handler: () => render("about")
          }
        }
      });

      navigate("/about");
      expect(route().meta).toEqual({ title: "About Us", description: "Learn more" });
    });

    test("meta is undefined for routes without meta", () => {
      router({
        routes: {
          "/": () => render("home")
        }
      });

      navigate("/");
      expect(route().meta).toBeUndefined();
    });

    test("nested routes can have meta", () => {
      router({
        routes: {
          "/admin": {
            meta: { section: "admin" },
            children: {
              "/users": {
                meta: { title: "User Management" },
                handler: () => render("users")
              }
            }
          }
        }
      });

      navigate("/admin/users");
      expect(route().meta).toEqual({ title: "User Management" });
    });

    test("meta is accessible in before hook", () => {
      let capturedMeta: Record<string, unknown> | null = null;

      router({
        routes: {
          "/about": {
            meta: { title: "About" },
            before: () => {
              capturedMeta = route().meta ?? null;
            },
            handler: () => render("about")
          }
        }
      });

      navigate("/about");
      expect(capturedMeta!).toEqual({ title: "About" });
    });

    test("meta works with all route types", () => {
      router({
        routes: {
          "/": {
            meta: { title: "Home" },
            handler: () => render("home")
          },
          "/users/:id": {
            meta: { title: "User Profile" },
            handler: ({ id }: { id: string }) => render(`user-${id}`)
          }
        }
      });

      navigate("/");
      expect((route().meta)?.title).toBe("Home");

      navigate("/users/123");
      expect((route().meta)?.title).toBe("User Profile");
    });
  });

  describe("inheritMeta", () => {
    let container: HTMLDivElement;
    let render: (content: string) => void;

    beforeEach(() => {
      resetTestState();
      container = setupContainer();
      render = renderInto(container);
      window.history.replaceState({}, "", "/");
    });

    test("inherits parent meta in nested routes", () => {
      router({
        inheritMeta: true,
        routes: {
          "/admin": {
            meta: { section: "admin" },
            children: {
              "/users": {
                meta: { title: "Users" },
                handler: () => render("users")
              }
            }
          }
        }
      });

      navigate("/admin/users");
      expect(container.textContent).toBe("users");
      expect(route().meta).toEqual({ section: "admin", title: "Users" });
    });

    test("child meta overrides parent on key conflict", () => {
      router({
        inheritMeta: true,
        routes: {
          "/admin": {
            meta: { title: "Admin", section: "admin" },
            children: {
              "/users": {
                meta: { title: "Users" },
                handler: () => render("users")
              }
            }
          }
        }
      });

      navigate("/admin/users");
      expect(route().meta).toEqual({ title: "Users", section: "admin" });
    });

    test("three-level meta cascade", () => {
      router({
        inheritMeta: true,
        routes: {
          "/a": {
            meta: { levelA: true, level: "a" },
            children: {
              "/b": {
                meta: { levelB: true, level: "b" },
                children: {
                  "/c": {
                    meta: { levelC: true, level: "c" },
                    handler: () => render("c")
                  }
                }
              }
            }
          }
        }
      });

      navigate("/a/b/c");
      expect(container.textContent).toBe("c");
      expect(route().meta).toEqual({ levelA: true, levelB: true, levelC: true, level: "c" });
    });

    test("inline meta overrides inherited meta", () => {
      router({
        inheritMeta: true,
        routes: {
          "/admin": {
            meta: { section: "admin" },
            children: {
              "/users": {
                meta: { title: "Users" },
                handler: () => render("users")
              }
            }
          }
        }
      });

      navigate("/admin/users", { meta: { title: "Override" } });
      expect(container.textContent).toBe("users");
      expect(route().meta).toEqual({ section: "admin", title: "Override" });
    });

    test("leaf-only meta when inheritMeta not set", () => {
      router({
        routes: {
          "/admin": {
            meta: { section: "admin" },
            children: {
              "/users": {
                meta: { title: "User Management" },
                handler: () => render("users")
              }
            }
          }
        }
      });

      navigate("/admin/users");
      expect(route().meta).toEqual({ title: "User Management" });
    });

  test("flat route meta unchanged with inheritMeta", () => {
    router({
      inheritMeta: true,
      routes: {
        "/about": {
          meta: { title: "About" },
          handler: () => render("about")
        }
      }
    });

    navigate("/about");
    expect(route().meta).toEqual({ title: "About" });
  });

  test("mid-route inheritMeta false creates a boundary ignoring ancestors above", () => {
    router({
      inheritMeta: true,
      routes: {
        "/a": {
          meta: { root: true },
          children: {
            "/b": {
              inheritMeta: false,
              meta: { mid: true },
              children: {
                "/c": {
                  meta: { leaf: true },
                  handler: () => render("c")
                }
              }
            }
          }
        }
      }
    });

    navigate("/a/b/c");
    expect(container.textContent).toBe("c");
    expect(route().meta).toEqual({ mid: true, leaf: true });
  });

  test("leaf inheritMeta false produces leaf-only meta", () => {
    router({
      inheritMeta: true,
      routes: {
        "/admin": {
          meta: { section: "admin" },
          children: {
            "/users": {
              inheritMeta: false,
              meta: { title: "Users" },
              handler: () => render("users")
            }
          }
        }
      }
    });

    navigate("/admin/users");
    expect(route().meta).toEqual({ title: "Users" });
  });

  test("route inheritMeta true opts in when global is false", () => {
    router({
      routes: {
        "/admin": {
          inheritMeta: true,
          meta: { section: "admin" },
          children: {
            "/users": {
              inheritMeta: true,
              meta: { title: "Users" },
              handler: () => render("users")
            }
          }
        }
      }
    });

    navigate("/admin/users");
    expect(container.textContent).toBe("users");
    expect(route().meta).toEqual({ section: "admin", title: "Users" });
  });

  test("non-root route must opt in to inherit when global is false", () => {
    router({
      routes: {
        "/admin": {
          inheritMeta: true,
          meta: { section: "admin" },
          children: {
            "/users": {
              meta: { title: "Users" },
              handler: () => render("users")
            }
          }
        }
      }
    });

    navigate("/admin/users");
    expect(route().meta).toEqual({ title: "Users" });
  });
});
});
