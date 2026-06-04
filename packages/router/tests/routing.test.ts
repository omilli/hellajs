import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";

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

    navigate("/login?ref=1");
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
    expect(route().params["orgId"]).toBe("acme");
    expect(route().params["projectId"]).toBe("website");
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

    navigate("/page", { replace: true });
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
    const mockAddEventListener = mock(() => { });
    const mockRemoveEventListener = mock(() => { });

    global.window = {
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      location: {
        pathname: "/test",
        search: "?q=hello"
      }
    } as unknown as typeof global.window;

    router({
      routes: {
        "/test": () => render("test-page")
      }
    });

    expect(mockAddEventListener).toHaveBeenCalledWith("popstate", expect.any(Function));

    const calls = mockAddEventListener.mock.calls as unknown as [string, (...args: unknown[]) => void][];
    const popstateHandler = calls[0]?.[1];
    popstateHandler?.();

    expect(route().path).toBe("/test?q=hello");

    global.window = originalWindow;
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

  test("hooks-only parent with no matching child falls through to notFound", () => {
    let notFoundCalled = false;

    router({
      routes: {
        "/admin": {
          before: () => { },
          after: () => { },
          children: {
            "/users": () => render("users")
          }
        }
      },
      notFound: () => {
        notFoundCalled = true;
        render("404");
      }
    });

    navigate("/admin/nonexistent");
    expect(notFoundCalled).toBe(true);
    expect(container.textContent).toBe("404");
  });

  test("handles malformed query strings", () => {
    router({
      routes: {
        "/search": (_p: unknown, query: Record<string, string>) => render(`q=${query?.q ?? "none"}`)
      }
    });

    // Empty value
    navigate("/search", { query: { q: "" } });
    expect(route().query["q"]).toBe("");

    // Multiple & separators in raw URL
    navigate("/search?a=1&&b=2");
    expect(route().query["a"]).toBe("1");
    expect(route().query["b"]).toBe("2");
  });

  test("navigates with replace option affecting history", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/page1": () => render("page1"),
        "/page2": () => render("page2")
      }
    });

    navigate("/");
    const initialLength = window.history.length;

    navigate("/page1");
    navigate("/page2", { replace: true });

    // replace doesn't add a new history entry
    expect(window.history.length).toBe(initialLength + 1);
  });

  test("URL-encodes parameters and query values", () => {
    router({
      routes: {
        "/search/:term": ({ term }: { term: string }) => render(`term-${term}`),
        "/files/*": ({ "*": path }: { "*": string }) => render(`files-${path}`)
      }
    });

    navigate("/search/:term", { params: { term: "hello world" } });
    expect(container.textContent).toBe("term-hello world");
    expect(route().params["term"]).toBe("hello world");
    expect(route().path).toBe("/search/hello%20world");

    navigate("/search/:term", { params: { term: "a&b=c" } });
    expect(container.textContent).toBe("term-a&b=c");
    expect(route().params["term"]).toBe("a&b=c");
    expect(route().path).toBe("/search/a%26b%3Dc");

    navigate("/files/docs/hello%20world.md");
    expect(container.textContent).toBe("files-docs/hello world.md");
    expect(route().params["*"]).toBe("docs/hello world.md");
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

  test("sets handler reference on route signal", () => {
    const homeHandler = () => render("home");
    const aboutHandler = () => render("about");

    router({
      routes: {
        "/": homeHandler,
        "/about": aboutHandler
      }
    });

    navigate("/");
    expect(route().handler as () => void).toBe(homeHandler);

    navigate("/about");
    expect(route().handler as () => void).toBe(aboutHandler);
  });
});