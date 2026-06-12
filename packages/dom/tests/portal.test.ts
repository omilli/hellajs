import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, Portal, queueCleanup } from "@hellajs/dom/bundle";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  resetTestState('<div id="app"></div><div id="modal-root"></div>');
});

describe("dom", () => {
  describe("Portal", () => {
    test("renders to target with insert types", () => {
      document.querySelector("#modal-root")!.innerHTML = "<span>Existing</span>";

      mount(html`<div><${Portal} to="#modal-root"><b>Last</b></${Portal}></div>`);
      expect(document.querySelector("#modal-root")?.lastElementChild?.textContent).toBe("Last");

      document.querySelector("#modal-root")!.innerHTML = "<span>Existing</span>";
      mount(html`<div><${Portal} to="#modal-root" type="prepend"><b>First</b></${Portal}></div>`);
      expect(document.querySelector("#modal-root")?.firstElementChild?.textContent).toBe("First");

      document.querySelector("#modal-root")!.innerHTML = "<span>Old</span>";
      mount(html`<div><${Portal} to="#modal-root" type="replace"><b>New</b></${Portal}></div>`);
      expect(document.querySelector("#modal-root")?.textContent).toBe("New");

      resetTestState('<div id="app"></div><div id="target"></div>');
      mount(html`<div><${Portal} to="#target" type="before"><b>Before</b></${Portal}></div>`);
      expect(document.querySelector("#target")?.previousElementSibling?.textContent).toBe("Before");

      resetTestState('<div id="app"></div><div id="target"></div>');
      mount(html`<div><${Portal} to="#target" type="after"><b>After</b></${Portal}></div>`);
      expect(document.querySelector("#target")?.nextElementSibling?.textContent).toBe("After");
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

    test("cleans up when marker removed", () => {
      resetTestState('<div id="app"></div><div id="modal-root"></div>');

      mount(html`
        <div id="wrapper">
          <${Portal} to="#modal-root">
            <span id="portal-span">Content</span>
          </${Portal}>
        </div>
      `);

      expect(document.querySelector("#modal-root #portal-span")).not.toBeNull();

      const wrapper = document.querySelector("#wrapper")!;
      const marker = wrapper.firstChild as HellaElement;
      marker.remove();
      queueCleanup(marker);

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

      // Portal effect fires during mount, querySelector returns null
      expect(() => {
        mount(html`
          <div>
            <${Portal} to="#nonexistent">
              <span>Content</span>
            </${Portal}>
          </div>
        `);
      }).toThrow();
    });
  });
});
