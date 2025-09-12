import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import { router, navigate, route } from "../dist/router";
import { flush } from "@hellajs/core";

describe("routing", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const render = (content: string) => { container.textContent = content; };

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

  test("extracts route parameters", () => {
    router({
      routes: {
        "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
      }
    });

    navigate("/users/123");
    expect(container.textContent).toBe("user-123");
    expect(route().params.id).toBe("123");
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
        "/search": (_: any, query: { q: string }) => render(`query-${query?.q}`)
      }
    });

    navigate("/search", {}, { q: "test" });
    expect(container.textContent).toBe("query-test");
    expect(route().query.q).toBe("test");
  });

  test("redirects using route map", () => {
    router({
      routes: {
        "/old": "/new",
        "/new": () => render("redirected")
      }
    });

    navigate("/old");
    expect(route().path).toBe("/new");
    expect(container.textContent).toBe("redirected");
  });

  test("redirects using global config", () => {
    router({
      routes: {
        "/dashboard": () => render("dashboard")
      },
      redirects: [{ from: ["/login"], to: "/dashboard" }]
    });

    navigate("/login");
    flush();
    expect(route().path).toBe("/dashboard");
    expect(container.textContent).toBe("dashboard");
  });

  test("handles not found routes", () => {
    let notFoundCalled = false;
    router({
      routes: {
        "/": () => render("home")
      },
      notFound: () => {
        notFoundCalled = true;
        render("404");
      }
    });

    navigate("/missing");
    expect(notFoundCalled).toBe(true);
    expect(container.textContent).toBe("404");
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
    expect(route().params.orgId).toBe("acme");
    expect(route().params.projectId).toBe("website");
  });

  test("prioritizes specific over generic routes", () => {
    router({
      routes: {
        "/users/admin": () => render("admin-user"),
        "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
      }
    });

    navigate("/users/admin");
    expect(container.textContent).toBe("admin-user");

    navigate("/users/123");
    expect(container.textContent).toBe("user-123");
  });

  test("supports navigation with replace option", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/page": () => render("page")
      }
    });

    navigate("/page", {}, {}, { replace: true });
    expect(container.textContent).toBe("page");
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

  test("prioritizes nested routes by specificity", () => {
    router({
      routes: {
        "/api": {
          children: {
            "/*": () => render("wildcard"),
            "/v1": {
              children: {
                "/users": () => render("users")
              }
            }
          }
        }
      }
    });

    navigate("/api/v1/users");
    expect(container.textContent).toBe("users");
  });

  test("sorts nested routes by wildcard and specificity", () => {
    router({
      routes: {
        "/docs": {
          children: {
            "/*": () => render("docs-wildcard"),
            "/api": {
              children: {
                "/reference": () => render("api-reference")
              }
            },
            "/guides": {
              children: {
                "/getting-started": () => render("getting-started"),
                "/*": () => render("guides-wildcard")
              }
            }
          }
        }
      }
    });

    navigate("/docs/api/reference");
    expect(container.textContent).toBe("api-reference");

    navigate("/docs/guides/getting-started");
    expect(container.textContent).toBe("getting-started");

    navigate("/docs/guides/advanced");
    expect(container.textContent).toBe("guides-wildcard");

    navigate("/docs/other");
    expect(container.textContent).toBe("docs-wildcard");
  });

  test("prioritizes non-wildcard over wildcard routes", () => {
    router({
      routes: {
        "/*": {
          children: {
            "/admin": () => render("wildcard-admin")
          }
        },
        "/content": {
          children: {
            "/admin": () => render("content-admin")
          }
        }
      }
    });

    navigate("/content/admin");
    expect(container.textContent).toBe("content-admin");
  });

  test("sorts routes by path specificity depth", () => {
    router({
      routes: {
        "/a": {
          children: {
            "/b": () => render("short-path")
          }
        },
        "/a/b/c": {
          children: {
            "/d": () => render("long-path")
          }
        }
      }
    });

    navigate("/a/b/c/d");
    expect(container.textContent).toBe("long-path");
  });

  test("handles browser popstate events", () => {
    const originalWindow = global.window;
    const mockAddEventListener = jest.fn();

    // Mock window object with addEventListener
    Object.defineProperty(global, 'window', {
      value: {
        addEventListener: mockAddEventListener,
        location: {
          pathname: "/test",
          search: "?q=hello"
        }
      },
      writable: true
    });

    router({
      routes: {
        "/test": () => render("test-page")
      }
    });

    // Verify addEventListener was called with popstate
    expect(mockAddEventListener).toHaveBeenCalledWith("popstate", expect.any(Function));

    // Get the popstate handler and call it
    const popstateHandler = mockAddEventListener.mock.calls[0]?.[1];
    popstateHandler();

    // Should update route to current window location
    expect(route().path).toBe("/test?q=hello");

    // Restore original window
    global.window = originalWindow;
  });
});