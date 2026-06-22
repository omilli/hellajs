import { describe, test, expect, beforeEach } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  describe("meta", () => {
    let render: (content: string) => void;

    beforeEach(() => {
      const { render: r } = setupRouterEnv();
      render = r;
    });

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
      let capturedMeta: Record<string, unknown> | null = null;

      router({
        routes: {
          "/about": {
            meta: { title: "About" },
            before: () => {
              capturedMeta = route().meta ?? null;
            },
            handler: () => render("about")
          }
        }
      });

      navigate("/about");
      expect(capturedMeta!).toEqual({ title: "About" });
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
      expect((route().meta)?.title).toBe("Home");

      navigate("/users/123");
      expect((route().meta)?.title).toBe("User Profile");
    });
  });
});
