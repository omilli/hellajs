import { describe, test, expect, beforeEach } from "bun:test";
import { addRegistryEffect, addRegistryEvent, getRegistryHandlers } from "../lib/registry";

const EFFECTS_KEY = "__hella_effects";
const HANDLERS_KEY = "__hella_handlers";

beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("registry", () => {
  test("addRegistryEffect stores effects on element", () => {
    const element = document.createElement("div") as any;
    document.body.appendChild(element);

    let effectRunCount = 0;
    addRegistryEffect(element, () => {
      effectRunCount++;
    });

    expect(element[EFFECTS_KEY]).toBeDefined();
    expect(element[EFFECTS_KEY].size).toBe(1);
  });

  test("addRegistryEvent stores handlers on element", () => {
    const element = document.createElement("div") as any;
    const handler = () => { };

    addRegistryEvent(element, "click", handler);

    expect(element[HANDLERS_KEY]).toBeDefined();
    expect(element[HANDLERS_KEY].click).toBe(handler);
  });

  test("getRegistryHandlers retrieves handlers from element", () => {
    const element = document.createElement("div");
    const handler = () => { };

    addRegistryEvent(element, "click", handler);

    const handlers = getRegistryHandlers(element);
    expect(handlers).toBeDefined();
    expect(handlers?.click).toBe(handler);
  });

  test("automatic cleanup when nodes are disconnected from DOM", async () => {
    const element = document.createElement("div") as any;
    document.body.appendChild(element);

    addRegistryEffect(element, () => { });
    addRegistryEvent(element, "click", () => { });

    expect(element[EFFECTS_KEY]).toBeDefined();
    expect(element[HANDLERS_KEY]).toBeDefined();

    element.remove();

    // Wait for mutation observer + cleanup
    await new Promise(resolve => setTimeout(resolve, 10));
    flush();

    expect(element[EFFECTS_KEY]).toBeUndefined();
    expect(element[HANDLERS_KEY]).toBeUndefined();
  });

  test("handles nodes with effects but no events", () => {
    const element = document.createElement("div") as any;
    addRegistryEffect(element, () => { });

    expect(element[EFFECTS_KEY]).toBeDefined();
    expect(element[HANDLERS_KEY]).toBeUndefined();
  });

  test("handles nodes with events but no effects", () => {
    const element = document.createElement("div") as any;
    addRegistryEvent(element, "click", () => { });

    expect(element[HANDLERS_KEY]).toBeDefined();
    expect(element[EFFECTS_KEY]).toBeUndefined();
  });

  test("multiple event types on same element", () => {
    const element = document.createElement("div");
    const clickHandler = () => { };
    const mousedownHandler = () => { };

    addRegistryEvent(element, "click", clickHandler);
    addRegistryEvent(element, "mousedown", mousedownHandler);

    const handlers = getRegistryHandlers(element);
    expect(handlers?.click).toBe(clickHandler);
    expect(handlers?.mousedown).toBe(mousedownHandler);
  });

  test("addRegistryEffect guards against non-function values", () => {
    const element = document.createElement("div") as any;
    document.body.appendChild(element);

    addRegistryEffect(element, undefined as any);
    expect(element[EFFECTS_KEY]).toBeUndefined();

    addRegistryEffect(element, null as any);
    expect(element[EFFECTS_KEY]).toBeUndefined();

    addRegistryEffect(element, "not a function" as any);
    expect(element[EFFECTS_KEY]).toBeUndefined();

    addRegistryEffect(element, 123 as any);
    expect(element[EFFECTS_KEY]).toBeUndefined();

    addRegistryEffect(element, {} as any);
    expect(element[EFFECTS_KEY]).toBeUndefined();

    // Test that valid function still works
    addRegistryEffect(element, () => { });
    expect(element[EFFECTS_KEY]?.size).toBe(1);
  });
});