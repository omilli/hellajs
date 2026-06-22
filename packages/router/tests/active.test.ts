import { describe, test, expect, beforeEach } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  let render: (content: string) => void;

  beforeEach(() => {
    const { render: r } = setupRouterEnv();
    render = r;
  });

  describe("active", () => {
    test("returns true for ancestor pattern at nested path", () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/users": () => render("users")
            }
          }
        }
      });

      navigate("/admin/users");
      expect(route().active("/admin")).toBe(true);
    });

    test("returns true for deeper ancestor pattern", () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/users": {
                children: {
                  "/:id": () => render("user")
                }
              }
            }
          }
        }
      });

      navigate("/admin/users/123");
      expect(route().active("/admin/users")).toBe(true);
    });

    test("returns false for segment boundary mismatch", () => {
      router({
        routes: {
          "/administrators": () => render("admins"),
          "/admin": () => render("admin")
        }
      });

      navigate("/administrators");
      expect(route().active("/admin")).toBe(false);
    });

    test("returns true for exact match", () => {
      router({
        routes: {
          "/about": () => render("about")
        }
      });

      navigate("/about");
      expect(route().active("/about")).toBe(true);
    });

    test("returns false for non-matching pattern", () => {
      router({
        routes: {
          "/about": () => render("about")
        }
      });

      navigate("/about");
      expect(route().active("/contact")).toBe(false);
    });

    test("returns true for wildcard pattern match", () => {
      router({
        routes: {
          "/files/*": () => render("files")
        }
      });

      navigate("/files/docs/readme.md");
      expect(route().active("/files/*")).toBe(true);
    });

    test("strips query string before matching", () => {
      router({
        routes: {
          "/search": () => render("search")
        }
      });

      navigate("/search", { query: { q: "hello" } });
      expect(route().active("/search")).toBe(true);
    });
  });
});
