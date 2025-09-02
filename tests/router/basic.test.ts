import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { router, navigate, route } from "../../packages/router";
import { tick } from "../utils/tick.js";

describe("router", () => {
  describe("default", () => {
    let appContainer: HTMLDivElement;

    beforeEach(() => {
      appContainer = document.createElement("div");
      document.body.appendChild(appContainer);
      window.history.replaceState({}, "", "/");
    });

    afterEach(() => {
      document.body.removeChild(appContainer);
      window.location.hash = "";
    });

    test("navigate to the home page", () => {
      router({
        routes: {
          "/": () => { appContainer.textContent = "Welcome Home!"; },
          "/about": () => { appContainer.textContent = "About Us"; }
        }
      });
      navigate("/");
      expect(appContainer.textContent).toBe("Welcome Home!");
    });

    test("navigate to the about page", () => {
      router({
        routes: {
          "/": () => { appContainer.textContent = "Welcome Home!"; },
          "/about": () => { appContainer.textContent = "About Us"; }
        }
      });
      navigate("/about");
      expect(appContainer.textContent).toBe("About Us");
    });

    test("display a user profile from a dynamic route", () => {
      router({
        routes: {
          "/users/:id": ({ id }: { id: string }) => { appContainer.textContent = `User Profile: ${id}`; }
        }
      });
      navigate("/users/123");
      expect(appContainer.textContent).toBe("User Profile: 123");
      expect(route().params.id).toBe("123");
    });

    test("handle wildcard routes for a file path", () => {
      router({
        routes: {
          "/files/*": () => { appContainer.textContent = `File Path: ${route().path}`; }
        }
      });
      navigate("/files/documents/report.pdf");
      expect(appContainer.textContent).toBe("File Path: /files/documents/report.pdf");
    });

    test("handle search queries", () => {
      router({
        routes: {
          "/search": (query?: { q?: string }) => {
            appContainer.textContent = `Searching for: ${query?.q}`;
          }
        }
      });
      navigate("/search", {}, { q: "hella" });
      expect(appContainer.textContent).toBe("Searching for: hella");
      expect(route().query.q).toBe("hella");
    });

    test("redirect from an old path to a new one", () => {
      router({
        routes: {
          "/old-profile": "/profile",
          "/profile": () => { appContainer.textContent = "Your New Profile"; }
        }
      });
      navigate("/old-profile");
      expect(route().path).toBe("/profile");
      expect(appContainer.textContent).toBe("Your New Profile");
    });

    test("redirect using a global redirect hook", async () => {
      router({
        routes: {
          "/login": () => { appContainer.textContent = "Please log in"; },
          "/dashboard": () => { appContainer.textContent = "Welcome to your dashboard"; }
        },
        redirects: [{ from: ["/login"], to: "/dashboard" }]
      });
      navigate("/login");
      await tick();
      expect(appContainer.textContent).toBe("Welcome to your dashboard");
      expect(route().path).toBe("/dashboard");
    });

    test("execute global before and after navigation hooks", () => {
      const eventLog = [] as string[];
      router({
        routes: {
          "/": () => { eventLog.push("Page Loaded"); }
        },
        hooks: {
          before: () => eventLog.push("Loading..."),
          after: () => eventLog.push("Finished!")
        }
      });
      navigate("/");
      expect(eventLog).toEqual(["Loading...", "Page Loaded", "Finished!"]);
    });

    test("execute route-specific before and after hooks", async () => {
      const eventLog = [] as string[];
      router({
        routes: {
          "/": {
            before: () => eventLog.push("Preparing home page..."),
            handler: () => eventLog.push("Home page rendered"),
            after: () => eventLog.push("Home page cleanup")
          }
        }
      });
      await tick();
      expect(eventLog).toEqual(["Preparing home page...", "Home page rendered", "Home page cleanup"]);
    });

    test("pass route params to hooks", () => {
      let beforeId = "";
      let afterId = "";
      router({
        routes: {
          "/posts/:id": {
            before: ({ id }: { id: string }) => { beforeId = id; },
            handler: ({ id }: { id: string }) => { appContainer.textContent = `Post ${id}`; },
            after: ({ id }: { id: string }) => { afterId = id; }
          }
        }
      });
      navigate("/posts/42");
      expect(beforeId).toBe("42");
      expect(afterId).toBe("42");
      expect(appContainer.textContent).toBe("Post 42");
    });

    test("display a not found page for unmatched routes", () => {
      let notFoundTriggered = false;
      router({
        routes: {
          "/": () => { appContainer.textContent = "Home"; }
        },
        notFound: () => { notFoundTriggered = true; appContainer.textContent = "404 - Page Not Found"; }
      });
      navigate("/this-page-does-not-exist");
      expect(notFoundTriggered).toBe(true);
      expect(appContainer.textContent).toBe("404 - Page Not Found");
    });

    test("replace the current history state when navigating", () => {
      router({
        routes: {
          "/": () => { appContainer.textContent = "Home"; },
          "/settings": () => { appContainer.textContent = "Settings"; }
        }
      });
      navigate("/settings", {}, {}, { replace: true });
      expect(appContainer.textContent).toBe("Settings");
      // Note: JSDOM doesn't fully support history inspection to verify replacement vs. push.
      // This test primarily ensures the navigation and content update occurs.
    });

    test("not render content for routes with unmatched params", () => {
      router({
        routes: {
          "/users/:id": ({ id }: { id: string }) => { appContainer.textContent = `User: ${id}`; }
        }
      });
      navigate("/users/:id", {}, {});
      expect(appContainer.textContent).toBe("");
    });
  });



  describe("async", () => {
    let appContainer: HTMLDivElement;

    beforeEach(() => {
      appContainer = document.createElement("div");
      document.body.appendChild(appContainer);
      window.history.replaceState({}, "", "/");
    });

    afterEach(() => {
      document.body.removeChild(appContainer);
      window.location.hash = "";
    });

    test("handle promise-returning hooks without throwing", async () => {
      let promiseResolved = false;

      // This test verifies that promise-returning hooks don't throw errors
      // and that the promise rejection is handled gracefully
      router({
        routes: {
          "/": () => {
            appContainer.textContent = "Page Loaded";
          }
        },
        hooks: {
          before: () => {
            return new Promise<void>((resolve) => {
              setTimeout(() => {
                promiseResolved = true;
                resolve();
              }, 10);
            });
          },
          after: () => {
            return Promise.resolve("finished");
          }
        }
      });

      // Navigation should work immediately even with async hooks
      navigate("/");
      expect(appContainer.textContent).toBe("Page Loaded");

      // Wait a bit for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(promiseResolved).toBe(true);
    });

    test("handle async function hooks", async () => {
      let asyncHookCalled = false;

      router({
        routes: {
          "/test": {
            before: async () => {
              await new Promise(resolve => setTimeout(resolve, 5));
              asyncHookCalled = true;
            },
            handler: () => {
              appContainer.textContent = "Test Page";
            }
          }
        }
      });

      navigate("/test");
      expect(appContainer.textContent).toBe("Test Page");

      // Async hook should eventually be called
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(asyncHookCalled).toBe(true);
    });

    test("handle sync and async hooks mixed", async () => {
      const eventLog: string[] = [];
      let asyncAfterCalled = false;

      router({
        routes: {
          "/mixed": {
            before: () => eventLog.push("sync before"),
            handler: () => {
              eventLog.push("handler");
              appContainer.textContent = "Mixed Page";
            },
            after: async () => {
              await Promise.resolve();
              asyncAfterCalled = true;
            }
          }
        }
      });

      navigate("/mixed");
      expect(appContainer.textContent).toBe("Mixed Page");
      expect(eventLog).toEqual(["sync before", "handler"]);

      // Wait a bit for the async hook to execute
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(asyncAfterCalled).toBe(true);
    });
  });
});