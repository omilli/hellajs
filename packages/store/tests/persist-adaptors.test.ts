import { describe, test, expect } from "bun:test";
import { localStorageAdaptor, sessionStorageAdaptor } from "@hellajs/store/bundle";

describe("store", () => {
describe("persist-adaptors", () => {
  test("reads, writes, and clears through window.localStorage under its key", () => {
    const adaptor = localStorageAdaptor("hella-persist-local");
    window.localStorage.setItem("hella-persist-local", '{"a":1}');

    expect(adaptor.read()).toBe('{"a":1}');

    adaptor.write('{"a":2}');
    expect(window.localStorage.getItem("hella-persist-local")).toBe('{"a":2}');

    adaptor.clear();
    expect(window.localStorage.getItem("hella-persist-local")).toBeNull();
  });

  test("reads, writes, and clears through window.sessionStorage under its key", () => {
    const adaptor = sessionStorageAdaptor("hella-persist-session");

    adaptor.write('{"b":1}');
    expect(window.sessionStorage.getItem("hella-persist-session")).toBe('{"b":1}');
    expect(adaptor.read()).toBe('{"b":1}');

    adaptor.clear();
    expect(window.sessionStorage.getItem("hella-persist-session")).toBeNull();
  });

  test("defers storage access until a method is called", () => {
    const win = globalThis.window;
    Reflect.deleteProperty(globalThis, "window");
    let adaptor;
    try {
      adaptor = localStorageAdaptor("hella-persist-lazy");
      expect(adaptor).toBeDefined();
    } finally {
      globalThis.window = win;
    }

    adaptor.write("x");
    expect(window.localStorage.getItem("hella-persist-lazy")).toBe("x");
    adaptor.clear();
  });
});
});
