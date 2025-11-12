import { describe, test, expect, beforeEach } from "bun:test";
import { mount } from "../";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("registry", () => {
  test("event handlers fire correctly", () => {
    let clicked = 0;

    mount(() => ({
      tag: "button",
      props: {
        id: "btn",
        onclick: () => clicked++
      },
      children: ["Click"]
    }));

    const button = document.getElementById("btn")!;
    button.dispatchEvent(new Event("click"));
    expect(clicked).toBe(1);

    button.dispatchEvent(new Event("click"));
    expect(clicked).toBe(2);
  });

  test("multiple event types on same element", () => {
    let clicks = 0;
    let hovers = 0;

    mount(() => ({
      tag: "div",
      props: {
        id: "multi",
        onclick: () => clicks++,
        onmouseenter: () => hovers++
      },
      children: []
    }));

    const element = document.getElementById("multi")!;
    element.dispatchEvent(new Event("click"));
    expect(clicks).toBe(1);
    expect(hovers).toBe(0);

    element.dispatchEvent(new Event("mouseenter"));
    expect(clicks).toBe(1);
    expect(hovers).toBe(1);
  });
});