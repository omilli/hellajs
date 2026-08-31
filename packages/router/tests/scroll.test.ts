import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { router, navigate } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

type ScrollCall = [to: string, from: string, savedPosition: { top: number; left: number } | null];

describe("router", () => {
describe("scroll", () => {
  let render: (content: string) => void;
  let scrollSpy: ReturnType<typeof mock<() => void>>;
  let origScrollTo: typeof window.scrollTo;
  let origHref: string;

  beforeEach(() => {
    const { render: r } = setupRouterEnv();
    render = r;
    origScrollTo = window.scrollTo;
    scrollSpy = mock(() => { });
    window.scrollTo = scrollSpy;
    origHref = window.location.href;
    // A real document URL — pushState/replaceState do not move `pathname` off
    // about:blank's "blank", which popstate simulations rely on (see guards tests).
    window.location.href = "http://localhost/";
  });

  afterEach(() => {
    window.scrollTo = origScrollTo;
    window.location.href = origHref;
  });

  test("scrollBehavior 'top' calls scrollTo with { top: 0, left: 0 }", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: "top"
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
      scrollBehavior: "preserve"
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

    const [toPath, fromPath] = customScroll.mock.calls[0] as unknown as ScrollCall;
    expect(toPath).toBe("/about");
    expect(fromPath).not.toBe("/about");
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
      scrollBehavior: "top"
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

    navigate("/contact");
    const [secondTo, secondFrom] = customScroll.mock.calls[1]! as unknown as ScrollCall;

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

    navigate("/about");
    expect(routeScroll).toHaveBeenCalled();
    expect(globalScroll).not.toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalledWith({ top: 100 });
    routeScroll.mockClear();

    navigate("/");
    expect(globalScroll).toHaveBeenCalled();
    expect(routeScroll).not.toHaveBeenCalled();
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
      scrollBehavior: "top"
    });

    navigate("/about");
    expect(scrollSpy).not.toHaveBeenCalled();

    navigate("/");
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  test("route-level scroll: 'top' overrides global 'preserve'", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": {
          scroll: "top",
          handler: () => render("about")
        }
      },
      scrollBehavior: "preserve"
    });

    navigate("/");
    expect(scrollSpy).not.toHaveBeenCalled();

    navigate("/about");
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  test("custom scroll fn receives null on push and the saved position on back", () => {
    const customScroll = mock(() => ({ top: 0 }));
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: customScroll
    });

    origScrollTo(30, 500);
    navigate("/about");

    const [pushTo, , pushSaved] = customScroll.mock.calls[0] as unknown as ScrollCall;
    expect(pushTo).toBe("/about");
    expect(pushSaved).toBe(null);

    history.pushState(null, "", "/");
    window.dispatchEvent(new Event("popstate"));

    const [backTo, , backSaved] = customScroll.mock.calls[1] as unknown as ScrollCall;
    expect(backTo).toBe("/");
    expect(backSaved).toEqual({ top: 500, left: 30 });
  });

  test("push → back → push again restores the second visit's saved position", () => {
    const customScroll = mock(() => ({ top: 0 }));
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: customScroll
    });

    origScrollTo(0, 100);
    navigate("/about");
    history.pushState(null, "", "/");
    window.dispatchEvent(new Event("popstate"));

    origScrollTo(0, 700);
    navigate("/about");
    history.pushState(null, "", "/");
    window.dispatchEvent(new Event("popstate"));

    const calls = customScroll.mock.calls as unknown as ScrollCall[];
    expect(calls[2]![2]).toBe(null);
    expect(calls[3]![2]).toEqual({ top: 700, left: 0 });
  });

  test("'top' preset scrolls to top on back navigation", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: "top"
    });

    navigate("/about");
    scrollSpy.mockClear();

    history.pushState(null, "", "/");
    window.dispatchEvent(new Event("popstate"));

    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  test("hash-mode pop passes the saved position", () => {
    const customScroll = mock(() => ({ top: 0 }));
    router({
      mode: "hash",
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: customScroll
    });

    origScrollTo(0, 250);
    navigate("/about");

    window.location.hash = "#/";
    window.dispatchEvent(new Event("hashchange"));

    const [popTo, , popSaved] = customScroll.mock.calls[1] as unknown as ScrollCall;
    expect(popTo).toBe("/");
    expect(popSaved).toEqual({ top: 250, left: 0 });
  });

  test("init navigation skips scroll", () => {
    const customScroll = mock(() => ({ top: 0 }));
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: customScroll
    });

    expect(customScroll).not.toHaveBeenCalled();
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
});
