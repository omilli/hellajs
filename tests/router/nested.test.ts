import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { router, navigate, route } from "../../packages/router";
import { tick } from "../utils/tick.js";

describe("router", () => {
  describe("nested", () => {
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

    test("match nested routes with 2 levels", () => {
      router({
        routes: {
          "/admin": {
            handler: () => { appContainer.textContent = "Admin Dashboard"; },
            children: {
              "/users": () => { appContainer.textContent = "Users List"; }
            }
          }
        }
      });
      navigate("/admin/users");
      expect(appContainer.textContent).toBe("Users List");
      expect(route().path).toBe("/admin/users");
    });

    test("match nested routes with 3 levels deep", () => {
      router({
        routes: {
          "/admin": {
            handler: () => { appContainer.textContent = "Admin"; },
            children: {
              "/users": {
                handler: () => { appContainer.textContent = "Users"; },
                children: {
                  "/:id": (({ id }: { id: string }) => { appContainer.textContent = `User ${id}`; })
                }
              }
            }
          }
        }
      });
      navigate("/admin/users/123");
      expect(appContainer.textContent).toBe("User 123");
      expect(route().params.id).toBe("123");
    });

    test("match deeply nested routes with multiple parameters", () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/users": {
                children: {
                  "/:id": {
                    children: {
                      "/posts": {
                        children: {
                          "/:postId": (({ id, postId }: { id: string, postId: string }) => {
                            appContainer.textContent = `User ${id} Post ${postId}`;
                          })
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      navigate("/admin/users/123/posts/456");
      expect(appContainer.textContent).toBe("User 123 Post 456");
      expect(route().params.id).toBe("123");
      expect(route().params.postId).toBe("456");
    });

    test("handle parent routes without handlers", () => {
      router({
        routes: {
          "/api": {
            // No handler for parent route
            children: {
              "/v1": {
                children: {
                  "/users": () => { appContainer.textContent = "API v1 Users"; }
                }
              }
            }
          }
        }
      });
      navigate("/api/v1/users");
      expect(appContainer.textContent).toBe("API v1 Users");
    });

    test("match parent route when child routes don't match", () => {
      router({
        routes: {
          "/admin": {
            handler: () => { appContainer.textContent = "Admin Dashboard"; },
            children: {
              "/users": () => { appContainer.textContent = "Users List"; }
            }
          }
        }
      });
      navigate("/admin");
      expect(appContainer.textContent).toBe("Admin Dashboard");
    });
  });

  describe("parameter inheritance", () => {
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

    test("inherit parameters from parent routes", () => {
      router({
        routes: {
          "/users": {
            children: {
              "/:userId": {
                children: {
                  "/posts": {
                    children: {
                      "/:postId": (({ userId, postId }: { userId: string, postId: string }) => {
                        appContainer.textContent = `${userId}-${postId}`;
                      })
                    }
                  }
                }
              }
            }
          }
        }
      });
      navigate("/users/john/posts/hello-world");
      expect(appContainer.textContent).toBe("john-hello-world");
      expect(route().params.userId).toBe("john");
      expect(route().params.postId).toBe("hello-world");
    });

    test("override parent parameters with child parameters of same name", () => {
      router({
        routes: {
          "/:id": {
            children: {
              "/details": {
                children: {
                  "/:id": (({ id }: { id: string }) => {
                    appContainer.textContent = `Child ID: ${id}`;
                  })
                }
              }
            }
          }
        }
      });
      navigate("/parent/details/child");
      expect(appContainer.textContent).toBe("Child ID: child");
      expect(route().params.id).toBe("child"); // Child parameter overrides parent
    });

    test("provide access to all inherited parameters in hooks", () => {
      const paramLog: Record<string, string>[] = [];

      router({
        routes: {
          "/org": {
            children: {
              "/:orgId": {
                before: ({ orgId }: { orgId: string }) => { paramLog.push({ hook: "parent-before", orgId }); },
                children: {
                  "/projects": {
                    children: {
                      "/:projectId": {
                        before: ({ orgId, projectId }) => {
                          paramLog.push({ hook: "child-before", orgId, projectId });
                        },
                        handler: ({ orgId, projectId }) => {
                          appContainer.textContent = `${orgId}/${projectId}`;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      navigate("/org/acme/projects/website");
      expect(paramLog).toHaveLength(2);
      expect(paramLog[0]).toEqual({ hook: "parent-before", orgId: "acme" });
      expect(paramLog[1]).toEqual({ hook: "child-before", orgId: "acme", projectId: "website" });
    });
  });

  describe("hook execution", () => {
    let appContainer: HTMLDivElement;
    let executionLog: string[];

    beforeEach(() => {
      appContainer = document.createElement("div");
      document.body.appendChild(appContainer);
      window.history.replaceState({}, "", "/");
      executionLog = [];
    });

    afterEach(() => {
      document.body.removeChild(appContainer);
      window.location.hash = "";
    });

    test("execute hooks in correct order: parent before → child before → child handler → child after → parent after", () => {
      router({
        routes: {
          "/admin": {
            before: () => executionLog.push("admin-before"),
            after: () => executionLog.push("admin-after"),
            children: {
              "/users": {
                before: () => executionLog.push("users-before"),
                handler: () => {
                  executionLog.push("users-handler");
                  appContainer.textContent = "Users";
                },
                after: () => executionLog.push("users-after")
              }
            }
          }
        }
      });

      navigate("/admin/users");
      expect(executionLog).toEqual([
        "admin-before",
        "users-before",
        "users-handler",
        "users-after",
        "admin-after"
      ]);
    });

    test("execute global hooks around nested route hooks", () => {
      router({
        routes: {
          "/api": {
            before: () => executionLog.push("route-before"),
            children: {
              "/v1": {
                handler: () => {
                  executionLog.push("handler");
                  appContainer.textContent = "API v1";
                }
              }
            },
            after: () => executionLog.push("route-after")
          }
        },
        hooks: {
          before: () => executionLog.push("global-before"),
          after: () => executionLog.push("global-after")
        }
      });

      navigate("/api/v1");
      expect(executionLog).toEqual([
        "global-before",
        "route-before",
        "handler",
        "route-after",
        "global-after"
      ]);
    });

    test("handle 3-level nested hook execution", () => {
      router({
        routes: {
          "/level1": {
            before: () => executionLog.push("level1-before"),
            after: () => executionLog.push("level1-after"),
            children: {
              "/level2": {
                before: () => executionLog.push("level2-before"),
                after: () => executionLog.push("level2-after"),
                children: {
                  "/level3": {
                    before: () => executionLog.push("level3-before"),
                    handler: () => {
                      executionLog.push("level3-handler");
                      appContainer.textContent = "Level 3";
                    },
                    after: () => executionLog.push("level3-after")
                  }
                }
              }
            }
          }
        }
      });

      navigate("/level1/level2/level3");
      expect(executionLog).toEqual([
        "level1-before",
        "level2-before",
        "level3-before",
        "level3-handler",
        "level3-after",
        "level2-after",
        "level1-after"
      ]);
    });

    test("skip hooks for parent routes without handlers when navigating to leaf", () => {
      router({
        routes: {
          "/parent": {
            // No handler, but has hooks
            before: () => executionLog.push("parent-before"),
            after: () => executionLog.push("parent-after"),
            children: {
              "/child": {
                handler: () => {
                  executionLog.push("child-handler");
                  appContainer.textContent = "Child";
                }
              }
            }
          }
        }
      });

      navigate("/parent/child");
      // Parent hooks should still execute even without handler
      expect(executionLog).toEqual([
        "parent-before",
        "child-handler",
        "parent-after"
      ]);
    });
  });

  describe("route resolution", () => {
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

    test("prioritize exact nested matches over flat routes", () => {
      router({
        routes: {
          // Flat route
          "/admin/users": () => { appContainer.textContent = "Flat Admin Users"; },
          // Nested route
          "/admin": {
            children: {
              "/users": () => { appContainer.textContent = "Nested Admin Users"; }
            }
          }
        }
      });
      navigate("/admin/users");
      // Nested route should win
      expect(appContainer.textContent).toBe("Nested Admin Users");
    });

    test("fall back to flat routes when nested routes don't match", () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/dashboard": () => { appContainer.textContent = "Nested Dashboard"; }
            }
          },
          // Flat route fallback
          "/admin/settings": () => { appContainer.textContent = "Flat Settings"; }
        }
      });
      navigate("/admin/settings");
      expect(appContainer.textContent).toBe("Flat Settings");
    });

    test("prioritize more specific nested routes", () => {
      router({
        routes: {
          "/api": {
            children: {
              "/*": () => { appContainer.textContent = "API Wildcard"; },
              "/v1": {
                children: {
                  "/users": () => { appContainer.textContent = "API v1 Users"; }
                }
              }
            }
          }
        }
      });
      navigate("/api/v1/users");
      // More specific nested route should win over wildcard
      expect(appContainer.textContent).toBe("API v1 Users");
    });

    test("handle route precedence with parameters", () => {
      router({
        routes: {
          "/users": {
            children: {
              "/admin": () => { appContainer.textContent = "Admin User"; },
              "/:id": ({ id }: { id: string }) => { appContainer.textContent = `User ${id}`; }
            }
          }
        }
      });

      // Static route should win over parameter route
      navigate("/users/admin");
      expect(appContainer.textContent).toBe("Admin User");

      // Parameter route should match other values
      navigate("/users/123");
      expect(appContainer.textContent).toBe("User 123");
    });
  });

  describe("compatibility", () => {
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

    test("continue to support flat route definitions", () => {
      router({
        routes: {
          "/": () => { appContainer.textContent = "Home"; },
          "/about": () => { appContainer.textContent = "About"; },
          "/users/:id": ({ id }: { id: string }) => { appContainer.textContent = `User ${id}`; }
        }
      });

      navigate("/");
      expect(appContainer.textContent).toBe("Home");

      navigate("/about");
      expect(appContainer.textContent).toBe("About");

      navigate("/users/123");
      expect(appContainer.textContent).toBe("User 123");
      expect(route().params.id).toBe("123");
    });

    test("support mixed flat and nested route definitions", () => {
      router({
        routes: {
          // Flat routes
          "/": () => { appContainer.textContent = "Home"; },
          "/contact": () => { appContainer.textContent = "Contact"; },
          // Nested routes
          "/admin": {
            handler: () => { appContainer.textContent = "Admin Dashboard"; },
            children: {
              "/users": () => { appContainer.textContent = "Admin Users"; }
            }
          }
        }
      });

      navigate("/");
      expect(appContainer.textContent).toBe("Home");

      navigate("/contact");
      expect(appContainer.textContent).toBe("Contact");

      navigate("/admin");
      expect(appContainer.textContent).toBe("Admin Dashboard");

      navigate("/admin/users");
      expect(appContainer.textContent).toBe("Admin Users");
    });

    test("support existing hook patterns with flat routes", () => {
      const eventLog: string[] = [];

      router({
        routes: {
          "/profile": {
            before: () => eventLog.push("profile-before"),
            handler: () => {
              eventLog.push("profile-handler");
              appContainer.textContent = "Profile";
            },
            after: () => eventLog.push("profile-after")
          }
        }
      });

      navigate("/profile");
      expect(eventLog).toEqual(["profile-before", "profile-handler", "profile-after"]);
      expect(appContainer.textContent).toBe("Profile");
    });

    test("maintain redirect functionality with mixed routes", () => {
      router({
        routes: {
          "/old-home": "/",
          "/": () => { appContainer.textContent = "New Home"; },
          "/admin": {
            children: {
              "/old-dashboard": "/admin/dashboard",
              "/dashboard": () => { appContainer.textContent = "Admin Dashboard"; }
            }
          }
        }
      });

      navigate("/old-home");
      expect(route().path).toBe("/");
      expect(appContainer.textContent).toBe("New Home");
    });
  });

  describe("navigation", () => {
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

    test("navigate between different nested routes", () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/users": () => { appContainer.textContent = "Users"; },
              "/settings": () => { appContainer.textContent = "Settings"; }
            }
          }
        }
      });

      navigate("/admin/users");
      expect(appContainer.textContent).toBe("Users");

      navigate("/admin/settings");
      expect(appContainer.textContent).toBe("Settings");
    });

    test("navigate from nested to flat routes", () => {
      router({
        routes: {
          "/app": {
            children: {
              "/dashboard": () => { appContainer.textContent = "Dashboard"; }
            }
          },
          "/about": () => { appContainer.textContent = "About"; }
        }
      });

      navigate("/app/dashboard");
      expect(appContainer.textContent).toBe("Dashboard");

      navigate("/about");
      expect(appContainer.textContent).toBe("About");
    });

    test("navigate from flat to nested routes", () => {
      router({
        routes: {
          "/home": () => { appContainer.textContent = "Home"; },
          "/admin": {
            children: {
              "/panel": () => { appContainer.textContent = "Admin Panel"; }
            }
          }
        }
      });

      navigate("/home");
      expect(appContainer.textContent).toBe("Home");

      navigate("/admin/panel");
      expect(appContainer.textContent).toBe("Admin Panel");
    });

    test("navigate between different nested hierarchies", () => {
      router({
        routes: {
          "/blog": {
            children: {
              "/posts": {
                children: {
                  "/:id": ({ id }: { id: string }) => { appContainer.textContent = `Blog Post ${id}`; }
                }
              }
            }
          },
          "/shop": {
            children: {
              "/products": {
                children: {
                  "/:id": ({ id }: { id: string }) => { appContainer.textContent = `Product ${id}`; }
                }
              }
            }
          }
        }
      });

      navigate("/blog/posts/my-first-post");
      expect(appContainer.textContent).toBe("Blog Post my-first-post");

      navigate("/shop/products/cool-gadget");
      expect(appContainer.textContent).toBe("Product cool-gadget");
    });

    test("handle navigation with query parameters in nested routes", () => {
      router({
        routes: {
          "/search": {
            children: {
              "/results": (_: any, query: { q: string }) => {
                appContainer.textContent = `Results: ${query?.q || 'none'}`;
              }
            }
          }
        }
      });

      navigate("/search/results", {}, { q: "nested routing" });
      expect(appContainer.textContent).toBe("Results: nested routing");
      expect(route().query.q).toBe("nested routing");
    });
  });

  describe("errors and 404", () => {
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

    test("show 404 for unmatched nested routes", () => {
      let notFoundCalled = false;

      router({
        routes: {
          "/admin": {
            children: {
              "/users": () => { appContainer.textContent = "Users"; }
            }
          }
        },
        notFound: () => {
          notFoundCalled = true;
          appContainer.textContent = "404 - Not Found";
        }
      });

      navigate("/admin/nonexistent");
      expect(notFoundCalled).toBe(true);
      expect(appContainer.textContent).toBe("404 - Not Found");
    });

    test("handle partial nested matches correctly", () => {
      let notFoundCalled = false;

      router({
        routes: {
          "/api": {
            children: {
              "/v1": {
                children: {
                  "/users": () => { appContainer.textContent = "API Users"; }
                }
              }
            }
          }
        },
        notFound: () => {
          notFoundCalled = true;
          appContainer.textContent = "Not Found";
        }
      });

      // This should not match /api/v1/users
      navigate("/api/v2/users");
      expect(notFoundCalled).toBe(true);
      expect(appContainer.textContent).toBe("Not Found");
    });

    test("show parent route when child route is not found but parent has handler", () => {
      router({
        routes: {
          "/dashboard": {
            handler: () => { appContainer.textContent = "Dashboard Home"; },
            children: {
              "/analytics": () => { appContainer.textContent = "Analytics"; }
            }
          }
        }
      });

      // Should fall back to parent handler
      navigate("/dashboard/nonexistent");
      expect(appContainer.textContent).toBe("Dashboard Home");
    });

    test("handle malformed route structures gracefully", () => {
      let errorOccurred = false;

      try {
        router({
          routes: {
            "/malformed": {
              // @ts-expect-error
              children: null // Intentionally malformed
            }
          }
        });
        navigate("/malformed/test");
      } catch (e) {
        errorOccurred = true;
      }

      // Should not throw errors for malformed structures
      expect(errorOccurred).toBe(false);
    });

    test("handle circular route references", () => {
      const circularChildren: any = {};
      circularChildren["/loop"] = {
        children: circularChildren
      };

      let errorOccurred = false;

      try {
        router({
          routes: {
            "/circular": circularChildren
          }
        });
        navigate("/circular/loop/loop/loop");
      } catch (e) {
        errorOccurred = true;
      }

      // Should handle circular references without infinite recursion
      expect(errorOccurred).toBe(false);
    });
  });

  describe("hash", () => {
    let appContainer: HTMLDivElement;

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

    test("handle nested routes in hash mode", async () => {
      router({
        routes: {
          "/admin": {
            children: {
              "/users": {
                children: {
                  "/:id": ({ id }: { id: string }) => { appContainer.textContent = `User ${id}`; }
                }
              }
            }
          }
        },
        hash: true
      });

      navigate("/admin/users/123");
      await tick();
      expect(window.location.hash).toBe("#/admin/users/123");
      expect(appContainer.textContent).toBe("User 123");
      expect(route().params.id).toBe("123");
    });

    test("navigate between nested routes in hash mode", async () => {
      router({
        routes: {
          "/app": {
            children: {
              "/home": () => { appContainer.textContent = "Home"; },
              "/profile": () => { appContainer.textContent = "Profile"; }
            }
          }
        },
        hash: true
      });

      navigate("/app/home");
      await tick();
      expect(window.location.hash).toBe("#/app/home");
      expect(appContainer.textContent).toBe("Home");

      navigate("/app/profile");
      await tick();
      expect(window.location.hash).toBe("#/app/profile");
      expect(appContainer.textContent).toBe("Profile");
    });

    test("handle query parameters with nested routes in hash mode", async () => {
      router({
        routes: {
          "/search": {
            children: {
              "/advanced": (_: any, query: { term: string }) => {
                appContainer.textContent = `Advanced: ${query?.term || 'none'}`;
              }
            }
          }
        },
        hash: true
      });

      navigate("/search/advanced", {}, { term: "test query" });
      await tick();
      expect(window.location.hash).toBe("#/search/advanced?term=test%20query");
      expect(appContainer.textContent).toBe("Advanced: test query");
      expect(route().query.term).toBe("test query");
    });
  });

  describe("performance", () => {
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

    test("handle deep nesting efficiently", () => {
      const startTime = performance.now();

      // Create a deeply nested route structure
      const createNestedRoute = (depth: number): any => {
        if (depth === 0) {
          return () => { appContainer.textContent = `Depth reached: ${depth}`; };
        }
        return {
          children: {
            [`/level${depth}`]: createNestedRoute(depth - 1)
          }
        };
      };

      router({
        routes: {
          "/deep": createNestedRoute(10)
        }
      });

      navigate("/deep/level10/level9/level8/level7/level6/level5/level4/level3/level2/level1");

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (arbitrary threshold)
      expect(executionTime).toBeLessThan(100); // 100ms threshold
      expect(appContainer.textContent).toBe("Depth reached: 0");
    });

    test("perform comparably to flat routes for simple cases", () => {
      const flatRoutes: Record<string, () => void> = {};
      const nestedRoutes: Record<string, any> = {};

      // Create 100 flat routes
      for (let i = 0; i < 100; i++) {
        flatRoutes[`/flat${i}`] = () => { appContainer.textContent = `Flat ${i}`; };
      }

      // Create equivalent nested structure
      for (let i = 0; i < 100; i++) {
        nestedRoutes[`/nested${i}`] = {
          handler: () => { appContainer.textContent = `Nested ${i}`; }
        };
      }

      // Test flat route performance
      const flatStartTime = performance.now();
      router({ routes: flatRoutes });
      navigate("/flat50");
      const flatEndTime = performance.now();

      // Reset and test nested route performance  
      const nestedStartTime = performance.now();
      router({ routes: nestedRoutes });
      navigate("/nested50");
      const nestedEndTime = performance.now();

      const flatTime = flatEndTime - flatStartTime;
      const nestedTime = nestedEndTime - nestedStartTime;

      // Nested routes should not be significantly slower (within 2x)
      expect(nestedTime).toBeLessThan(flatTime * 2);
    });

    test("handle large numbers of routes efficiently", () => {
      const routes: Record<string, any> = {};

      // Create a large nested structure
      for (let i = 0; i < 50; i++) {
        routes[`/section${i}`] = {
          children: {}
        };

        for (let j = 0; j < 20; j++) {
          routes[`/section${i}`].children[`/item${j}`] = () => {
            appContainer.textContent = `Section ${i} Item ${j}`;
          };
        }
      }

      const startTime = performance.now();
      router({ routes });
      navigate("/section25/item10");
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      // Should handle large route tables efficiently
      expect(executionTime).toBeLessThan(50); // 50ms threshold
      expect(appContainer.textContent).toBe("Section 25 Item 10");
    });
  });
});