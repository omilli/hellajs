import { describe, expect, test, beforeEach } from "bun:test";
import { resetTestState, getStylesheet, getHostStylesheet } from "@utils/test-helpers.js";
import { css, removeCss, resetCss, cssVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

function createShadowHost(): ShadowRoot {
  const el = document.createElement("shadow-host");
  document.body.appendChild(el);
  return el.attachShadow({ mode: "open" });
}

describe("css style host", () => {
  test("css with host creates the style element inside the host, not the document head", () => {
    const shadowRoot = createShadowHost();

    css({ color: "red" }, { name: "x", host: shadowRoot });

    expect(shadowRoot.querySelectorAll("style").length).toBe(1);
    expect(getHostStylesheet(shadowRoot)).toBe(".x{color:red}");
    expect(document.getElementById("hella-css")).toBeNull();
  });

  test("same text in two hosts styles both with independent reference counts", () => {
    const first = createShadowHost();
    const second = createShadowHost();
    const styles = { color: "red" };

    css(styles, { name: "x", host: first });
    css(styles, { name: "x", host: second });

    expect(getHostStylesheet(first)).toBe(".x{color:red}");
    expect(getHostStylesheet(second)).toBe(".x{color:red}");

    removeCss(styles, { name: "x", host: first });

    expect(getHostStylesheet(first)).toBe("");
    expect(getHostStylesheet(second)).toBe(".x{color:red}");
  });

  test("removeCss with host removes from that host's sheet at zero refs", () => {
    const shadowRoot = createShadowHost();
    const styles = { color: "red" };

    css(styles, { name: "x", host: shadowRoot });
    css(styles, { name: "x", host: shadowRoot });
    removeCss(styles, { name: "x", host: shadowRoot });
    expect(getHostStylesheet(shadowRoot)).toBe(".x{color:red}");

    removeCss(styles, { name: "x", host: shadowRoot });
    expect(getHostStylesheet(shadowRoot)).toBe("");
  });

  test("removing a multi-rule hosted text leaves later removals in the same host exact", () => {
    const shadowRoot = createShadowHost();
    const twoRules = { color: "red", "&:hover": { color: "blue" } };
    const oneRule = { color: "green" };

    css(twoRules, { name: "a", host: shadowRoot });
    css(oneRule, { name: "b", host: shadowRoot });

    removeCss(twoRules, { name: "a", host: shadowRoot });
    expect(getHostStylesheet(shadowRoot)).toBe(".b{color:green}");

    removeCss(oneRule, { name: "b", host: shadowRoot });
    expect(getHostStylesheet(shadowRoot)).toBe("");
  });

  test("cssVars with host writes into the host sheet and composes with :host scope", () => {
    const defaultScoped = createShadowHost();
    cssVars({ a: 1 }, { host: defaultScoped });
    expect(getHostStylesheet(defaultScoped)).toBe(":root{--a:1}");

    const hostScoped = createShadowHost();
    cssVars({ a: 1 }, { host: hostScoped, scoped: ":host" });
    expect(getHostStylesheet(hostScoped)).toBe(":host{--a:1}");
  });

  test("default path without host lands in the document head unchanged", () => {
    css({ color: "blue" }, { name: "d" });
    cssVars({ a: 1 });

    expect(getStylesheet("hella-css")).toBe(".d{color:blue}");
    expect(getStylesheet("hella-vars")).toBe(":root{--a:1}");
  });

  test("resetCss after hosted injection clears the default sheet without throwing", () => {
    const shadowRoot = createShadowHost();
    css({ color: "red" }, { name: "x", host: shadowRoot });
    css({ color: "blue" }, { name: "d" });

    resetCss();

    expect(getStylesheet("hella-css")).toBe("");
  });

  test("reactive vars object re-registered with a different host throws", () => {
    const first = createShadowHost();
    const second = createShadowHost();
    const vars = { color: () => "red" };

    cssVars(vars, { host: first });

    expect(() => cssVars(vars, { host: second })).toThrow("[css] cssVars: reactive vars object already registered with different options");
  });
});
