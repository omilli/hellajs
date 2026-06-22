import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
describe("navigate options", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;
  let scrollSpy: ReturnType<typeof mock<() => void>>;
  let origScrollTo: typeof window.scrollTo;

  beforeEach(() => {
    const env = setupRouterEnv();
    container = env.container;
    render = env.render;
    origScrollTo = window.scrollTo;
    scrollSpy = mock(() => { });
    window.scrollTo = scrollSpy;
  });

  afterEach(() => {
    window.scrollTo = origScrollTo;
  });

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
    expect(route().params["id"]).toBe("123");
    expect(route().query["tab"]).toBe("posts");
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 });
    expect(route().meta).toEqual({ requiresAuth: true });
  });
});
});
