import { describe, test, expect, beforeEach, mock } from "bun:test";

import { router, navigate, route, resetRouter } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  describe("memory mode", () => {
    let container: HTMLDivElement;
    let render: (content: string) => void;

    beforeEach(() => {
      const env = setupRouterEnv();
      container = env.container;
      render = env.render;
    });

    test("resolves the initial route at / when no url is given", () => {
      resetRouter();
      router({
        routes: {
          "/": () => render("home"),
          "/users/:id": ({ id }) => render(`user-${id}`)
        },
        mode: "memory"
      });

      expect(route().path).toBe("/");
      expect(container.textContent).toBe("home");
    });

    test("parses the url option as the initial path", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/users/:id": ({ id }) => render(`user-${id}`)
        },
        mode: "memory",
        url: "/users/7"
      });

      expect(route().path).toBe("/users/7");
      expect(route().params["id"]).toBe("7");
      expect(container.textContent).toBe("user-7");
    });

    test("navigate() updates route() without touching location or history", () => {
      const userHandler = ({ id }: { id?: string }) => render(`user-${id}`);
      router({
        routes: {
          "/": () => render("home"),
          "/users/:id": userHandler
        },
        mode: "memory"
      });

      const pathnameBefore = window.location.pathname;
      const historyLengthBefore = window.history.length;

      navigate("/users/:id", { params: { id: "7" }, query: { tab: "overview" } });

      expect(route().path).toBe("/users/7?tab=overview");
      expect(route().params["id"]).toBe("7");
      expect(route().query["tab"]).toBe("overview");
      expect(route().handler).toBe(userHandler);
      expect(container.textContent).toBe("user-7");
      expect(window.location.pathname).toBe(pathnameBefore);
      expect(window.history.length).toBe(historyLengthBefore);
    });

    test("attaches no window or document listeners", () => {
      const originalWindow = window.addEventListener;
      const originalDocument = document.addEventListener;
      const windowSpy = mock(() => { });
      const documentSpy = mock(() => { });
      window.addEventListener = windowSpy as unknown as typeof window.addEventListener;
      document.addEventListener = documentSpy as unknown as typeof document.addEventListener;

      try {
        router({
          routes: {
            "/": () => render("home"),
            "/about": () => render("about")
          },
          mode: "memory"
        });

        navigate("/about");
        expect(windowSpy).not.toHaveBeenCalled();
        expect(documentSpy).not.toHaveBeenCalled();
      } finally {
        window.addEventListener = originalWindow;
        document.addEventListener = originalDocument;
      }
    });

    test("blocks navigation when a before guard returns false", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/admin": {
            before: () => false,
            handler: () => render("admin")
          }
        },
        mode: "memory"
      });

      navigate("/admin");

      expect(route().path).toBe("/");
      expect(container.textContent).toBe("home");
    });

    test("follows string and array redirect rules", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/new": () => render("new-home"),
          "/old": "/new"
        },
        redirects: [{ from: ["/legacy"], to: "/new" }],
        mode: "memory"
      });

      navigate("/old");
      expect(route().path).toBe("/new");
      expect(container.textContent).toBe("new-home");

      navigate("/legacy");
      expect(route().path).toBe("/new");
      expect(container.textContent).toBe("new-home");
    });

    test("resolves notFound for unmatched paths", () => {
      const notFoundHandler = mock(() => render("not-found"));
      router({
        routes: {
          "/": () => render("home")
        },
        mode: "memory",
        notFound: notFoundHandler
      });

      navigate("/nowhere");

      expect(route().path).toBe("/nowhere");
      expect(container.textContent).toBe("not-found");
      expect(notFoundHandler).toHaveBeenCalledTimes(1);
    });

    test("tracks active() and crumbs from the logical path", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/admin": {
            handler: () => render("admin"),
            children: {
              "/users/:id": ({ id }) => render(`user-${id}`)
            }
          }
        },
        mode: "memory"
      });

      expect(route().active("/admin")).toBe(false);

      navigate("/admin/users/7");

      expect(route().active("/admin")).toBe(true);
      expect(route().active("/admin/users")).toBe(true);
      expect(route().crumbs.map((crumb) => crumb.path)).toEqual(["/admin", "/admin/users/7"]);
    });
  });
});
