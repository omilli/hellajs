import { describe, test, expect } from "bun:test";

describe("batch", () => {
  test("groups multiple signal changes into a single effect", () => {
    const userName = signal("Alice");
    const userAge = signal(25);
    let updateCount = 0;

    effect(() => {
      userName();
      userAge();
      updateCount++;
    });

    expect(updateCount).toBe(1);

    batch(() => {
      userName("Bob");
      userAge(30);
    });

    expect(updateCount).toBe(2);

    expect(userName()).toBe("Bob");
    expect(userAge()).toBe(30);
  });
});
