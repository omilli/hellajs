import { describe, test, expect } from "bun:test";
import { store } from "../packages/store";
import { effect } from "../packages/core";

describe("Reactive Store", () => {
  test("should create a user profile and update its properties", () => {
    const userProfile = store({
      name: "John Doe",
      email: "john.doe@example.com",
      address: {
        street: "123 Main St",
        city: "Anytown"
      }
    });

    expect(userProfile.name()).toBe("John Doe");
    userProfile.name("Jane Doe");
    expect(userProfile.name()).toBe("Jane Doe");

    expect(userProfile.address.city()).toBe("Anytown");
    userProfile.address.city("Newville");
    expect(userProfile.address.city()).toBe("Newville");
  });

  test("should partially update a product's details", () => {
    const product = store({
      id: "prod-123",
      name: "Laptop",
      details: {
        brand: "BrandX",
        price: 1000
      }
    });

    product.update({
      details: {
        price: 950
      }
    });

    expect(product.details.price()).toBe(950);
    expect(product.name()).toBe("Laptop"); // Should remain unchanged
  });

  test("should replace the entire state of a settings object using .set()", () => {
    const settings = store({
      theme: "light",
      notifications: { enabled: true }
    });

    settings.set({
      theme: "dark",
      notifications: { enabled: false }
    });

    expect(settings.theme()).toBe("dark");
    expect(settings.notifications.enabled()).toBe(false);
  });

  test("should provide a reactive computed snapshot of the current state", () => {
    let effectRunCount = 0;
    const cart = store({
      items: [{ id: 1, name: "Apple" }],
      total: 1.00
    });

    const reactiveSnapshot = cart.computed;

    effect(() => {
      effectRunCount++;
      // Access properties to trigger reactivity
      reactiveSnapshot().total;
    });

    expect(effectRunCount).toBe(1);
    expect(reactiveSnapshot().total).toBe(1.00);

    cart.total(1.50);
    expect(reactiveSnapshot().total).toBe(1.50);
    expect(effectRunCount).toBe(2);
  });

  test("should return a plain object snapshot of the current state", () => {
    const cart = store({
      items: [{ id: 1, name: "Apple" }],
      total: 1.00
    });

    const snapshot = cart.computed();
    expect(snapshot).toEqual({
      items: [{ id: 1, name: "Apple" }],
      total: 1.00
    });

    cart.total(1.50);
    const newSnapshot = cart.computed();
    expect(newSnapshot.total).toBe(1.50);
  });

  test("should clean up all signals and effects associated with the store", () => {
    const session = store({
      token: "abc-123",
      user: { id: 1 }
    });

    // No public API to check cleanup, but we can ensure it runs without error
    expect(() => session.cleanup()).not.toThrow();
  });

  test("should update a deeply nested property in a configuration object", () => {
    const config = store({
      api: {
        baseUrl: "/api",
        endpoints: {
          users: "/users"
        }
      }
    });

    config.api.endpoints.update({ users: "/api/v2/users" });
    expect(config.api.endpoints.users()).toBe("/api/v2/users");
  });

  test("should call cleanup on nested store objects", () => {
    const complexStore = store({
      user: { name: "Alice" },
      preferences: store({ theme: "dark" }) // Manually creating a nested store
    });

    let nestedCleanupCalled = false;
    const originalCleanup = complexStore.preferences.cleanup;
    complexStore.preferences.cleanup = () => {
      nestedCleanupCalled = true;
      originalCleanup();
    };

    complexStore.cleanup();
    expect(nestedCleanupCalled).toBe(true);
  });

  test("should recursively clean up deeply nested plain objects", () => {
    const appState = store({
      session: {
        user: {
          // This will be converted to a nested store
          details: store({ isLoggedIn: true })
        }
      }
    });

    let deepCleanupCalled = false;
    const originalCleanup = appState.session.user.details.cleanup;
    appState.session.user.details.cleanup = () => {
      deepCleanupCalled = true;
      originalCleanup();
    };

    appState.cleanup();
    expect(deepCleanupCalled).toBe(true);
  });
});

describe("Readonly Store Options", () => {
  test("should prevent all properties from being updated when readonly is true", () => {
    const constants = store({
      API_KEY: "xyz-789",
      VERSION: "1.0.0"
    }, { readonly: true });

    expect(constants.API_KEY()).toBe("xyz-789");
    // @ts-expect-error
    (constants.API_KEY)?.("new-key");
    expect(constants.API_KEY()).toBe("xyz-789");
  });

  test("should only prevent specified properties from being updated", () => {
    const book = store({
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      publicationYear: 1925
    }, { readonly: ["title", "author"] });

    // @ts-expect-error
    (book.title)?.("A New Title");
    expect(book.title()).toBe("The Great Gatsby");

    book.publicationYear(2022); // This should be allowed
    expect(book.publicationYear()).toBe(2022);
  });

  test("should allow updates to nested properties unless their parent is readonly", () => {
    const user = store(
      {
        id: 1,
        profile: {
          name: "Alice",
          email: "alice@example.com"
        }
      },
      { readonly: ["id"] }
    );

    expect(typeof user.profile.name).toBe("function");
    user.profile.name("Alicia");
    expect(user.profile.name()).toBe("Alicia");

    // @ts-expect-error
    (user.id)?.(2);
    expect(user.id()).toBe(1);
  });
});
