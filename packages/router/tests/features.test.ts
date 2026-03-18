import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";

describe("hash mode", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.history.replaceState({}, "", "/");
    window.location.hash = "";
  });

  afterEach(() => {
    document.body.removeChild(container);
    window.location.hash = "";
  });

  const render = (content: string) => { container.textContent = content; };

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
    const mockAddEventListener = jest.fn();

    Object.defineProperty(global, 'window', {
      value: {
        addEventListener: mockAddEventListener,
        location: {
          pathname: "/",
          search: "",
          hash: "#/test"
        }
      },
      writable: true
    });

    router({
      routes: {
        "/test": () => render("test-page")
      },
      mode: "hash"
    });

    // Verify addEventListener was called with hashchange
    expect(mockAddEventListener).toHaveBeenCalledWith("hashchange", expect.any(Function));

    global.window = originalWindow;
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
    expect(route().params.id).toBe("123");
  });

  test("handles query params in hash mode", () => {
    router({
      routes: {
        "/search": (_: any, query: { q: string }) => render(`query-${query?.q}`)
      },
      mode: "hash"
    });

    navigate("/search", {}, { q: "test" });
    expect(container.textContent).toBe("query-test");
    expect(window.location.hash).toBe("#/search?q=test");
  });

  test("defaults to history mode when not specified", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/test": () => render("test-page")
      }
    });

    navigate("/test");
    expect(route().path).toBe("/test");
    expect(container.textContent).toBe("test-page");
  });
});

describe("route meta", () => {
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
    let capturedMeta: any = null;

    router({
      routes: {
        "/about": {
          meta: { title: "About" },
          before: () => {
            capturedMeta = route().meta;
          },
          handler: () => render("about")
        }
      }
    });

    navigate("/about");
    expect(capturedMeta).toEqual({ title: "About" });
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
    expect(route().meta?.title).toBe("Home");

    navigate("/users/123");
    expect(route().meta?.title).toBe("User Profile");
  });
});
