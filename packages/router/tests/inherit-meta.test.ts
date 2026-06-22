import { describe, test, expect, beforeEach } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  describe("inheritMeta", () => {
    let container: HTMLDivElement;
    let render: (content: string) => void;

    beforeEach(() => {
      const env = setupRouterEnv();
      container = env.container;
      render = env.render;
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
