import { describe, test, expect, beforeEach } from "bun:test";
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

  describe("URL encoding", () => {
    test.each([
      ["hello world", "hello%20world", "hello world"],
      ["a&b=c", "a%26b%3Dc", "a&b=c"],
    ])("URL-encodes parameter %p", (input, encodedPath, decoded) => {
      router({
        routes: {
          "/search/:term": ({ term }) => render(`term-${term}`)
        }
      });

      navigate("/search/:term", { params: { term: input } });
      expect(container.textContent).toBe(`term-${decoded}`);
      expect(route().params["term"]).toBe(decoded);
      expect(route().path).toBe(`/search/${encodedPath}`);
    });

    test("decodes wildcard parameters in matched paths", () => {
      router({
        routes: {
          "/files/*": ({ "*": path }) => render(`files-${path}`)
        }
      });

      navigate("/files/docs/hello%20world.md");
      expect(container.textContent).toBe("files-docs/hello world.md");
      expect(route().params["*"]).toBe("docs/hello world.md");
    });

    test("inserts wildcard values containing $& literally", () => {
      router({
        routes: {
          "/files/*": () => {}
        }
      });

      navigate("/files/*", { params: { "*": "docs/$&/readme.md" } });
      expect(route().path).toBe("/files/docs/$&/readme.md");
      expect(route().params["*"]).toBe("docs/$&/readme.md");
    });

    test("inserts wildcard values containing $$ and $` literally", () => {
      router({
        routes: {
          "/files/*": () => {}
        }
      });

      navigate("/files/*", { params: { "*": "a$$b/$`c" } });
      expect(route().path).toBe("/files/a$$b/$`c");
    });

    test("resolves a malformed query value to its raw form", () => {
      router({
        routes: {
          "/search": () => render("search")
        },
        url: "/search?q=100%"
      });

      expect(container.textContent).toBe("search");
      expect(route().query["q"]).toBe("100%");
    });

    test("resolves a malformed query key to its raw form", () => {
      router({
        routes: {
          "/": () => render("home")
        },
        url: "/?%zz=1"
      });

      expect(route().query["%zz"]).toBe("1");
    });

    test("resolves a malformed dynamic segment to its raw form", () => {
      router({
        routes: {
          "/users/:id": ({ id }) => render(`user-${id}`)
        }
      });

      navigate("/users/%zz");
      expect(container.textContent).toBe("user-%zz");
      expect(route().params["id"]).toBe("%zz");
    });

    test("resolves a malformed wildcard capture to its raw form", () => {
      router({
        routes: {
          "/files/*": () => render("files")
        }
      });

      navigate("/files/do%cs/readme.md");
      expect(container.textContent).toBe("files");
      expect(route().params["*"]).toBe("do%cs/readme.md");
    });
  });
});
