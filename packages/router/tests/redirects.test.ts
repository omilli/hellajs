import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush } from "@hellajs/core";
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

  describe("redirects", () => {
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
      const notFound = mock(() => render("404"));
      router({
        routes: {
          "/": () => render("home")
        },
        notFound
      });

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

      navigate("/admin/nonexistent");
      expect(notFound).toHaveBeenCalledTimes(1);
      expect(container.textContent).toBe("404");
    });
  });
});
