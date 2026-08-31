import { describe, test, expect, beforeEach } from "bun:test";
import { router, navigate, route, href } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;

  beforeEach(() => {
    const env = setupRouterEnv();
    container = env.container;
    render = env.render;
  });

  describe("optional params", () => {
    test("matches /users/:id? with the segment present or skipped", () => {
      router({
        routes: {
          "/users/:id?": () => render("users")
        },
        notFound: () => render("missing")
      });

      navigate("/users");
      expect(container.textContent).toBe("users");
      expect(route().params).toEqual({});
      expect(route().path).toBe("/users");

      navigate("/users/7");
      expect(container.textContent).toBe("users");
      expect(route().params).toEqual({ id: "7" });
      expect(route().path).toBe("/users/7");
    });

    test("matches a mid-pattern optional at /posts/:id?/edit", () => {
      router({
        routes: {
          "/posts/:id?/edit": () => render("editor")
        },
        notFound: () => render("missing")
      });

      navigate("/posts/edit");
      expect(container.textContent).toBe("editor");
      expect(route().params).toEqual({});

      navigate("/posts/9/edit");
      expect(route().params).toEqual({ id: "9" });

      navigate("/posts/9");
      expect(container.textContent).toBe("missing");
      expect(route().params).toEqual({});
    });

    test("matches an optional param before a wildcard", () => {
      router({
        routes: {
          "/files/:id?/*": () => render("files")
        },
        notFound: () => render("missing")
      });

      navigate("/files/a/b/c");
      expect(route().params).toEqual({ id: "a", "*": "b/c" });

      navigate("/files");
      expect(route().params).toEqual({ "*": "" });
    });

    test("matches nested chains with optional params at parent and child levels", () => {
      router({
        routes: {
          "/users/:id?": {
            handler: () => render("users"),
            children: {
              "/detail/:section?": () => render("detail")
            }
          }
        },
        notFound: () => render("missing")
      });

      navigate("/users");
      expect(route().params).toEqual({});

      navigate("/users/7");
      expect(route().params).toEqual({ id: "7" });

      navigate("/users/7/detail");
      expect(route().params).toEqual({ id: "7" });

      navigate("/users/7/detail/intro");
      expect(route().params).toEqual({ id: "7", section: "intro" });
    });

    test("strips absent optional tokens with their preceding slash in navigate and href", () => {
      router({
        routes: {
          "/users/:id?": () => render("users")
        }
      });

      navigate("/users/:id?");
      expect(route().path).toBe("/users");

      expect(href("/users/:id?")).toBe("/users");
      expect(href("/posts/:id?/edit")).toBe("/posts/edit");
      expect(href("/:id?")).toBe("/");
      expect(href("/users/:id?", { params: { id: "7" } })).toBe("/users/7");
    });

    test("keeps required :id from matching without its segment", () => {
      router({
        routes: {
          "/users": () => render("list"),
          "/users/:id": () => render("profile")
        },
        notFound: () => render("missing")
      });

      navigate("/users");
      expect(container.textContent).toBe("list");
      expect(route().params).toEqual({});

      navigate("/users/7");
      expect(route().params).toEqual({ id: "7" });
    });

    test("no longer splits a pattern at ? — /a?b does not match /a", () => {
      router({
        routes: {
          "/a?b": () => render("ab")
        },
        notFound: () => render("missing")
      });

      navigate("/a");
      expect(route().path).toBe("/a");
      expect(container.textContent).toBe("missing");
    });

    test("lights active() links for an optional-param pattern", () => {
      router({
        routes: {
          "/users/:id?": () => render("users")
        },
        notFound: () => render("missing")
      });

      navigate("/users");
      expect(route().active("/users/:id?")).toBe(true);

      navigate("/users/7");
      expect(route().active("/users/:id?")).toBe(true);

      navigate("/other");
      expect(route().active("/users/:id?")).toBe(false);
    });
  });
});
