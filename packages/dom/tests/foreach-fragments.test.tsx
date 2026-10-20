import { describe, test, expect, beforeEach } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";

import { createList, getListTexts } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("foreach single-root items", () => {
    test("throws when a use renderer resolves to a fragment on first render", () => {
      const items = signal([1, 2]);
      const fragmentRenderer = (item: number) => (
        <>
          <li>Item {item}</li>
          <span>({item})</span>
        </>
      );

      expect(() => mount(() => createList(items, fragmentRenderer))).toThrow(
        "[dom] ForEach: use must return a single element",
      );
    });

    test("throws when an index-keyed item re-renders as a fragment on update", () => {
      const items = signal(["A", "B"]);
      const conditionalRenderer = (item: string) =>
        item === "FRAG" ? (
          <>
            <li>{item}</li>
            <span>({item})</span>
          </>
        ) : (
          <li>{item}</li>
        );

      mount(() => createList(items, conditionalRenderer));
      expect(getListTexts()).toEqual(["A", "B"]);

      // index-fallback keys: the new item reference forces a fresh build at index 0;
      // a signal write drains effects synchronously outside a batch, so the write itself throws
      expect(() => items(["FRAG", "B"])).toThrow("[dom] ForEach: use must return a single element");
    });
  });
});
