import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { router, route } from "@hellajs/router/bundle";
import { setupRouterEnv } from "./helpers";

describe("router", () => {
describe("anchor interception", () => {
  let container: HTMLDivElement;
  let render: (content: string) => void;
  let origHref: string;

  beforeEach(() => {
    origHref = window.location.href;
    const env = setupRouterEnv();
    container = env.container;
    render = env.render;
    window.location.href = "http://localhost/";
  });

  afterEach(() => {
    window.location.href = origHref;
  });

  test("intercepts same-origin anchor click and navigates", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      }
    });

    const el = document.createElement("a");
    el.href = "/about";
    el.textContent = "About";
    document.body.appendChild(el);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(route().path).toBe("/about");
    expect(container.textContent).toBe("about");
  });

  test("does not intercept cross-origin anchor clicks", () => {
    router({
      routes: { "/": () => render("home") }
    });

    const el = document.createElement("a");
    el.href = "https://external.example.com/path";
    el.textContent = "External";
    document.body.appendChild(el);

    const pathBefore = route().path;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(route().path).toBe(pathBefore);
  });

  test("does not intercept mailto: links", () => {
    router({
      routes: { "/": () => render("home") }
    });

    const el = document.createElement("a");
    el.href = "mailto:test@example.com";
    el.textContent = "Email";
    document.body.appendChild(el);

    const pathBefore = route().path;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(route().path).toBe(pathBefore);
  });

  test("does not intercept tel: links", () => {
    router({
      routes: { "/": () => render("home") }
    });

    const el = document.createElement("a");
    el.href = "tel:+1234567890";
    el.textContent = "Call";
    document.body.appendChild(el);

    const pathBefore = route().path;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(route().path).toBe(pathBefore);
  });

  test.each([["metaKey"], ["ctrlKey"], ["shiftKey"], ["altKey"]] as const)(
    "does not intercept %s modifier key clicks",
    (modifier) => {
      router({
        routes: { "/": () => render("home") }
      });

      const el = document.createElement("a");
      el.href = "/about";
      el.textContent = "About";
      document.body.appendChild(el);

      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        [modifier]: true
      });
      el.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    }
  );

  test("does not intercept target=_blank clicks", () => {
    router({
      routes: { "/": () => render("home") }
    });

    const el = document.createElement("a");
    el.href = "/about";
    el.target = "_blank";
    el.textContent = "About";
    document.body.appendChild(el);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  test("does not intercept target=_parent clicks", () => {
    router({
      routes: { "/": () => render("home") }
    });

    const el = document.createElement("a");
    el.href = "/about";
    el.target = "_parent";
    el.textContent = "About";
    document.body.appendChild(el);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  test("does not intercept download links", () => {
    router({
      routes: { "/": () => render("home") }
    });

    const el = document.createElement("a");
    el.href = "/file.pdf";
    el.setAttribute("download", "");
    el.textContent = "Download";
    document.body.appendChild(el);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  test("intercept: false disables anchor interception", () => {
    router({
      routes: { "/": () => render("home"), "/about": () => render("about") },
      intercept: false
    });

    const el = document.createElement("a");
    el.href = "/about";
    el.textContent = "About";
    document.body.appendChild(el);

    const pathBefore = route().path;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(route().path).toBe(pathBefore);
  });

  test("interception works after re-calling router()", () => {
    router({
      routes: { "/": () => render("home") }
    });

    router({
      routes: { "/": () => render("home"), "/about": () => render("about") }
    });

    const el = document.createElement("a");
    el.href = "/about";
    el.textContent = "About";
    document.body.appendChild(el);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(route().path).toBe("/about");
  });

  test("re-calling router() removes previous click listener", () => {
    const origRemoveEventListener = document.removeEventListener.bind(document);
    const removeSpy = mock(() => {});

    const mockRemoveEventListener = ((...args: unknown[]) => {
      removeSpy();
      return (origRemoveEventListener as (...args: unknown[]) => void)(...args);
    }) as unknown as typeof document.removeEventListener;

    document.removeEventListener = mockRemoveEventListener;

    try {
      router({
        routes: { "/": () => render("home") }
      });

      removeSpy.mockClear();

      router({
        routes: { "/": () => render("home"), "/about": () => render("about") }
      });

      expect(removeSpy).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener = origRemoveEventListener as unknown as typeof document.removeEventListener;
    }
  });

  test("intercepts hash-mode anchor clicks", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      mode: "hash"
    });

    const el = document.createElement("a");
    el.href = "#/about";
    el.textContent = "About";
    document.body.appendChild(el);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(route().path).toBe("/about");
  });

  test("does not intercept clicks on non-anchor elements", () => {
    router({
      routes: { "/": () => {} }
    });

    const el = document.createElement("div");
    el.textContent = "Not a link";
    document.body.appendChild(el);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  test("does not intercept click when already defaultPrevented", () => {
    router({
      routes: { "/": () => {} }
    });

    const el = document.createElement("a");
    el.href = "/about";
    el.textContent = "About";
    document.body.appendChild(el);

    const pathBefore = route().path;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    event.preventDefault();
    el.dispatchEvent(event);

    expect(route().path).toBe(pathBefore);
  });
});
});
