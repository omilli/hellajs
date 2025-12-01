import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import { mount, html, Portal, queueCleanup } from "@hellajs/dom/bundle";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div><div id="modal-root"></div>';
});

describe("Portal rendering", () => {
  test("renders content to target with different insert types", () => {
    document.querySelector("#modal-root")!.innerHTML = "<span>Existing</span>";

    mount({ tag: "div", children: [Portal({ to: "#modal-root", children: [{ tag: "b", children: ["Last"] }] })] });
    expect(document.querySelector("#modal-root")?.lastElementChild?.textContent).toBe("Last");

    document.querySelector("#modal-root")!.innerHTML = "<span>Existing</span>";
    mount({ tag: "div", children: [Portal({ to: "#modal-root", type: "prepend", children: [{ tag: "b", children: ["First"] }] })] });
    expect(document.querySelector("#modal-root")?.firstElementChild?.textContent).toBe("First");

    document.querySelector("#modal-root")!.innerHTML = "<span>Old</span>";
    mount({ tag: "div", children: [Portal({ to: "#modal-root", type: "replace", children: [{ tag: "b", children: ["New"] }] })] });
    expect(document.querySelector("#modal-root")?.textContent).toBe("New");

    document.body.innerHTML = '<div id="app"></div><div id="target"></div>';
    mount({ tag: "div", children: [Portal({ to: "#target", type: "before", children: [{ tag: "b", children: ["Before"] }] })] });
    expect(document.querySelector("#target")?.previousElementSibling?.textContent).toBe("Before");

    document.body.innerHTML = '<div id="app"></div><div id="target"></div>';
    mount({ tag: "div", children: [Portal({ to: "#target", type: "after", children: [{ tag: "b", children: ["After"] }] })] });
    expect(document.querySelector("#target")?.nextElementSibling?.textContent).toBe("After");
  });

  test("reactive content updates in portal", () => {
    document.body.innerHTML = '<div id="app"></div><div id="modal-root"></div>';
    const text = signal("initial");

    mount({ tag: "div", children: [Portal({ to: "#modal-root", children: [text] })] });
    expect(document.querySelector("#modal-root")?.textContent).toBe("initial");

    text("updated");
    flush();
    expect(document.querySelector("#modal-root")?.textContent).toBe("updated");
  });

  test("cleans up portal content when marker removed", () => {
    document.body.innerHTML = '<div id="app"></div><div id="modal-root"></div>';

    mount({
      tag: "div",
      props: { id: "wrapper" },
      children: [Portal({ to: "#modal-root", children: [{ tag: "span", props: { id: "portal-span" }, children: ["Content"] }] })]
    });

    expect(document.querySelector("#modal-root #portal-span")).not.toBeNull();

    const wrapper = document.querySelector("#wrapper")!;
    const marker = wrapper.firstChild as HellaElement;
    marker.remove();
    queueCleanup(marker);

    expect(document.querySelector("#modal-root #portal-span")).toBeNull();
  });

  test("warns on missing target", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => { });
    mount({ tag: "div", children: [Portal({ to: "#nonexistent", children: ["Content"] })] });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("works with html tagged templates", () => {
    document.body.innerHTML = '<div id="app"></div><div id="modal-root"></div>';
    const content = signal("initial");

    mount(html`
      <div>
        <${Portal} to="#modal-root" type="prepend">
          <span>${content}</span>
        </${Portal}>
      </div>
    `);

    expect(document.querySelector("#modal-root span")?.textContent).toBe("initial");
    content("updated");
    flush();
    expect(document.querySelector("#modal-root span")?.textContent).toBe("updated");
  });
});
