import { describe, test, expect } from "bun:test";
import { html } from "../packages/dom/dist/hella-dom.esm";

describe("html", () => {
  test("should create vnode with tag, props, children", () => {
    const vnode = html.div({ id: "foo" }, "bar");
    expect(vnode.tag).toBe("div");
    expect(vnode.props.id).toBe("foo");
    expect(vnode.children[0]).toBe("bar");
  });

  test("should create fragment", () => {
    const frag = html.$("a", "b");
    expect(frag.tag).toBe("$");
    expect(frag.children).toEqual(["a", "b"]);
  });

  test("should create fragment with props", () => {
    const frag = html.$({ id: "frag" }, "a", "b");
    expect(frag.tag).toBe("$");
    expect(frag.props.id).toBe("frag");
    expect(frag.children).toEqual(["a", "b"]);
  });
});
