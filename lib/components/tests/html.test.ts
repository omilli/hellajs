import { describe, it, expect } from "bun:test";
import { html } from "../html";

describe("html", () => {
  it("creates element with tag", () => {
    const vnode = html.div({ id: "foo" }, "bar");
    expect(vnode.tag).toBe("div");
    expect(vnode.props.id).toBe("foo");
    expect(vnode.children).toContain("bar");
  });

  it("creates element with children only", () => {
    const vnode = html.span("baz");
    expect(vnode.tag).toBe("span");
    expect(vnode.children).toContain("baz");
  });

  it("creates fragment with props", () => {
    const vnode = html.$({ foo: 1 }, "a", "b");
    expect(vnode.tag).toBe("$");
    expect(vnode.props.foo).toBe(1);
    expect(vnode.children).toEqual(["a", "b"]);
  });

  it("creates fragment with children only", () => {
    const vnode = html.$("x", "y");
    expect(vnode.tag).toBe("$");
    expect(vnode.children).toEqual(["x", "y"]);
  });

  it("caches factories", () => {
    const f1 = html.div;
    const f2 = html.div;
    expect(f1).toBe(f2);
  });
});
