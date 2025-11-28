import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import { Portal, mount, html, queueCleanup } from "../";
import type { HellaElement } from "../lib/types";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div><div id="modal-root"></div>';
});

describe("Portal", () => {
  test("renders content to target element", () => {
    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          children: [{ tag: "span", children: ["Portal content"] }]
        })
      ]
    });

    expect(document.querySelector("#modal-root span")?.textContent).toBe("Portal content");
    expect(document.querySelector("#app")?.innerHTML).toContain("<!--portal-->");
  });

  test("warns when target not found", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => { });

    mount({
      tag: "div",
      children: [
        Portal({
          to: "#nonexistent",
          children: ["Content"]
        })
      ]
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("not found"));
    warnSpy.mockRestore();
  });

  test("type='append' inserts at end (default)", () => {
    document.querySelector("#modal-root")!.innerHTML = "<span>Existing</span>";

    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          children: [{ tag: "span", children: ["Last"] }]
        })
      ]
    });

    expect(document.querySelector("#modal-root")?.lastElementChild?.textContent).toBe("Last");
  });

  test("type='prepend' inserts at start", () => {
    document.querySelector("#modal-root")!.innerHTML = "<span>Existing</span>";

    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          type: "prepend",
          children: [{ tag: "span", children: ["First"] }]
        })
      ]
    });

    expect(document.querySelector("#modal-root")?.firstElementChild?.textContent).toBe("First");
  });

  test("type='replace' replaces content", () => {
    document.querySelector("#modal-root")!.innerHTML = "<span>Old</span>";

    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          type: "replace",
          children: [{ tag: "span", children: ["New"] }]
        })
      ]
    });

    expect(document.querySelector("#modal-root")?.textContent).toBe("New");
    expect(document.querySelector("#modal-root")?.children.length).toBe(1);
  });

  test("type='before' inserts before target", () => {
    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          type: "before",
          children: [{ tag: "span", children: ["Before"] }]
        })
      ]
    });

    const modalRoot = document.querySelector("#modal-root");
    expect(modalRoot?.previousElementSibling?.textContent).toBe("Before");
  });

  test("type='after' inserts after target", () => {
    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          type: "after",
          children: [{ tag: "span", children: ["After"] }]
        })
      ]
    });

    const modalRoot = document.querySelector("#modal-root");
    expect(modalRoot?.nextElementSibling?.textContent).toBe("After");
  });

  test("renders multiple children", () => {
    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          children: [
            { tag: "div", children: ["A"] },
            { tag: "div", children: ["B"] }
          ]
        })
      ]
    });

    expect(document.querySelector("#modal-root")?.children.length).toBe(2);
    expect(document.querySelector("#modal-root")?.textContent).toBe("AB");
  });

  test("reactive content updates correctly", () => {
    const text = signal("initial");

    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          children: [text]
        })
      ]
    });

    expect(document.querySelector("#modal-root")?.textContent).toBe("initial");

    text("updated");
    flush();

    expect(document.querySelector("#modal-root")?.textContent).toBe("updated");
  });

  test("works with nested HellaNodes", () => {
    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          children: [{
            tag: "div",
            props: { class: "modal" },
            children: [
              { tag: "h1", children: ["Title"] },
              { tag: "p", children: ["Content"] }
            ]
          }]
        })
      ]
    });

    expect(document.querySelector("#modal-root .modal h1")?.textContent).toBe("Title");
    expect(document.querySelector("#modal-root .modal p")?.textContent).toBe("Content");
  });

  test("multiple portals to same target", () => {
    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          children: [{ tag: "span", children: ["First"] }]
        }),
        Portal({
          to: "#modal-root",
          children: [{ tag: "span", children: ["Second"] }]
        })
      ]
    });

    const spans = document.querySelectorAll("#modal-root span");
    expect(spans.length).toBe(2);
    expect(spans[0]?.textContent).toBe("First");
    expect(spans[1]?.textContent).toBe("Second");
  });

  test("portal with empty children", () => {
    mount({
      tag: "div",
      children: [
        Portal({
          to: "#modal-root",
          children: []
        })
      ]
    });

    expect(document.querySelector("#modal-root")?.children.length).toBe(0);
    expect(document.querySelector("#app")?.innerHTML).toContain("<!--portal-->");
  });

  test("cleans up portal content when marker is removed", () => {
    mount({
      tag: "div",
      props: { id: "wrapper" },
      children: [
        Portal({
          to: "#modal-root",
          children: [{ tag: "span", props: { id: "portal-span" }, children: ["Content"] }]
        })
      ]
    });

    // Verify portal content exists
    expect(document.querySelector("#modal-root #portal-span")).toBeTruthy();

    // Get the wrapper and find the portal marker (comment node)
    const wrapper = document.querySelector("#wrapper")!;
    const marker = wrapper.firstChild as HellaElement;

    // Verify marker has cleanup function
    expect(marker.__hella_portal_cleanup).toBeDefined();

    // Remove marker from wrapper (disconnects it)
    marker.remove();

    // Queue the marker directly for cleanup processing
    queueCleanup(marker);

    // Portal content should be removed from target
    expect(document.querySelector("#modal-root #portal-span")).toBeNull();
    expect(document.querySelector("#modal-root")?.children.length).toBe(0);
  });
});

describe("Portal with html``", () => {
  test("works with html tagged template", () => {
    mount(html`
      <div>
        <${Portal} to="#modal-root">
          <span>Portal via html</span>
        </${Portal}>
      </div>
    `);

    expect(document.querySelector("#modal-root span")?.textContent).toBe("Portal via html");
  });

  test("supports type prop in html template", () => {
    document.querySelector("#modal-root")!.innerHTML = "<span>Existing</span>";

    mount(html`
      <div>
        <${Portal} to="#modal-root" type="prepend">
          <span>First</span>
        </${Portal}>
      </div>
    `);

    expect(document.querySelector("#modal-root")?.firstElementChild?.textContent).toBe("First");
  });

  test("supports reactive children in html template", () => {
    const content = signal("initial");

    mount(html`
      <div>
        <${Portal} to="#modal-root">
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
