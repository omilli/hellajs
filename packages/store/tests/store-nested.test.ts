import { describe, test, expect } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("nested stores", () => {
  test("stores as values share signal references", () => {
    const userStore = store({
      name: "John Doe",
      email: "john@example.com",
      preferences: {
        theme: "dark",
        language: "en"
      }
    });

    const uiStore = store({
      sidebarOpen: false,
      activeTab: "dashboard"
    });

    const appStore = store({
      user: userStore,
      ui: uiStore
    });

    expect(appStore.user.name()).toBe("John Doe");
    expect(appStore.user.email()).toBe("john@example.com");
    expect(appStore.user.preferences.theme()).toBe("dark");
    expect(appStore.ui.sidebarOpen()).toBe(false);
    expect(appStore.ui.activeTab()).toBe("dashboard");

    appStore.user.name("Jane Doe");
    appStore.user.preferences.theme("light");
    appStore.ui.sidebarOpen(true);

    expect(appStore.user.name()).toBe("Jane Doe");
    expect(appStore.user.preferences.theme()).toBe("light");
    expect(appStore.ui.sidebarOpen()).toBe(true);

    expect(userStore.name()).toBe("Jane Doe");
    expect(uiStore.sidebarOpen()).toBe(true);

    userStore.email("jane@example.com");
    expect(appStore.user.email()).toBe("jane@example.com");
  });
});
