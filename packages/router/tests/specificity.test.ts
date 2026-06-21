import { describe, test, expect, beforeEach } from "bun:test";
import { router, navigate } from "@hellajs/router/bundle";
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

  describe("route specificity", () => {
    test("prioritizes specific over generic routes", () => {
      router({
        routes: {
          "/users/admin": () => render("admin-user"),
          "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
        }
      });

      navigate("/users/admin");
      expect(container.textContent).toBe("admin-user");

      navigate("/users/123");
      expect(container.textContent).toBe("user-123");
    });

    test("prioritizes nested routes by specificity", () => {
      router({
        routes: {
          "/api": {
            children: {
              "/*": () => render("wildcard"),
              "/v1": {
                children: {
                  "/users": () => render("users")
                }
              }
            }
          }
        }
      });

      navigate("/api/v1/users");
      expect(container.textContent).toBe("users");
    });

    test("sorts nested routes by wildcard and specificity", () => {
      router({
        routes: {
          "/docs": {
            children: {
              "/*": () => render("docs-wildcard"),
              "/api": {
                children: {
                  "/reference": () => render("api-reference")
                }
              },
              "/guides": {
                children: {
                  "/getting-started": () => render("getting-started"),
                  "/*": () => render("guides-wildcard")
                }
              }
            }
          }
        }
      });

      navigate("/docs/api/reference");
      expect(container.textContent).toBe("api-reference");

      navigate("/docs/guides/getting-started");
      expect(container.textContent).toBe("getting-started");

      navigate("/docs/guides/advanced");
      expect(container.textContent).toBe("guides-wildcard");

      navigate("/docs/other");
      expect(container.textContent).toBe("docs-wildcard");
    });

    test("prioritizes non-wildcard over wildcard routes", () => {
      router({
        routes: {
          "/*": {
            children: {
              "/admin": () => render("wildcard-admin")
            }
          },
          "/content": {
            children: {
              "/admin": () => render("content-admin")
            }
          }
        }
      });

      navigate("/content/admin");
      expect(container.textContent).toBe("content-admin");
    });

    test("sorts routes by path specificity depth", () => {
      router({
        routes: {
          "/a": {
            children: {
              "/b": () => render("short-path")
            }
          },
          "/a/b/c": {
            children: {
              "/d": () => render("long-path")
            }
          }
        }
      });

      navigate("/a/b/c/d");
      expect(container.textContent).toBe("long-path");
    });
  });
});
