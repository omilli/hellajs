import { describe, test, expect } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("readonly", () => {
  test("all properties readonly", () => {
    const readonlyAll = store({ key: "value" }, { readonly: true });

    expect(readonlyAll.key()).toBe("value");
    expect(readonlyAll.key.length).toBe(0);
  });

  test("specific properties readonly", () => {
    const readonlyPartial = store({
      title: "Book",
      year: 2023,
      rating: 4.5
    }, { readonly: ["title"] });

    expect(readonlyPartial.title()).toBe("Book");
    readonlyPartial.year(2024);
    readonlyPartial.rating(5.0);

    expect(readonlyPartial.year()).toBe(2024);
    expect(readonlyPartial.rating()).toBe(5.0);
  });

  test("readonly properties not updated via update()", () => {
    const data = store({ locked: "original", writable: "a" }, { readonly: ["locked"] });

    data.update({ locked: "new", writable: "b" } as never);

    expect(data.locked()).toBe("original");
    expect(data.writable()).toBe("b");
  });

  test("readonly: true setter is a no-op at runtime", () => {
    const data = store({ count: 0, name: "init" }, { readonly: true });

    (data.count as unknown as (v: number) => void)(999);

    expect(data.count()).toBe(0);
    expect(data.name()).toBe("init");
  });

  test("readonly combined with middleware", () => {
    const data = store(
      { count: 0, name: "init" },
      { readonly: ["count"], middleware: { name: (v: string) => v.toUpperCase() } }
    );

    data.name("lower");
    expect(data.name()).toBe("LOWER");
    expect(data.count()).toBe(0);
  });
});
