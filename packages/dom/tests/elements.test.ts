import { describe, test, expect, beforeEach } from "bun:test";
import { elements } from "../";
import { signal, flush } from "@hellajs/core";

beforeEach(() => {
  document.body.innerHTML = `
    <div class="multiple">Item 1</div>
    <div class="multiple">Item 2</div>
    <div class="multiple">Item 3</div>
  `;
});

describe("elements", () => {
  test("selects multiple elements", () => {
    const elementsWrapper = elements(".multiple");
    expect(elementsWrapper.length).toBe(3);
    expect(elementsWrapper[0]?.node?.textContent).toBe("Item 1");
    expect(elementsWrapper[1]?.node?.textContent).toBe("Item 2");
    expect(elementsWrapper[2]?.node?.textContent).toBe("Item 3");
  });

  test("returns empty array for non-existent elements", () => {
    const elementsWrapper = elements(".nonexistent");
    expect(elementsWrapper.length).toBe(0);
  });

  test("forEach with reactive elements", () => {
    const elementsWrapper = elements(".multiple");

    elementsWrapper.forEach((elem, index) => {
      elem.text(`Item ${index + 1} - Updated`)
        .attr({ "data-index": index.toString() });
    });

    const nodes = document.querySelectorAll(".multiple");
    expect(nodes[0]?.textContent).toBe("Item 1 - Updated");
    expect(nodes[0]?.getAttribute("data-index")).toBe("0");
    expect(nodes[1]?.textContent).toBe("Item 2 - Updated");
    expect(nodes[1]?.getAttribute("data-index")).toBe("1");
    expect(nodes[2]?.textContent).toBe("Item 3 - Updated");
    expect(nodes[2]?.getAttribute("data-index")).toBe("2");
  });

  test("forEach returns array for chaining", () => {
    const elementsWrapper = elements(".multiple");

    const result = elementsWrapper
      .forEach((elem, i) => elem.attr({ id: `item-${i}` }));

    expect(result).toBe(elementsWrapper);
    expect(document.getElementById("item-0")).toBeTruthy();
    expect(document.getElementById("item-1")).toBeTruthy();
    expect(document.getElementById("item-2")).toBeTruthy();
  });

  test("reactive signals work with forEach on multiple elements", () => {
    const elementsWrapper = elements(".multiple");
    const status = signal("loading");

    elementsWrapper.forEach(elem => elem.text(() => `Status: ${status()}`));

    expect(document.querySelectorAll(".multiple")[0]?.textContent).toBe("Status: loading");
    expect(document.querySelectorAll(".multiple")[1]?.textContent).toBe("Status: loading");
    expect(document.querySelectorAll(".multiple")[2]?.textContent).toBe("Status: loading");

    status("ready");
    flush();

    expect(document.querySelectorAll(".multiple")[0]?.textContent).toBe("Status: ready");
    expect(document.querySelectorAll(".multiple")[1]?.textContent).toBe("Status: ready");
    expect(document.querySelectorAll(".multiple")[2]?.textContent).toBe("Status: ready");
  });
});
