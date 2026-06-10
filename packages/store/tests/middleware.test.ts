import { describe, test, expect, mock } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
describe("middleware", () => {
  test("transforms values on set", () => {
    const data = store({
      name: "",
      email: ""
    }, {
      middleware: {
        name: (v: string) => v.trim(),
        email: (v: string) => v.toLowerCase()
      }
    });

    data.name("  John  ");
    data.email("JOHN@EXAMPLE.COM");

    expect(data.name()).toBe("John");
    expect(data.email()).toBe("john@example.com");
  });

  test("validates and rejects invalid values", () => {
    const data = store({
      age: 0
    }, {
      middleware: {
        age: (v: number) => {
          if (v < 0) throw new Error("Age cannot be negative");
          return v;
        }
      }
    });

    expect(() => data.age(-5)).toThrow("Age cannot be negative");
    expect(data.age()).toBe(0);

    data.age(25);
    expect(data.age()).toBe(25);
  });

  test("works with update method", () => {
    const data = store({
      name: "",
      email: "",
      age: 0
    }, {
      middleware: {
        name: (v: string) => v.trim(),
        email: (v: string) => v.toLowerCase(),
        age: (v: number) => Math.max(0, v)
      }
    });

    data.update({
      name: "  Jane  ",
      email: "JANE@EXAMPLE.COM",
      age: 30
    });

    expect(data.name()).toBe("Jane");
    expect(data.email()).toBe("jane@example.com");
    expect(data.age()).toBe(30);
  });

  test("works with nested stores", () => {
    const data = store({
      user: {
        name: "",
        email: ""
      }
    }, {
      middleware: {
        user: {
          name: (v: string) => v.trim(),
          email: (v: string) => v.toLowerCase()
        }
      }
    });

    data.user.name("  John  ");
    data.user.email("JOHN@EXAMPLE.COM");

    expect(data.user.name()).toBe("John");
    expect(data.user.email()).toBe("john@example.com");
  });

  test("middleware only applied for defined keys", () => {
    const data = store({
      a: "hello",
      b: "world"
    }, {
      middleware: {
        a: (v: string) => v.toUpperCase()
      }
    });

    data.a("test");
    data.b("test");

    expect(data.a()).toBe("TEST");
    expect(data.b()).toBe("test");
  });

  test("middleware applies via update(draft => ...) path", () => {
    const data = store({ name: "", score: 0 }, {
      middleware: {
        name: (v: string) => v.trim(),
        score: (v: number) => Math.max(0, v)
      }
    });

    data.update(draft => {
      draft.name = "  Jane  ";
      draft.score = -10;
    });

    expect(data.name()).toBe("Jane");
    expect(data.score()).toBe(0);
  });

  test("nested store middleware with draft mutator", () => {
    const data = store({
      user: {
        name: "",
        email: ""
      },
      count: 0
    }, {
      middleware: {
        user: {
          name: (v: string) => v.trim(),
          email: (v: string) => v.toLowerCase()
        },
        count: (v: number) => Math.max(0, v)
      }
    });

    data.update(draft => {
      draft.user.name = "  Jane  ";
      draft.user.email = "JANE@EXAMPLE.COM";
      draft.count = -5;
    });

    expect(data.user.name()).toBe("Jane");
    expect(data.user.email()).toBe("jane@example.com");
    expect(data.count()).toBe(0);
  });

  test("nested object middleware applies to individual properties of nested store", () => {
    // Middleware for nested objects must be a nested object mapping
    // individual property keys to their own middleware functions.
    const data = store({
      config: { timeout: 0, retries: 3 }
    }, {
      middleware: {
        config: {
          timeout: (v: number) => Math.max(v, 100),
          retries: (v: number) => Math.min(v, 5)
        }
      }
    });

    data.config.timeout(50);
    data.config.retries(10);

    expect(data.config.timeout()).toBe(100);
    expect(data.config.retries()).toBe(5);
  });

  test("deeply nested middleware (3 levels)", () => {
    const data = store({
      a: { b: { c: { value: "" } } }
    }, {
      middleware: {
        a: { b: { c: { value: (v: string) => v.toUpperCase() } } }
      }
    });

    data.a.b.c.value("hello");
    expect(data.a.b.c.value()).toBe("HELLO");
  });

  test("middleware returning same value still propagates", () => {
    const data = store({ count: 0 }, {
      middleware: { count: (v: number) => v }
    });
    const tracker = mock(() => {});
    effect(() => { data.count(); tracker(); });

    expect(tracker).toHaveBeenCalledTimes(1);
    data.count(0);
    // Same value middleware returns same, signal still does ref-eq check
    expect(tracker).toHaveBeenCalledTimes(1);
    data.count(1);
    expect(tracker).toHaveBeenCalledTimes(2);
  });
});
});
