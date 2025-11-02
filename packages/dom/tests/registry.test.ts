import { describe, test, expect, beforeEach } from "bun:test";
import { mount } from "../";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("registry", () => {
  test("effects run when component is mounted", () => {
    let effectRuns = 0;
    const count = signal(0);

    mount({
      tag: "div",
      props: {
        id: "test",
        effects: [() => {
          effectRuns++;
          count();
        }]
      },
      children: []
    });

    expect(effectRuns).toBe(1);

    count(1);
    flush();
    expect(effectRuns).toBe(2);
  });

  test("effects track reactive dependencies", () => {
    let tracked = 0;
    const count = signal(5);

    mount({
      tag: "div",
      props: {
        id: "reactive",
        effects: [() => {
          tracked = count();
        }]
      },
      children: []
    });

    expect(tracked).toBe(5);

    count(10);
    flush();
    expect(tracked).toBe(10);
  });

  test("event handlers fire correctly", () => {
    let clicked = 0;

    mount({
      tag: "button",
      props: {
        id: "btn",
        onclick: () => clicked++
      },
      children: ["Click"]
    });

    const button = document.getElementById("btn")!;
    button.dispatchEvent(new Event("click"));
    expect(clicked).toBe(1);

    button.dispatchEvent(new Event("click"));
    expect(clicked).toBe(2);
  });

  test("multiple event types on same element", () => {
    let clicks = 0;
    let hovers = 0;

    mount({
      tag: "div",
      props: {
        id: "multi",
        onclick: () => clicks++,
        onmouseenter: () => hovers++
      },
      children: []
    });

    const element = document.getElementById("multi")!;
    element.dispatchEvent(new Event("click"));
    expect(clicks).toBe(1);
    expect(hovers).toBe(0);

    element.dispatchEvent(new Event("mouseenter"));
    expect(clicks).toBe(1);
    expect(hovers).toBe(1);
  });

  test("onDestroy hook is stored on element", () => {
    let destroyed = 0;

    mount({
      tag: "div",
      props: {
        id: "destroyable",
        onDestroy: () => destroyed++
      },
      children: []
    });

    const element = document.getElementById("destroyable") as any;
    expect(element.onDestroy).toBeDefined();

    element.onDestroy();
    expect(destroyed).toBe(1);
  });

  test("effects with conditional rendering", () => {
    let effectValue = 0;
    const show = signal(true);
    const count = signal(0);

    mount(() => ({
      tag: "div",
      props: { id: "conditional" },
      children: [
        () => show() ? {
          tag: "span",
          props: {
            effects: [() => {
              effectValue = count();
            }]
          },
          children: ["visible"]
        } : null
      ]
    }));

    expect(effectValue).toBe(0);

    count(5);
    flush();
    expect(effectValue).toBe(5);

    show(false);
    flush();
    expect(document.querySelector("span")).toBeNull();
  });

  test("multiple effects on same element", () => {
    let effect1Runs = 0;
    let effect2Runs = 0;

    mount({
      tag: "div",
      props: {
        id: "multi-effects",
        effects: [
          () => effect1Runs++,
          () => effect2Runs++
        ]
      },
      children: []
    });

    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);
  });

  test("onUpdate hook fires on reactive changes", () => {
    let updates = 0;
    const count = signal(0);

    mount(() => ({
      tag: "div",
      props: {
        id: "update-test",
        onUpdate: () => updates++
      },
      children: [count]
    }));

    count(1);
    flush();
    expect(updates).toBeGreaterThan(0);

    count(2);
    flush();
    expect(updates).toBeGreaterThan(1);
  });
});