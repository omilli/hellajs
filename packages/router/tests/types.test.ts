import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { router, navigate, route } from "@hellajs/router/bundle";

describe("typed navigate", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const render = (content: string) => { container.textContent = content; };

  test("navigate infers params from path pattern", () => {
    router({
      routes: {
        "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
      }
    });

    // TypeScript should infer { id: string } from '/users/:id'
    navigate("/users/:id", { id: "123" });
    expect(route().params.id).toBe("123");
  });

  test("navigate handles multiple params", () => {
    router({
      routes: {
        "/org/:orgId/projects/:projectId": ({ orgId, projectId }: { orgId: string; projectId: string }) =>
          render(`${orgId}-${projectId}`)
      }
    });

    navigate("/org/:orgId/projects/:projectId", { orgId: "acme", projectId: "web" });
    expect(route().params.orgId).toBe("acme");
    expect(route().params.projectId).toBe("web");
  });

  test("navigate works with no params", () => {
    router({
      routes: {
        "/about": () => render("about")
      }
    });

    // Static routes should allow empty params
    navigate("/about", {});
    expect(route().path).toBe("/about");
  });

  test("navigate handles wildcard params", () => {
    router({
      routes: {
        "/files/*": () => render("files")
      }
    });

    // Wildcard param named "*"
    navigate("/files/*", { "*": "docs/readme.md" });
    expect(route().params["*"]).toBe("docs/readme.md");
  });

  test("navigate handles query params with typed path", () => {
    router({
      routes: {
        "/search/:category": ({ category }: { category: string }, query: { q: string }) =>
          render(`${category}-${query.q}`)
      }
    });

    navigate("/search/:category", { category: "products" }, { q: "shoes" });
    expect(container.textContent).toBe("products-shoes");
    expect(route().query.q).toBe("shoes");
  });

  test("navigate with options and typed params", () => {
    router({
      routes: {
        "/users/:id": ({ id }: { id: string }) => render(`user-${id}`)
      }
    });

    navigate("/users/:id", { id: "456" }, {}, { replace: true });
    expect(route().params.id).toBe("456");
  });
});

describe("typed route config", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const render = (content: string) => { container.textContent = content; };

  test("router infers types from route handlers", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/users/:id": ({ id }: { id: string }) => render(`user-${id}`),
        "/posts/:slug/comments/:cid": ({ slug, cid }: { slug: string; cid: string }) =>
          render(`${slug}-${cid}`)
      }
    });

    navigate("/users/:id", { id: "1" });
    expect(container.textContent).toBe("user-1");

    navigate("/posts/:slug/comments/:cid", { slug: "hello", cid: "5" });
    expect(container.textContent).toBe("hello-5");
  });

  test("router handles RouteWithHooks with typed params", () => {
    router({
      routes: {
        "/admin/:section": {
          before: ({ section }: { section: string }) => render(`before-${section}`),
          handler: ({ section }: { section: string }) => render(`admin-${section}`),
          after: ({ section }: { section: string }) => { }
        }
      }
    });

    navigate("/admin/:section", { section: "dashboard" });
    expect(container.textContent).toBe("admin-dashboard");
  });

  test("router handles nested routes with combined params", () => {
    router({
      routes: {
        "/org/:orgId": {
          children: {
            "/projects/:projectId": ({ orgId, projectId }: { orgId: string; projectId: string }) =>
              render(`${orgId}-${projectId}`)
          }
        }
      }
    });

    navigate("/org/:orgId/projects/:projectId", { orgId: "acme", projectId: "site" });
    expect(container.textContent).toBe("acme-site");
  });
});
