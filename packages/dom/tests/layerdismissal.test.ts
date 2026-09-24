import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { layerDismissal } from "@hellajs/dom/bundle";
import { pointerDown, pressKey } from "./helpers";

describe("layerDismissal", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("Escape dismisses only the top layer", () => {
    const onDismissOne = mock(() => {});
    const onDismissTwo = mock(() => {});
    const panelOne = document.createElement("div");
    const panelTwo = document.createElement("div");
    document.body.append(panelOne, panelTwo);
    const disposeOne = layerDismissal(() => [panelOne], onDismissOne);
    const disposeTwo = layerDismissal(() => [panelTwo], onDismissTwo);

    pressKey(document.body, "Escape");
    expect(onDismissTwo).toHaveBeenCalledTimes(1);
    expect(onDismissOne).not.toHaveBeenCalled();
    disposeOne();
    disposeTwo();
  });

  test("the lower layer becomes top once the top disposes", () => {
    const onDismissOne = mock(() => {});
    const onDismissTwo = mock(() => {});
    const panelOne = document.createElement("div");
    const panelTwo = document.createElement("div");
    document.body.append(panelOne, panelTwo);
    const disposeOne = layerDismissal(() => [panelOne], onDismissOne);
    const disposeTwo = layerDismissal(() => [panelTwo], onDismissTwo);

    disposeTwo();
    pressKey(document.body, "Escape");
    expect(onDismissOne).toHaveBeenCalledTimes(1);
    disposeOne();
  });

  test("an outside pointerdown dismisses only the top layer", () => {
    const onDismissOne = mock(() => {});
    const onDismissTwo = mock(() => {});
    const panelOne = document.createElement("div");
    const panelTwo = document.createElement("div");
    document.body.append(panelOne, panelTwo);
    const disposeOne = layerDismissal(() => [panelOne], onDismissOne);
    const disposeTwo = layerDismissal(() => [panelTwo], onDismissTwo);

    const stray = document.createElement("div");
    document.body.append(stray);
    pointerDown(stray);
    expect(onDismissTwo).toHaveBeenCalledTimes(1);
    expect(onDismissOne).not.toHaveBeenCalled();
    disposeOne();
    disposeTwo();
  });

  test("a pointerdown inside the top layer's nodes dismisses nothing", () => {
    const onDismissOne = mock(() => {});
    const onDismissTwo = mock(() => {});
    const panelOne = document.createElement("div");
    const panelTwo = document.createElement("div");
    document.body.append(panelOne, panelTwo);
    const disposeOne = layerDismissal(() => [panelOne], onDismissOne);
    const disposeTwo = layerDismissal(() => [panelTwo], onDismissTwo);

    pointerDown(panelTwo);
    expect(onDismissOne).not.toHaveBeenCalled();
    expect(onDismissTwo).not.toHaveBeenCalled();
    disposeOne();
    disposeTwo();
  });

  test("requires nodes and onDismiss", () => {
    expect(() => layerDismissal(null as never, () => {})).toThrow("[dom] layerDismissal: nodes is required");
    expect(() => layerDismissal(() => [], null as never)).toThrow("[dom] layerDismissal: onDismiss is required");
  });
});
