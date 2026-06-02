import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
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
    const mockAddEventListener = mock(() => { });

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

    navigate("/search", { query: { q: "test" } });
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

describe("scroll restoration", () => {
  let container: HTMLDivElement;
  let scrollSpy: ReturnType<typeof mock<() => void>>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    // Reset location to root for consistent initial state
    window.history.pushState({}, "", "/");
    scrollSpy = mock(() => { });
    window.scrollTo = scrollSpy;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const render = (content: string) => { container.textContent = content; };

  test("scrollBehavior 'top' calls scrollTo with { top: 0, left: 0 }", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: 'top'
    });

    navigate("/about");
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  test("scrollBehavior 'preserve' does not call scrollTo", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: 'preserve'
    });

    navigate("/about");
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test("scrollBehavior 'auto' (default) does not call scrollTo", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      }
    });

    navigate("/about");
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test("custom scroll function receives to and from paths", () => {
    const customScroll = mock(() => ({ top: 100, left: 50 }));

    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: customScroll
    });

    navigate("/about");

    // Verify customScroll was called with (to, from) - from is the initial path
    const [toPath, fromPath] = customScroll.mock.calls[0]!;
    expect(toPath).toBe("/about");
    expect(fromPath).not.toBe("/about"); // from should be different from to
    expect(scrollSpy).toHaveBeenCalledWith({ top: 100, left: 50 });
  });

  test("custom scroll function returning null skips scrollTo", () => {
    const customScroll = mock(() => null);

    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: customScroll
    });

    navigate("/about");
    expect(customScroll).toHaveBeenCalled();
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test("scroll happens on each navigation", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about"),
        "/contact": () => render("contact")
      },
      scrollBehavior: 'top'
    });

    navigate("/about");
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    navigate("/contact");
    expect(scrollSpy).toHaveBeenCalledTimes(2);
  });

  test("scroll receives correct from path on subsequent navigations", () => {
    const customScroll = mock(() => ({ top: 0 }));

    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about"),
        "/contact": () => render("contact")
      },
      scrollBehavior: customScroll
    });

    navigate("/about");
    const firstFromPath = customScroll.mock.calls[0]![1];

    navigate("/contact");
    const [secondTo, secondFrom] = customScroll.mock.calls[1]!;

    // Second navigation's "from" should be first navigation's "to"
    expect(secondTo).toBe("/contact");
    expect(secondFrom).toBe("/about");
  });

  test("route-level scroll overrides global setting", () => {
    const globalScroll = mock(() => ({ top: 0 }));
    const routeScroll = mock(() => ({ top: 100 }));

    router({
      routes: {
        "/": () => render("home"),
        "/about": {
          scroll: routeScroll,
          handler: () => render("about")
        }
      },
      scrollBehavior: globalScroll
    });

    navigate("/");
    expect(globalScroll).toHaveBeenCalled();
    globalScroll.mockClear();

    navigate("/about");
    expect(routeScroll).toHaveBeenCalled();
    expect(globalScroll).not.toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith({ top: 100 });
  });

  test("route-level scroll: false disables scrolling", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": {
          scroll: false,
          handler: () => render("about")
        }
      },
      scrollBehavior: 'top'
    });

    navigate("/");
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    scrollSpy.mockClear();

    navigate("/about");
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test("route-level scroll: 'top' overrides global 'preserve'", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": {
          scroll: 'top',
          handler: () => render("about")
        }
      },
      scrollBehavior: 'preserve'
    });

    navigate("/");
    expect(scrollSpy).not.toHaveBeenCalled();

    navigate("/about");
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 });
  });
});

describe("inline navigate options", () => {
  let container: HTMLDivElement;
  let scrollSpy: ReturnType<typeof mock<() => void>>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.history.pushState({}, "", "/");
    scrollSpy = mock(() => { });
    window.scrollTo = scrollSpy;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const render = (content: string) => { container.textContent = content; };

  test("inline scroll overrides global scrollBehavior", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: 'preserve'
    });

    navigate("/about", { scroll: "top" });
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  test("inline scroll overrides route-level scroll", () => {
    const routeScroll = mock(() => ({ top: 100 }));

    router({
      routes: {
        "/": () => render("home"),
        "/about": {
          scroll: routeScroll,
          handler: () => render("about")
        }
      }
    });

    navigate("/about", { scroll: "top" });
    expect(routeScroll).not.toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  test("inline scroll: false disables scrolling", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: 'top'
    });

    navigate("/");
    scrollSpy.mockClear();

    navigate("/about", { scroll: false });
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test("inline meta merges with route meta, preserving non-overridden keys", () => {
    router({
      routes: {
        "/about": {
          meta: { title: "About", section: "info" },
          handler: () => render("about")
        }
      }
    });

    navigate("/about", { meta: { title: "Override" } });
    expect(route().meta).toEqual({ title: "Override", section: "info" });
  });

  test("inline meta overrides route meta", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": {
          meta: { title: "Route Meta" },
          handler: () => render("about")
        }
      }
    });

    navigate("/about", { meta: { title: "Inline Meta", custom: true } });
    expect(route().meta).toEqual({ title: "Inline Meta", custom: true });
  });

  test("inline meta works on routes without route-level meta", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      }
    });

    navigate("/about", { meta: { title: "Inline Only" } });
    expect(route().meta).toEqual({ title: "Inline Only" });
  });

  test("combined options work together", () => {
    router({
      routes: {
        "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
      },
      scrollBehavior: 'preserve'
    });

    navigate("/users/:id", {
      params: { id: "123" },
      query: { tab: "posts" },
      scroll: "top",
      meta: { requiresAuth: true }
    });

    expect(container.textContent).toBe("user-123");
    expect(route().params.id).toBe("123");
    expect(route().query.tab).toBe("posts");
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 });
    expect(route().meta).toEqual({ requiresAuth: true });
  });
});

describe("edge cases", () => {
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

  test("calling router() twice reconfigures routes", () => {
    // First initialization
    router({
      routes: {
        "/": () => render("first-home"),
        "/about": () => render("first-about")
      }
    });

    navigate("/about");
    expect(container.textContent).toBe("first-about");

    // Second initialization: replaces route configuration
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
});
