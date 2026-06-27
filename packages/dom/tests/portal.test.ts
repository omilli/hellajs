import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, Portal } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState('<div id="app"></div><div id="modal-root"></div>');
});

describe("dom", () => {
  describe("Portal", () => {
    type InsertType = "append" | "prepend" | "replace" | "before" | "after";
    const getResult: Record<InsertType, (target: string) => string | null | undefined> = {
      append: (target) => document.querySelector(target)?.lastElementChild?.textContent,
      prepend: (target) => document.querySelector(target)?.firstElementChild?.textContent,
      replace: (target) => document.querySelector(target)?.textContent,
      before: (target) => document.querySelector(target)?.previousElementSibling?.textContent,
      after: (target) => document.querySelector(target)?.nextElementSibling?.textContent,
    };

    test.each([
      { name: "append", initial: '<div id="app"></div><div id="modal-root"><span>Existing</span></div>', target: "#modal-root", type: "append" as const, expected: "Last" },
      { name: "prepend", initial: '<div id="app"></div><div id="modal-root"><span>Existing</span></div>', target: "#modal-root", type: "prepend", expected: "First" },
      { name: "replace", initial: '<div id="app"></div><div id="modal-root"><span>Old</span></div>', target: "#modal-root", type: "replace", expected: "New" },
      { name: "before", initial: '<div id="app"></div><div id="target"></div>', target: "#target", type: "before", expected: "Before" },
      { name: "after", initial: '<div id="app"></div><div id="target"></div>', target: "#target", type: "after", expected: "After" },
    ] as const)("renders target with $name insert type", ({ initial, target, type, expected }) => {
      resetTestState(initial);
      const portal = type === "append"
        ? html`<div><${Portal} to=${target}><b>${expected}</b></${Portal}></div>`
        : html`<div><${Portal} to=${target} type=${type}><b>${expected}</b></${Portal}></div>`;
      mount(portal);
      expect(getResult[type](target)).toBe(expected);
    });

    test("reactive content updates", () => {
      resetTestState('<div id="app"></div><div id="modal-root"></div>');
      const text = signal("initial");

      mount(html`<div><${Portal} to="#modal-root">${text}</${Portal}></div>`);
      expect(document.querySelector("#modal-root")?.textContent).toBe("initial");

      text("updated");
      flush();
      expect(document.querySelector("#modal-root")?.textContent).toBe("updated");
    });

    test("preserves DOM nodes across signal updates", () => {
      resetTestState('<div id="app"></div><div id="modal-root"></div>');
      const text = signal("initial");

      mount(html`<div><${Portal} to="#modal-root">${text}</${Portal}></div>`);

      const nodeBefore = document.querySelector("#modal-root")!.firstChild!;
      expect(nodeBefore.textContent).toBe("initial");

      text("updated");
      flush();

      const nodeAfter = document.querySelector("#modal-root")!.firstChild!;
      expect(nodeAfter.textContent).toBe("updated");
      expect(nodeAfter).toBe(nodeBefore);
    });

    test("cleans up when marker removed", () => {
      resetTestState('<div id="app"></div><div id="modal-root"></div>');

      const app = mount(html`
        <div id="wrapper">
          <${Portal} to="#modal-root">
            <span id="portal-span">Content</span>
          </${Portal}>
        </div>
      `);

      expect(document.querySelector("#modal-root #portal-span")).not.toBeNull();

      app.unmount();

      expect(document.querySelector("#modal-root #portal-span")).toBeNull();
    });

    test("works with html templates", () => {
      resetTestState('<div id="app"></div><div id="modal-root"></div>');
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

    test("multiple portals to same target", () => {
      resetTestState('<div id="app"></div><div id="target"></div>');
      const a = signal("A");
      const b = signal("B");

      mount(html`
        <div>
          <${Portal} to="#target"><span id="pa">${a}</span></${Portal}>
          <${Portal} to="#target"><span id="pb">${b}</span></${Portal}>
        </div>
      `);

      const target = document.querySelector("#target")!;
      expect(target.querySelector("#pa")?.textContent).toBe("A");
      expect(target.querySelector("#pb")?.textContent).toBe("B");

      a("X");
      flush();
      expect(target.querySelector("#pa")?.textContent).toBe("X");
      expect(target.querySelector("#pb")?.textContent).toBe("B");
    });

    test("replace type with multiple children", () => {
      resetTestState('<div id="app"></div><div id="target"><p>Old 1</p><p>Old 2</p></div>');

      mount(html`
        <div>
          <${Portal} to="#target" type="replace">
            <span>New A</span>
            <span>New B</span>
            <span>New C</span>
          </${Portal}>
        </div>
      `);

      const target = document.querySelector("#target")!;
      expect(target.querySelectorAll("p").length).toBe(0);
      expect(target.querySelectorAll("span").length).toBe(3);
      expect(target.textContent).toBe("New ANew BNew C");
    });

    test("renders inside reactive conditional", () => {
      resetTestState('<div id="app"></div><div id="modal-root"></div>');
      const show = signal(true);

      mount(html`
        <div>
          ${() => show() && html`<${Portal} to="#modal-root"><span id="cond-portal">Conditional</span></${Portal}>`}
        </div>
      `);

      expect(document.querySelector("#modal-root #cond-portal")).not.toBeNull();

      // Toggle off - portal marker is removed synchronously, doesn't crash
      show(false);
      flush();
    });

    test("throws when target does not exist", () => {
      resetTestState('<div id="app"></div>');

      expect(() => {
        mount(html`
          <div>
            <${Portal} to="#nonexistent">
              <span>Content</span>
            </${Portal}>
          </div>
        `);
      }).toThrow('[dom] Portal: target "#nonexistent" not found in document');
    });
  });
});
