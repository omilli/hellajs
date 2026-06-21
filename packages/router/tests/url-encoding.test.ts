import { describe, test, expect, beforeEach } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";
import { renderInto } from "./helpers";

describe("router", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;

  beforeEach(() => {
    resetTestState();
    container = setupContainer();
    render = renderInto(container);
    window.history.replaceState({}, "", "/");
  });

  describe("URL encoding", () => {
    test.each([
      ["hello world", "hello%20world", "hello world"],
      ["a&b=c", "a%26b%3Dc", "a&b=c"],
    ])("URL-encodes parameter %p", (input, encodedPath, decoded) => {
      router({
        routes: {
          "/search/:term": ({ term }: { term: string }) => render(`term-${term}`)
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
          "/files/*": ({ "*": path }: { "*": string }) => render(`files-${path}`)
        }
      });

      navigate("/files/docs/hello%20world.md");
      expect(container.textContent).toBe("files-docs/hello world.md");
      expect(route().params["*"]).toBe("docs/hello world.md");
    });
  });
});
