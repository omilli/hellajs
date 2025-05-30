import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { flushEffects } from "../packages/core/dist/hella-core.esm";
import { router, navigate, route } from "../packages/router/dist/hella-router.esm";

describe("router", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("matches static routes", () => {
    router({
      "/": () => { container.textContent = "Home"; },
      "/about": () => { container.textContent = "About"; }
    });
    navigate("/");
    expect(container.textContent).toBe("Home");
    navigate("/about");
    expect(container.textContent).toBe("About");
  });

  it("matches dynamic params", () => {
    router({
      "/user/:id": ({ id }) => { container.textContent = `User ${id}`; }
    });
    navigate("/user/42");
    expect(container.textContent).toBe("User 42");
    expect(route().params.id).toBe("42");
  });

  it("matches wildcard routes", () => {
    router({
      "/files/*": () => { container.textContent = route().path; }
    });
    navigate("/files/a/b/c");
    expect(container.textContent).toBe("/files/a/b/c");
  });

  it("handles query params", () => {
    router({
      "/search": (_, query) => { container.textContent = `Query: ${query?.q}`; }
    });
    navigate("/search", {}, { q: "test" });
    expect(container.textContent).toBe("Query: test");
    expect(route().query.q).toBe("test");
  });

  it("redirects via route map", () => {
    router({
      "/old": "/new",
      "/new": () => { container.textContent = "New"; }
    });
    navigate("/old");
    expect(container.textContent).toBe("New");
    expect(route().path).toBe("/new");
  });

  it("redirects via global hooks", () => {
    router(
      {
        "/foo": () => { container.textContent = "Foo"; },
        "/bar": () => { container.textContent = "Bar"; }
      },
      {
        redirects: [{ from: ["/foo"], to: "/bar" }]
      }
    );
    navigate("/foo");
    expect(container.textContent).toBe("Bar");
    expect(route().path).toBe("/bar");
  });

  it("calls global before/after hooks", () => {
    const calls = [];
    router(
      {
        "/": () => { calls.push("handler"); }
      },
      {
        before: () => calls.push("before"),
        after: () => calls.push("after")
      }
    );
    navigate("/");
    expect(calls).toEqual(["before", "handler", "after"]);
  });

  it("calls route before/after hooks", async () => {
    const calls = [];
    router({
      "/": {
        before: () => calls.push("before"),
        handler: () => calls.push("handler"),
        after: () => calls.push("after")
      }
    });

    await flushEffects();

    expect(calls).toEqual(["before", "handler", "after"]);
  });

  it("calls route hooks with params", () => {
    let beforeParam = "";
    let afterParam = "";
    router({
      "/user/:id": {
        before: ({ id }) => { beforeParam = id; },
        handler: ({ id }) => { container.textContent = id; },
        after: ({ id }) => { afterParam = id; }
      }
    });
    navigate("/user/99");
    expect(beforeParam).toBe("99");
    expect(afterParam).toBe("99");
    expect(container.textContent).toBe("99");
  });

  it("handles not found (404)", () => {
    let notFoundCalled = false;
    router(
      {
        "/": () => { container.textContent = "Home"; }
      },
      {
        "404": () => { notFoundCalled = true; container.textContent = "Not Found"; }
      }
    );
    navigate("/missing");
    expect(notFoundCalled).toBe(true);
    expect(container.textContent).toBe("Not Found");
  });

  it("navigate replaces state when requested", () => {
    router({
      "/": () => { container.textContent = "Home"; },
      "/replace": () => { container.textContent = "Replace"; }
    });
    navigate("/replace", {}, {}, { replace: true });
    expect(container.textContent).toBe("Replace");
  });

  it("removes unmatched params from path", () => {
    router({
      "/foo/:id": ({ id }) => { container.textContent = id; }
    });
    navigate("/foo/:id", {}, {});
    expect(container.textContent).toBe("");
  });
});
