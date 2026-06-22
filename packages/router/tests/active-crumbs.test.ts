import { describe, test, expect, beforeEach } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { renderInto } from "./helpers";

describe("router", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;

  beforeEach(() => {
    resetTestState();
    container = setupContainer();
    render = renderInto(container);
    window.history.replaceState({}, "", "/");
  });

  describe("active", () => {
    test("returns true for ancestor pattern at nested path", () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/users": () => render("users")
            }
          }
        }
      });

      navigate("/admin/users");
      expect(route().active("/admin")).toBe(true);
    });

    test("returns true for deeper ancestor pattern", () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/users": {
                children: {
                  "/:id": () => render("user")
                }
              }
            }
          }
        }
      });

      navigate("/admin/users/123");
      expect(route().active("/admin/users")).toBe(true);
    });

    test("returns false for segment boundary mismatch", () => {
      router({
        routes: {
          "/administrators": () => render("admins"),
          "/admin": () => render("admin")
        }
      });

      navigate("/administrators");
      expect(route().active("/admin")).toBe(false);
    });

    test("returns true for exact match", () => {
      router({
        routes: {
          "/about": () => render("about")
        }
      });

      navigate("/about");
      expect(route().active("/about")).toBe(true);
    });

    test("returns false for non-matching pattern", () => {
      router({
        routes: {
          "/about": () => render("about")
        }
      });

      navigate("/about");
      expect(route().active("/contact")).toBe(false);
    });

    test("returns true for wildcard pattern match", () => {
      router({
        routes: {
          "/files/*": () => render("files")
        }
      });

      navigate("/files/docs/readme.md");
      expect(route().active("/files/*")).toBe(true);
    });

    test("strips query string before matching", () => {
      router({
        routes: {
          "/search": () => render("search")
        }
      });

      navigate("/search", { query: { q: "hello" } });
      expect(route().active("/search")).toBe(true);
    });
  });

  describe("crumbs", () => {
    test("flat route produces single crumb", () => {
      router({
        routes: {
          "/about": () => render("about")
        }
      });

      navigate("/about");
      expect(route().crumbs).toEqual([
        { segment: "/about", path: "/about", params: {} }
      ]);
    });

    test("nested route produces parent-to-leaf chain", () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/users": () => render("users")
            }
          }
        }
      });

      navigate("/admin/users");
      expect(route().crumbs).toEqual([
        { segment: "/admin", path: "/admin", params: {} },
        { segment: "/users", path: "/admin/users", params: {} }
      ]);
    });

    test("three-level nested route produces full chain with cumulative paths", () => {
      router({
        routes: {
          "/a": {
            children: {
              "/b": {
                children: {
                  "/c": () => render("c")
                }
              }
            }
          }
        }
      });

      navigate("/a/b/c");
      expect(route().crumbs).toEqual([
        { segment: "/a", path: "/a", params: {} },
        { segment: "/b", path: "/a/b", params: {} },
        { segment: "/c", path: "/a/b/c", params: {} }
      ]);
    });

    test("nested route with params exposes inherited params on leaf crumb", () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/users/:id": () => render("user")
            }
          }
        }
      });

      navigate("/admin/users/123");
      expect(route().crumbs).toEqual([
        { segment: "/admin", path: "/admin", params: {} },
        { segment: "/users/:id", path: "/admin/users/123", params: { id: "123" } }
      ]);
    });

    test("wildcard flat route produces single crumb with wildcard params", () => {
      router({
        routes: {
          "/files/*": () => render("files")
        }
      });

      navigate("/files/docs/readme.md");
      expect(route().crumbs).toEqual([
        { segment: "/files/*", path: "/files/docs/readme.md", params: { "*": "docs/readme.md" } }
      ]);
    });

    test("nested wildcard produces two crumbs with wildcard params on leaf", () => {
      router({
        routes: {
          "/files": {
            children: {
              "/*": () => render("file")
            }
          }
        }
      });

      navigate("/files/docs/readme.md");
      expect(route().crumbs).toEqual([
        { segment: "/files", path: "/files", params: {} },
        { segment: "/*", path: "/files/docs/readme.md", params: { "*": "docs/readme.md" } }
      ]);
    });

    test("notFound resolution produces empty crumbs", () => {
      router({
        routes: {
          "/": () => render("home")
        },
        notFound: () => render("not-found")
      });

      navigate("/nonexistent");
      expect(route().crumbs).toEqual([]);
    });

    test("query string excluded from crumb paths", () => {
      router({
        routes: {
          "/search": () => render("search")
        }
      });

      navigate("/search", { query: { q: "hello" } });
      expect(route().crumbs).toEqual([
        { segment: "/search", path: "/search", params: {} }
      ]);
    });
  });
});
