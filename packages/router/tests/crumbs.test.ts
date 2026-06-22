import { describe, test, expect, beforeEach } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  let render: (content: string) => void;

  beforeEach(() => {
    const { render: r } = setupRouterEnv();
    render = r;
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
