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

  describe("routes", () => {
    test("navigates to static routes", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/about": () => render("about")
        }
      });

      navigate("/");
      expect(container.textContent).toBe("home");

      navigate("/about");
      expect(container.textContent).toBe("about");
    });

    test("handles mixed flat and nested routes", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/api": {
            children: {
              "/v1": () => render("api-v1")
            }
          },
          "/contact": () => render("contact")
        }
      });

      navigate("/");
      expect(container.textContent).toBe("home");

      navigate("/api/v1");
      expect(container.textContent).toBe("api-v1");

      navigate("/contact");
      expect(container.textContent).toBe("contact");
    });

    test("extracts route parameters", () => {
      router({
        routes: {
          "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
        }
      });

      navigate("/users/123");
      expect(container.textContent).toBe("user-123");
      expect(route().params["id"]).toBe("123");
    });

    test("handles wildcard routes", () => {
      router({
        routes: {
          "/files/*": () => render(`path-${route().path}`)
        }
      });

      navigate("/files/docs/readme.md");
      expect(container.textContent).toBe("path-/files/docs/readme.md");
    });

    test("processes query parameters", () => {
      router({
        routes: {
          "/search": (_p: unknown, query: { q: string }) => render(`query-${query?.q}`)
        }
      });

      navigate("/search", { query: { q: "test" } });
      expect(container.textContent).toBe("query-test");
      expect(route().query["q"]).toBe("test");
    });

    test("navigates using wildcard * parameter substitution", () => {
      router({
        routes: {
          "/files/*": ({ "*": wildcard }: { "*": string }) => render(`files-${wildcard}`)
        }
      });

      navigate("/files/*", { params: { "*": "docs/readme.md" } });
      expect(container.textContent).toBe("files-docs/readme.md");
      expect(route().params["*"]).toBe("docs/readme.md");
    });

    test("handles malformed query strings", () => {
      router({
        routes: {
          "/search": (_p: unknown, query: Record<string, string>) => render(`q=${query?.q ?? "none"}`)
        }
      });

      navigate("/search", { query: { q: "" } });
      expect(route().query["q"]).toBe("");

      navigate("/search?a=1&&b=2");
      expect(route().query["a"]).toBe("1");
      expect(route().query["b"]).toBe("2");
    });

    test("removes unmatched :param patterns from URL", () => {
      router({
        routes: {
          "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
        }
      });
      // @ts-expect-error - testing behavior when required param is missing
      navigate("/users/:id", { params: { wrongKey: "123" } });
      expect(route().path).toBe("/users/");
    });

    test("supports nested routes", () => {
      router({
        routes: {
          "/admin": {
            handler: () => render("admin"),
            children: {
              "/users": () => render("users"),
              "/:section": ({ section }: { section: string }) => render(`section-${section}`)
            }
          }
        }
      });

      navigate("/admin");
      expect(container.textContent).toBe("admin");

      navigate("/admin/users");
      expect(container.textContent).toBe("users");

      navigate("/admin/settings");
      expect(container.textContent).toBe("section-settings");
    });

    test("inherits parameters in nested routes", () => {
      router({
        routes: {
          "/org/:orgId": {
            children: {
              "/projects/:projectId": ({ orgId, projectId }: { orgId: string, projectId: string }) =>
                render(`${orgId}-${projectId}`)
            }
          }
        }
      });

      navigate("/org/acme/projects/website");
      expect(container.textContent).toBe("acme-website");
      expect(route().params["orgId"]).toBe("acme");
      expect(route().params["projectId"]).toBe("website");
    });

    test("handles wildcard parameters in nested routes", () => {
      router({
        routes: {
          "/files": {
            children: {
              "/*": ({ "*": wildcard }: { "*": string }) => render(`files-${wildcard}`)
            }
          }
        }
      });

      navigate("/files/docs/readme.md");
      expect(container.textContent).toBe("files-docs/readme.md");
      expect(route().params["*"]).toBe("docs/readme.md");
    });

    test("falls back to parent when nested route doesn't match", () => {
      router({
        routes: {
          "/admin": {
            handler: () => render("admin-fallback"),
            children: {
              "/users": () => render("users")
            }
          }
        }
      });

      navigate("/admin/nonexistent");
      expect(container.textContent).toBe("admin-fallback");
    });

    test("wildcard route does not match path shorter than base pattern", () => {
      const notFound = mock(() => { });
      router({
        routes: {
          "/files/*": () => { }
        },
        notFound
      });

      // Synchronous init may fire notFound for the unmatched initial path; isolate the navigate.
      notFound.mockClear();
      navigate("/");
      expect(notFound).toHaveBeenCalledTimes(1);
    });

    test("handles route value that is neither function nor plain object", () => {
      router({
        routes: {
          // @ts-expect-error - testing runtime behavior with invalid route value type
          "/test": []
        }
      });

      navigate("/test");
      expect(route().handler).toBeNull();
    });

    test("handles navigation with null routes", () => {
      // @ts-expect-error - testing runtime behavior with null routes
      router({ routes: null });

      navigate("/any-path");
      expect(route().path).toBe("/any-path");
      expect(route().handler).toBeNull();
    });

    test("calling router() twice reconfigures routes", () => {
      router({
        routes: {
          "/": () => render("first-home"),
          "/about": () => render("first-about")
        }
      });

      navigate("/about");
      expect(container.textContent).toBe("first-about");

      router({
        routes: {
          "/": () => render("second-home"),
          "/contact": () => render("second-contact")
        }
      });

      navigate("/");
      expect(container.textContent).toBe("second-home");

      navigate("/contact");
      expect(container.textContent).toBe("second-contact");
    });

    test("returns RouteInfo with path property", () => {
      const initial = router({ routes: { "/": () => render("home") } });
      expect(typeof initial.path).toBe("string");
      navigate("/");
      expect(container.textContent).toBe("home");
    });
  });
});
