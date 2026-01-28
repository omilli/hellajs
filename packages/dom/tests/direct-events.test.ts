import { describe, test, expect, beforeEach } from "bun:test";
import { mount, html, queueCleanup } from "@hellajs/dom/bundle";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("direct (non-delegated) events with e: prefix", () => {
  test("e:click attaches handler directly to element", () => {
    let clickCount = 0;
    mount({
      tag: "button",
      props: { id: "btn" },
      e: { click: () => clickCount++ },
      children: ["Click"]
    });

    const btn = document.getElementById("btn") as HTMLButtonElement;
    btn.click();
    expect(clickCount).toBe(1);
  });

  test("e: handlers are cleaned up on removal", () => {
    let clickCount = 0;
    mount({
      tag: "div",
      props: { id: "container" },
      e: { click: () => clickCount++ },
      children: ["Content"]
    });

    const container = document.getElementById("container")!;
    container.click();
    expect(clickCount).toBe(1);

    container.remove();
    queueCleanup(container);

    container.click();
    expect(clickCount).toBe(1);
  });

  test("e: and on: can coexist on same element", () => {
    let directCount = 0;
    let delegatedCount = 0;

    mount({
      tag: "button",
      props: { id: "btn" },
      e: { click: () => directCount++ },
      on: { click: () => delegatedCount++ },
      children: ["Click"]
    });

    const btn = document.getElementById("btn")!;
    btn.click();
    expect(directCount).toBe(1);
    expect(delegatedCount).toBe(1);
  });

  test("e: handlers work with reactive children", () => {
    const count = signal(0);
    let clickCount = 0;

    mount({
      tag: "div",
      props: { id: "container" },
      e: { click: () => clickCount++ },
      children: [() => count()]
    });

    const container = document.getElementById("container")!;
    expect(container.textContent).toBe("0");

    count(5);
    expect(container.textContent).toBe("5");

    container.click();
    expect(clickCount).toBe(1);
  });

  test("e: handler replacement works correctly", () => {
    let firstCount = 0;
    let secondCount = 0;

    mount({
      tag: "div",
      props: { id: "test" },
      e: { click: () => firstCount++ },
      children: ["Test"]
    });

    let el = document.getElementById("test")!;
    el.click();
    expect(firstCount).toBe(1);
    expect(secondCount).toBe(0);

    mount({
      tag: "div",
      props: { id: "test" },
      e: { click: () => secondCount++ },
      children: ["Test"]
    });

    el = document.getElementById("test")!;
    el.click();
    expect(firstCount).toBe(1);
    expect(secondCount).toBe(1);
  });

  test("html template supports e: prefix", () => {
    let clickCount = 0;
    mount(html`<button e:click=${() => clickCount++}>Click Me</button>`);

    const btn = document.querySelector("button")!;
    btn.click();
    expect(clickCount).toBe(1);
  });

  test("multiple e: handlers on single element", () => {
    let clickCount = 0;
    let mouseEnterCount = 0;

    mount({
      tag: "div",
      props: { id: "test" },
      e: {
        click: () => clickCount++,
        mouseenter: () => mouseEnterCount++
      },
      children: ["Test"]
    });

    const el = document.getElementById("test")!;
    el.click();
    el.dispatchEvent(new Event("mouseenter"));

    expect(clickCount).toBe(1);
    expect(mouseEnterCount).toBe(1);
  });

  test("html template with e: and on: on same element", () => {
    let directCount = 0;
    let delegatedCount = 0;

    mount(html`
      <button
        e:click=${() => directCount++}
        on:click=${() => delegatedCount++}
      >
        Click
      </button>
    `);

    const btn = document.querySelector("button")!;
    btn.click();

    expect(directCount).toBe(1);
    expect(delegatedCount).toBe(1);
  });

  test("html template with multiple e: handlers", () => {
    let clickCount = 0;
    let inputCount = 0;

    mount(html`
      <input
        type="text"
        e:click=${() => clickCount++}
        e:input=${() => inputCount++}
      />
    `);

    const input = document.querySelector("input")!;
    input.click();
    input.dispatchEvent(new Event("input"));

    expect(clickCount).toBe(1);
    expect(inputCount).toBe(1);
  });

  test("e: handlers with event object access", () => {
    let receivedEvent!: Event;

    mount({
      tag: "button",
      props: { id: "btn" },
      e: { click: (event: Event) => { receivedEvent = event; } },
      children: ["Click"]
    });

    const btn = document.getElementById("btn")!;
    btn.dispatchEvent(new Event("click"));

    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent?.type).toBe("click");
  });

  test("e: stopPropagation works correctly", () => {
    let parentCount = 0;
    let childCount = 0;

    mount({
      tag: "div",
      props: { id: "parent" },
      e: { click: () => parentCount++ },
      children: [
        {
          tag: "button",
          props: { id: "child" },
          e: { click: (event: Event) => { event.stopPropagation(); childCount++; } },
          children: ["Click"]
        }
      ]
    });

    const child = document.getElementById("child")!;
    child.click();

    expect(childCount).toBe(1);
    expect(parentCount).toBe(0);
  });

  test("nested elements with e: handlers", () => {
    let outerCount = 0;
    let innerCount = 0;

    mount({
      tag: "div",
      props: { id: "outer" },
      e: { click: () => outerCount++ },
      children: [
        {
          tag: "div",
          props: { id: "inner" },
          e: { click: () => innerCount++ },
          children: ["Inner"]
        }
      ]
    });

    const inner = document.getElementById("inner")!;
    inner.click();

    expect(innerCount).toBe(1);
    expect(outerCount).toBe(1);
  });
});
