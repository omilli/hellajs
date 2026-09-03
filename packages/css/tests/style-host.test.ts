import { describe, expect, test, beforeEach } from "bun:test";
import { resetTestState, getStylesheet, getHostStylesheet } from "@utils/test-helpers.js";
import { css, removeCss, resetCss, vars } from "@hellajs/css/bundle";
import { createShadowHost } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("css style host", () => {
  test("css with host creates the style element inside the host, not the document head", () => {
    const shadowRoot = createShadowHost();

    css({ body: { margin: "0" }, "*": { boxSizing: "border-box" } }, { host: shadowRoot });

    expect(shadowRoot.querySelectorAll("style").length).toBe(1);
    expect(getHostStylesheet(shadowRoot)).toBe("body{margin:0px}*{box-sizing:border-box}");
    expect(document.getElementById("hella-css")).toBeNull();
  });

  test("same text in two hosts styles both with independent reference counts", () => {
    const first = createShadowHost();
    const second = createShadowHost();
    const styles = { body: { margin: "0" } };

    css(styles, { host: first });
    css(styles, { host: second });

    expect(getHostStylesheet(first)).toBe("body{margin:0px}");
    expect(getHostStylesheet(second)).toBe("body{margin:0px}");

    removeCss(styles, { host: first });

    expect(getHostStylesheet(first)).toBe("");
    expect(getHostStylesheet(second)).toBe("body{margin:0px}");
  });

  test("removeCss with host removes from that host's sheet at zero refs", () => {
    const shadowRoot = createShadowHost();
    const styles = { body: { margin: "0" } };

    css(styles, { host: shadowRoot });
    css(styles, { host: shadowRoot });
    removeCss(styles, { host: shadowRoot });
    expect(getHostStylesheet(shadowRoot)).toBe("body{margin:0px}");

    removeCss(styles, { host: shadowRoot });
    expect(getHostStylesheet(shadowRoot)).toBe("");
  });

  test("removing a multi-rule hosted text leaves later removals in the same host exact", () => {
    const shadowRoot = createShadowHost();
    const twoRules = { body: { margin: "0" }, "*": { boxSizing: "border-box" } };
    const oneRule = { h1: { color: "green" } };

    css(twoRules, { host: shadowRoot });
    css(oneRule, { host: shadowRoot });

    removeCss(twoRules, { host: shadowRoot });
    expect(getHostStylesheet(shadowRoot)).toBe("h1{color:green}");

    removeCss(oneRule, { host: shadowRoot });
    expect(getHostStylesheet(shadowRoot)).toBe("");
  });

  test("vars with host writes into the host sheet and composes with :host scope", () => {
    const defaultScoped = createShadowHost();
    vars({ a: 1 }, { host: defaultScoped });
    expect(getHostStylesheet(defaultScoped)).toBe(":root{--a:1}");

    const hostScoped = createShadowHost();
    vars({ a: 1 }, { host: hostScoped, scoped: ":host" });
    expect(getHostStylesheet(hostScoped)).toBe(":host{--a:1}");
  });

  test("default path without host lands in the document head unchanged", () => {
    css({ body: { margin: "0" } });
    vars({ a: 1 });

    expect(getStylesheet("hella-css")).toBe("body{margin:0px}");
    expect(getStylesheet("hella-vars")).toBe(":root{--a:1}");
  });

  test("resetCss after hosted injection clears the default sheet without throwing", () => {
    const shadowRoot = createShadowHost();
    css({ body: { margin: "0" } }, { host: shadowRoot });
    css({ h1: { color: "blue" } });

    resetCss();

    expect(getStylesheet("hella-css")).toBe("");
  });

  test("reactive vars object re-registered with a different host throws", () => {
    const first = createShadowHost();
    const second = createShadowHost();
    const varsObj = { color: () => "red" };

    vars(varsObj, { host: first });

    expect(() => vars(varsObj, { host: second })).toThrow("[css] vars: reactive vars object already registered with different options");
  });
});
