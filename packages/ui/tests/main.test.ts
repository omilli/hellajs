import { describe, test, expect } from "bun:test";
import { listComponents, main } from "@hellajs/ui/bundle";

describe("main", () => {
  test("throws the unknown-command contract prefixed by the two-style usage overview", async () => {
    await expect(main(["bogus"])).rejects.toThrow('[ui] main: unknown command "bogus"');
    await expect(main(["bogus"])).rejects.toThrow("--style css|tailwind");
    await expect(main(["bogus"])).rejects.toThrow("--lang js|ts");
  });

  test("lists registry components and exits clean", async () => {
    expect(await main(["list"])).toBe(0);
    expect(listComponents()).toEqual(["button", "card", "cn", "dialog", "input", "tabs", "theme"]);
  });
});
