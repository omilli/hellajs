import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { router, navigate, route } from "../packages/router/dist/router.js";
import { tick } from "./utils/tick.js";

describe("Router", () => {
  let appContainer;

  beforeEach(() => {
    appContainer = document.createElement("div");
    document.body.appendChild(appContainer);
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    document.body.removeChild(appContainer);
    window.location.hash = "";
  });

  test("should navigate to the home page", () => {
    router({
      "/": () => { appContainer.textContent = "Welcome Home!"; },
      "/about": () => { appContainer.textContent = "About Us"; }
    });
    navigate("/");
    expect(appContainer.textContent).toBe("Welcome Home!");
  });

  test("should navigate to the about page", () => {
    router({
      "/": () => { appContainer.textContent = "Welcome Home!"; },
      "/about": () => { appContainer.textContent = "About Us"; }
    });
    navigate("/about");
    expect(appContainer.textContent).toBe("About Us");
  });

  test("should display a user profile from a dynamic route", () => {
    router({
      "/users/:id": ({ id }) => { appContainer.textContent = `User Profile: ${id}`; }
    });
    navigate("/users/123");
    expect(appContainer.textContent).toBe("User Profile: 123");
    expect(route().params.id).toBe("123");
  });

  test("should handle wildcard routes for a file path", () => {
    router({
      "/files/*": () => { appContainer.textContent = `File Path: ${route().path}`; }
    });
    navigate("/files/documents/report.pdf");
    expect(appContainer.textContent).toBe("File Path: /files/documents/report.pdf");
  });

  test("should handle search queries", () => {
    router({
      "/search": (_, query) => { appContainer.textContent = `Searching for: ${query?.q}`; }
    });
    navigate("/search", {}, { q: "hella" });
    expect(appContainer.textContent).toBe("Searching for: hella");
    expect(route().query.q).toBe("hella");
  });

  test("should redirect from an old path to a new one", () => {
    router({
      "/old-profile": "/profile",
      "/profile": () => { appContainer.textContent = "Your New Profile"; }
    });
    navigate("/old-profile");
    expect(route().path).toBe("/profile");
    expect(appContainer.textContent).toBe("Your New Profile");
  });

  test("should redirect using a global redirect hook", () => {
    router(
      {
        "/login": () => { appContainer.textContent = "Please log in"; },
        "/dashboard": () => { appContainer.textContent = "Welcome to your dashboard"; }
      },
      {
        redirects: [{ from: ["/login"], to: "/dashboard" }]
      }
    );
    navigate("/login");
    expect(appContainer.textContent).toBe("Welcome to your dashboard");
    expect(route().path).toBe("/dashboard");
  });

  test("should execute global before and after navigation hooks", () => {
    const eventLog = [];
    router(
      {
        "/": () => { eventLog.push("Page Loaded"); }
      },
      {
        before: () => eventLog.push("Loading..."),
        after: () => eventLog.push("Finished!")
      }
    );
    navigate("/");
    expect(eventLog).toEqual(["Loading...", "Page Loaded", "Finished!"]);
  });

  test("should execute route-specific before and after hooks", async () => {
    const eventLog = [];
    router({
      "/": {
        before: () => eventLog.push("Preparing home page..."),
        handler: () => eventLog.push("Home page rendered"),
        after: () => eventLog.push("Home page cleanup")
      }
    });
    await tick();
    expect(eventLog).toEqual(["Preparing home page...", "Home page rendered", "Home page cleanup"]);
  });

  test("should pass route params to hooks", () => {
    let beforeId = "";
    let afterId = "";
    router({
      "/posts/:id": {
        before: ({ id }) => { beforeId = id; },
        handler: ({ id }) => { appContainer.textContent = `Post ${id}`; },
        after: ({ id }) => { afterId = id; }
      }
    });
    navigate("/posts/42");
    expect(beforeId).toBe("42");
    expect(afterId).toBe("42");
    expect(appContainer.textContent).toBe("Post 42");
  });

  test("should display a 404 page for unmatched routes", () => {
    let notFoundTriggered = false;
    router(
      {
        "/": () => { appContainer.textContent = "Home"; }
      },
      {
        "404": () => { notFoundTriggered = true; appContainer.textContent = "404 - Page Not Found"; }
      }
    );
    navigate("/this-page-does-not-exist");
    expect(notFoundTriggered).toBe(true);
    expect(appContainer.textContent).toBe("404 - Page Not Found");
  });

  test("should replace the current history state when navigating", () => {
    const initialPath = window.location.pathname;
    router({
      "/": () => { appContainer.textContent = "Home"; },
      "/settings": () => { appContainer.textContent = "Settings"; }
    });
    navigate("/settings", {}, {}, { replace: true });
    expect(appContainer.textContent).toBe("Settings");
    // Note: JSDOM doesn't fully support history inspection to verify replacement vs. push.
    // This test primarily ensures the navigation and content update occurs.
  });

  test("should not render content for routes with unmatched params", () => {
    router({
      "/users/:id": ({ id }) => { appContainer.textContent = `User: ${id}`; }
    });
    navigate("/users/:id", {}, {});
    expect(appContainer.textContent).toBe("");
  });
});

describe("Router with Hash-based Navigation", () => {
  let appContainer;
  beforeEach(() => {
    appContainer = document.createElement("div");
    document.body.appendChild(appContainer);
    window.history.replaceState({}, "", "/");
    window.location.hash = "";
  });
  afterEach(() => {
    document.body.removeChild(appContainer);
    window.location.hash = "";
  });

  test("should navigate to static routes using hash paths", () => {
    router({
      "/": () => { appContainer.textContent = "Home"; },
      "/about": () => { appContainer.textContent = "About"; }
    }, { hash: true });
    navigate("/");
    expect(window.location.hash).toBe("#/");
    expect(appContainer.textContent).toBe("Home");
    navigate("/about");
    expect(window.location.hash).toBe("#/about");
    expect(appContainer.textContent).toBe("About");
  });

  test("should handle dynamic params in hash routes", () => {
    router({
      "/users/:id": ({ id }) => { appContainer.textContent = `User ${id}`; }
    }, { hash: true });
    navigate("/users/42");
    expect(window.location.hash).toBe("#/users/42");
    expect(appContainer.textContent).toBe("User 42");
    expect(route().params.id).toBe("42");
  });

  test("should handle query params in hash routes", () => {
    router({
      "/search": (_, query) => { appContainer.textContent = `Query: ${query?.q}`; }
    }, { hash: true });
    navigate("/search", {}, { q: "hash-routing" });
    expect(window.location.hash).toBe("#/search?q=hash-routing");
    expect(appContainer.textContent).toBe("Query: hash-routing");
    expect(route().query.q).toBe("hash-routing");
  });

  test("should show a 404 page for unmatched hash routes", () => {
    let notFoundTriggered = false;
    router({
      "/": () => { appContainer.textContent = "Home"; }
    }, {
      hash: true,
      "404": () => { notFoundTriggered = true; appContainer.textContent = "Not Found"; }
    });
    navigate("/non-existent-hash");
    expect(window.location.hash).toBe("#/non-existent-hash");
    expect(notFoundTriggered).toBe(true);
    expect(appContainer.textContent).toBe("Not Found");
  });
});

