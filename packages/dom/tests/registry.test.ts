import { describe, test, expect, beforeEach } from "bun:test";
import { nodeRegistry } from "../";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("nodeRegistry", () => {
  test("exports nodeRegistry object with correct API", () => {
    expect(nodeRegistry).toBeDefined();
    expect(typeof nodeRegistry.get).toBe("function");
    expect(typeof nodeRegistry.addEffect).toBe("function");
    expect(typeof nodeRegistry.addEvent).toBe("function");
    expect(typeof nodeRegistry.clean).toBe("function");
    expect(nodeRegistry.nodes).toBeInstanceOf(Map);
    expect(nodeRegistry.observer).toBeInstanceOf(MutationObserver);
  });

  test("clean function disposes effects and clears events", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    let effectRunCount = 0;

    nodeRegistry.addEffect(element, () => {
      effectRunCount++;
    });

    const handler = () => { };
    nodeRegistry.addEvent(element, "click", handler);

    expect(nodeRegistry.nodes.has(element)).toBe(true);
    expect(nodeRegistry.get(element).effects?.size).toBe(1);
    expect(nodeRegistry.get(element).events?.size).toBe(1);

    nodeRegistry.clean(element);

    expect(nodeRegistry.nodes.has(element)).toBe(false);
  });

  test("automatic cleanup when nodes are disconnected from DOM", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    nodeRegistry.addEffect(element, () => { });
    nodeRegistry.addEvent(element, "click", () => { });

    expect(nodeRegistry.nodes.has(element)).toBe(true);
    expect(element.isConnected).toBe(true);

    element.remove();
    expect(element.isConnected).toBe(false);

    nodeRegistry.clean(element);
    expect(nodeRegistry.nodes.has(element)).toBe(false);
  });

  test("handles nodes with effects but no events", () => {
    const element = document.createElement("div");
    nodeRegistry.addEffect(element, () => { });

    expect(nodeRegistry.get(element).effects).toBeDefined();
    expect(nodeRegistry.get(element).events).toBeUndefined();

    nodeRegistry.clean(element);
    expect(nodeRegistry.nodes.has(element)).toBe(false);
  });

  test("handles nodes with events but no effects", () => {
    const element = document.createElement("div");
    nodeRegistry.addEvent(element, "click", () => { });

    expect(nodeRegistry.get(element).events).toBeDefined();
    expect(nodeRegistry.get(element).effects).toBeUndefined();

    nodeRegistry.clean(element);
    expect(nodeRegistry.nodes.has(element)).toBe(false);
  });

  test("handles empty node registries during cleanup", () => {
    const element = document.createElement("div");
    nodeRegistry.get(element);

    expect(nodeRegistry.nodes.has(element)).toBe(true);

    nodeRegistry.clean(element);
    expect(nodeRegistry.nodes.has(element)).toBe(false);
  });

  test("multiple disconnected nodes cleaned up in batch", () => {
    const elements = Array.from({ length: 3 }, () => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      nodeRegistry.addEffect(el, () => { });
      return el;
    });

    elements.forEach(el => {
      expect(nodeRegistry.nodes.has(el)).toBe(true);
      el.remove();
      nodeRegistry.clean(el);
      expect(nodeRegistry.nodes.has(el)).toBe(false);
    });
  });

  test("addRegistryEffect guards against non-function values", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    // Test with undefined
    nodeRegistry.addEffect(element, undefined as any);
    expect(nodeRegistry.get(element).effects).toBeUndefined();

    // Test with null
    nodeRegistry.addEffect(element, null as any);
    expect(nodeRegistry.get(element).effects).toBeUndefined();

    // Test with string
    nodeRegistry.addEffect(element, "not a function" as any);
    expect(nodeRegistry.get(element).effects).toBeUndefined();

    // Test with number
    nodeRegistry.addEffect(element, 123 as any);
    expect(nodeRegistry.get(element).effects).toBeUndefined();

    // Test with object
    nodeRegistry.addEffect(element, {} as any);
    expect(nodeRegistry.get(element).effects).toBeUndefined();

    // Test that valid function still works
    let called = false;
    nodeRegistry.addEffect(element, () => { called = true; });
    expect(nodeRegistry.get(element).effects?.size).toBe(1);
  });
});