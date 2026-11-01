import { describe, expect, test } from "vite-plus/test";
import * as bundle from "@hellajs/ui/bundle";
import * as entry from "@hellajs/ui";

describe("ui bundle", () => {
  test("bundle exports the same keys as the entry", () => {
    expect(Object.keys(bundle).sort()).toEqual(Object.keys(entry).sort());
  });
  test("bundle export kinds match the entry", () => {
    const kinds = (mod: typeof entry) =>
      Object.entries(mod)
        .map(([key, value]) => `${key}:${typeof value}`)
        .sort();
    expect(kinds(bundle as typeof entry)).toEqual(kinds(entry));
  });
});
