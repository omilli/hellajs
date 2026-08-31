import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush } from "@hellajs/core";
import { suppressConsole } from "@utils/test-helpers.js";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv, expectLoggedError } from "./helpers";

describe("router", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;

  beforeEach(() => {
    const env = setupRouterEnv();
    container = env.container;
    render = env.render;
  });

  describe("redirects", () => {
    test("cancels a cyclic redirect chain instead of overflowing the stack", () => {
      const sup = suppressConsole();
      try {
        router({
          routes: {
            "/a": () => render("a"),
            "/b": () => render("b")
          },
          redirects: [{ from: ["/a"], to: "/b" }, { from: ["/b"], to: "/a" }]
        });

        navigate("/safe");
        const pathBefore = route().path;
        navigate("/a");

        expect(route().path).toBe(pathBefore);
        expectLoggedError(sup, "[router] redirect loop detected:", "exceeded 20 hops resolving /a");
      } finally {
        sup.restore();
      }
    });

    test("cancels a self-redirect instead of overflowing the stack", () => {
      const sup = suppressConsole();
      try {
        router({
          routes: {
            "/a": () => render("a")
          },
          redirects: [{ from: ["/a"], to: "/a" }]
        });

        navigate("/safe");
        const pathBefore = route().path;
        navigate("/a");

        expect(route().path).toBe(pathBefore);
        expectLoggedError(sup, "[router] redirect loop detected:", "exceeded 20 hops resolving /a");
      } finally {
        sup.restore();
      }
    });

    test("resolves a multi-hop redirect chain under the cap", () => {
      router({
        routes: {
          "/final": () => render("final")
        },
        redirects: [
          { from: ["/old"], to: "/legacy" },
          { from: ["/legacy"], to: "/v1" },
          { from: ["/v1"], to: "/final" }
        ]
      });

      navigate("/old");
      flush();
      expect(route().path).toBe("/final");
      expect(container.textContent).toBe("final");
    });

    test("router() init survives cyclic redirects", () => {
      const sup = suppressConsole();
      try {
        const info = router({
          routes: {
            "/a": () => {},
            "/b": () => {}
          },
          redirects: [{ from: ["/a"], to: "/b" }, { from: ["/b"], to: "/a" }],
          url: "/a"
        });

        expect(info.path).toBe("/a");
      } finally {
        sup.restore();
      }
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

    test("captures params from a pattern source and substitutes them into the target", () => {
      router({
        routes: {
          "/users/:id": () => render("user")
        },
        redirects: [{ from: ["/user/:id"], to: "/users/:id" }]
      });

      navigate("/user/7");
      flush();
      expect(route().path).toBe("/users/7");
      expect(route().params.id).toBe("7");
      expect(container.textContent).toBe("user");
    });

    test("captures a wildcard source into the target wildcard", () => {
      router({
        routes: {
          "/archive/*": () => render("archive")
        },
        redirects: [{ from: ["/docs/*"], to: "/archive/*" }]
      });

      navigate("/docs/guide/setup");
      flush();
      expect(route().path).toBe("/archive/guide/setup");
      expect(route().params["*"]).toBe("guide/setup");
    });

    test("resolves the first matching redirect in array order", () => {
      router({
        routes: {
          "/v1": () => render("v1"),
          "/v2": () => render("v2")
        },
        redirects: [
          { from: ["/legacy"], to: "/v1" },
          { from: ["/legacy"], to: "/v2" }
        ]
      });

      navigate("/legacy");
      flush();
      expect(route().path).toBe("/v1");
      expect(container.textContent).toBe("v1");
    });

    test("strips target tokens with no captured value", () => {
      router({
        routes: {
          "/new": () => render("new")
        },
        redirects: [{ from: ["/old"], to: "/new/:id" }]
      });

      navigate("/old");
      flush();
      expect(route().path).toBe("/new/");
      expect(container.textContent).toBe("new");
    });

    test("handles not found routes", () => {
      const notFound = mock(() => render("404"));
      router({
        routes: {
          "/": () => render("home")
        },
        notFound
      });

      // Synchronous init may fire notFound for the unmatched initial path; isolate the navigate.
      notFound.mockClear();
      navigate("/missing");
      expect(notFound).toHaveBeenCalledTimes(1);
      expect(container.textContent).toBe("404");
    });

    test("handles not found routes with string redirect", () => {
      router({
        routes: {
          "/": () => render("home"),
          "/404": () => render("not-found-page")
        },
        notFound: "/404"
      });

      navigate("/missing");
      expect(route().path).toBe("/404");
      expect(container.textContent).toBe("not-found-page");
    });

    test("hooks-only parent with no matching child falls through to notFound", () => {
      const notFound = mock(() => render("404"));

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
        notFound
      });

      // Synchronous init may fire notFound for the unmatched initial path; isolate the navigate.
      notFound.mockClear();
      navigate("/admin/nonexistent");
      expect(notFound).toHaveBeenCalledTimes(1);
      expect(container.textContent).toBe("404");
    });
  });
});
