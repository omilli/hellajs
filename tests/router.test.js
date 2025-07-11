import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { router, navigate, route } from "../packages/router/dist/hella-router.esm";
import { tick } from "./tick.js";

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

  test("matches static routes", () => {
    router({
      "/": () => { container.textContent = "Home"; },
      "/about": () => { container.textContent = "About"; }
    });
    navigate("/");
    expect(container.textContent).toBe("Home");
    navigate("/about");
    expect(container.textContent).toBe("About");
  });

  test("matches dynamic params", () => {
    router({
      "/user/:id": ({ id }) => { container.textContent = `User ${id}`; }
    });
    navigate("/user/42");
    expect(container.textContent).toBe("User 42");
    expect(route().params.id).toBe("42");
  });

  test("matches wildcard routes", () => {
    router({
      "/files/*": () => { container.textContent = route().path; }
    });
    navigate("/files/a/b/c");
    expect(container.textContent).toBe("/files/a/b/c");
  });

  test("handles query params", () => {
    router({
      "/search": (_, query) => { container.textContent = `Query: ${query?.q}`; }
    });
    navigate("/search", {}, { q: "test" });
    expect(container.textContent).toBe("Query: test");
    expect(route().query.q).toBe("test");
  });

  test("redirects via route map", () => {
    router({
      "/old": "/new",
      "/new": () => { container.textContent = "New"; }
    });
    navigate("/old");
    expect(route().path).toBe("/new");
  });

  test("redirects via global hooks", () => {
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

  test("calls global before/after hooks", () => {
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

  test("calls route before/after hooks", async () => {
    const calls = [];
    router({
      "/": {
        before: () => calls.push("before"),
        handler: () => calls.push("handler"),
        after: () => calls.push("after")
      }
    });

    await tick();

    expect(calls).toEqual(["before", "handler", "after"]);
  });

  test("calls route hooks with params", () => {
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

  test("handles not found (404)", () => {
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

  test("navigate replaces state when requested", () => {
    router({
      "/": () => { container.textContent = "Home"; },
      "/replace": () => { container.textContent = "Replace"; }
    });
    navigate("/replace", {}, {}, { replace: true });
    expect(container.textContent).toBe("Replace");
  });

  test("removes unmatched params from path", () => {
    router({
      "/foo/:id": ({ id }) => { container.textContent = id; }
    });
    navigate("/foo/:id", {}, {});
    expect(container.textContent).toBe("");
  });
});

describe("router hash", () => {
  let container;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.history.replaceState({}, "", "/");
    window.location.hash = "";
  });
  afterEach(() => {
    document.body.removeChild(container);
    window.location.hash = "";
  });

  test("matches static routes", () => {
    router({
      "/": () => { container.textContent = "Home"; },
      "/about": () => { container.textContent = "About"; }
    }, { hash: true });
    navigate("/");
    expect(container.textContent).toBe("Home");
    navigate("/about");
    expect(container.textContent).toBe("About");
  });

  test("matches dynamic params", () => {
    router({
      "/user/:id": ({ id }) => { container.textContent = `User ${id}`; }
    }, { hash: true });
    navigate("/user/42");
    expect(container.textContent).toBe("User 42");
    expect(route().params.id).toBe("42");
  });

  test("handles query params", () => {
    router({
      "/search": (_, query) => { container.textContent = `Query: ${query?.q}`; }
    }, { hash: true });
    navigate("/search", {}, { q: "test" });
    expect(container.textContent).toBe("Query: test");
    expect(route().query.q).toBe("test");
  });

  test("not found (404)", () => {
    let notFoundCalled = false;
    router({
      "/": () => { container.textContent = "Home"; }
    }, {
      hash: true,
      "404": () => { notFoundCalled = true; container.textContent = "Not Found"; }
    });
    navigate("/missing");
    expect(notFoundCalled).toBe(true);
    expect(container.textContent).toBe("Not Found");
  });
});

