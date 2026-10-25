import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { effect, flush, signal } from "@hellajs/core";
import { delay, resetTestState, suppressConsole } from "@utils/test-helpers.js";
import { component, hasState, mount, onError, peekState, raw, registry } from "@hellajs/dom";
import {
  child,
  direct,
  errorConfig,
  fragment,
  hook,
  mark,
  on,
  prop,
  template,
  text,
} from "@hellajs/dom/runtime";
import "@hellajs/dom/features/direct-events";
import "@hellajs/dom/features/hooks";
import "@hellajs/dom/features/errors";
import type { ComponentFn, ErrorContext } from "@hellajs/dom";

/** The babel runtime-spread emission shape: every spread key funnels through `prop(anchor, k, source[k])`. */
const applySpread = (el: Element, source: Record<string, unknown>) => {
  Object.keys(source).forEach((k) => prop(el, k, source[k]));
};

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("runtime", () => {
    test("template caches one builder per html string and clones distinct state-initialized roots", () => {
      const html = `<div id="rt-a"><span class="lbl"></span></div>`;
      const build = template(html);
      expect(template(html)).toBe(build);
      const first = build();
      const second = build();
      expect(first).not.toBe(second);
      expect(first.isEqualNode(second)).toBe(true);
      expect(hasState(first)).toBe(true);
      let stateAtStart = false;
      mark(() => {
        const root = build();
        stateAtStart = hasState(root);
        return root;
      })();
      expect(stateAtStart).toBe(true);
      expect(() => template("plain text only")).toThrow(
        "[dom] template: html must contain a root element",
      );
      expect(() => template(42 as unknown as string)).toThrow(
        "[dom] template: html must be a string",
      );
      expect(() => mark(42 as unknown as () => Element)).toThrow(
        "[dom] mark: fn must be a function",
      );
    });

    test("template(html, ns) parses in the foreign namespace and caches per html+ns", () => {
      const SVG_NS = "http://www.w3.org/2000/svg";
      const html = `<circle id="rt-ns-direct" r="4"/>`;
      const build = template(html, SVG_NS);
      const host = document.createElementNS(SVG_NS, "svg");
      document.body.append(host);
      host.append(build());
      const el = document.getElementById("rt-ns-direct")!;
      expect(el.namespaceURI).toBe(SVG_NS);
      expect(el.constructor.name).toBe("SVGCircleElement");
      // Same html + ns reuses the cached builder; the same html without ns parses in HTML
      // context under a separate cache key.
      expect(template(html, SVG_NS)).toBe(build);
      expect(template(html)).not.toBe(build);
    });

    test("template(html) without ns parses in HTML context (backward-compatible arm)", () => {
      const root = template(`<div id="rt-ns-plain"/>`)();
      expect(root.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
      expect(root.constructor.name).toBe("HTMLDivElement");
    });

    test("fragment clones splay on append and state-inits the scope-carrying first child", () => {
      expect(() => fragment(null as unknown as string)).toThrow(
        "[dom] fragment: html must be a string",
      );
      const build = fragment(`<p id="rt-fp1"></p><i id="rt-fp2"></i>`);
      const clone = build();
      const host = document.createElement("div");
      host.appendChild(clone);
      expect(clone.childNodes.length).toBe(0);
      expect(host.children.length).toBe(2);
      expect(hasState(host.children[0]!)).toBe(true);
    });

    test("text renders static zero, updates reactive text in place, and disposes with the parent", async () => {
      const name = signal("a");
      mount(
        <div id="rt-text-host">
          <span id="rt-zero"></span>
          <span id="rt-live"></span>
        </div>,
      );
      text(document.getElementById("rt-zero")!, 0);
      expect(document.getElementById("rt-zero")!.textContent).toBe("0");
      const live = document.getElementById("rt-live")!;
      text(live, () => name());
      expect(live.textContent).toBe("a");
      name("b");
      flush();
      expect(live.textContent).toBe("b");
      document.getElementById("rt-text-host")!.remove();
      for (let i = 0; i < 50; i++) {
        if (peekState(live) === undefined) break;
        await delay();
      }
      expect(peekState(live)).toBeUndefined();
      name("c");
      flush();
      expect(live.textContent).toBe("b");
    });

    test("prop applies static values once and memoizes equal reactive runs", () => {
      mount(
        <div id="rt-prop-host">
          <span id="rt-prop"></span>
        </div>,
      );
      const el = document.getElementById("rt-prop")!;
      prop(el, "class", "static");
      expect(el.getAttribute("class")).toBe("static");
      prop(el, "data-kind", "fixed");
      expect(el.getAttribute("data-kind")).toBe("fixed");
      const theme = signal("red");
      const trigger = signal(0);
      let writes = 0;
      Object.defineProperty(el, "className", {
        set: () => {
          writes++;
        },
        get: () => "",
      });
      prop(el, "class", () => {
        trigger();
        return theme();
      });
      expect(writes).toBe(1);
      theme("blue");
      flush();
      expect(writes).toBe(2);
      trigger(1);
      flush();
      expect(writes).toBe(2);
    });

    test("on delegates dispatch, direct handlers fire, and hook fires at its lifecycle point", async () => {
      const clickTracker = vi.fn();
      const focusTracker = vi.fn();
      const mountTracker = vi.fn();
      const build = mark(() => {
        const root = template(`<button id="rt-btn" type="button">go</button>`)();
        on(root, "click", clickTracker);
        direct(root, "focus", focusTracker);
        hook(root, "afterMount", mountTracker);
        return root;
      });
      mount(<div id="rt-wire-host"></div>);
      child(document.getElementById("rt-wire-host")!, build);
      const btn = document.getElementById("rt-btn")!;
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(clickTracker).toHaveBeenCalledTimes(1);
      btn.dispatchEvent(new Event("focus"));
      expect(focusTracker).toHaveBeenCalledTimes(1);
      for (let i = 0; i < 50; i++) {
        if (mountTracker.mock.calls.length > 0) break;
        await delay();
      }
      expect(mountTracker).toHaveBeenCalledTimes(1);
    });

    test("prop routes a spread on:click handler: no invocation at wiring, exactly one on dispatch", () => {
      const clickTracker = vi.fn();
      const build = mark(() => {
        const root = template(`<button id="rt-spread-on" type="button">go</button>`)();
        applySpread(root, { "on:click": clickTracker });
        return root;
      });
      mount(<div id="rt-spread-on-host"></div>);
      child(document.getElementById("rt-spread-on-host")!, build);
      const btn = document.getElementById("rt-spread-on")!;
      expect(clickTracker).not.toHaveBeenCalled();
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(clickTracker).toHaveBeenCalledTimes(1);
    });

    test("prop routes a spread on:click emitted after an explicit on(): the spread wins", () => {
      const explicit = vi.fn();
      const forwarded = vi.fn();
      const build = mark(() => {
        const root = template(`<button id="rt-spread-win" type="button">go</button>`)();
        on(root, "click", explicit);
        applySpread(root, { "on:click": forwarded });
        return root;
      });
      mount(<div id="rt-spread-win-host"></div>);
      child(document.getElementById("rt-spread-win-host")!, build);
      document
        .getElementById("rt-spread-win")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(forwarded).toHaveBeenCalledTimes(1);
      expect(explicit).not.toHaveBeenCalled();
    });

    test("prop routes a spread e: key: the direct handler fires and a spec forwards its options", () => {
      const focusTracker = vi.fn();
      const onceTracker = vi.fn();
      const build = mark(() => {
        const root = template(`<input id="rt-spread-e">`)();
        applySpread(root, {
          "e:focus": focusTracker,
          "e:change": { handler: onceTracker, options: { once: true } },
        });
        return root;
      });
      mount(<div id="rt-spread-e-host"></div>);
      child(document.getElementById("rt-spread-e-host")!, build);
      const input = document.getElementById("rt-spread-e")!;
      input.dispatchEvent(new Event("focus"));
      expect(focusTracker).toHaveBeenCalledTimes(1);
      input.dispatchEvent(new Event("change"));
      input.dispatchEvent(new Event("change"));
      expect(onceTracker).toHaveBeenCalledTimes(1);
    });

    test("prop routes a spread hook:afterMount: fires at the lifecycle point, accumulative with an explicit hook", async () => {
      const spreadHook = vi.fn();
      const explicitHook = vi.fn();
      const build = mark(() => {
        const root = template(`<p id="rt-spread-hook">x</p>`)();
        hook(root, "afterMount", explicitHook);
        applySpread(root, { "hook:afterMount": spreadHook });
        return root;
      });
      mount(<div id="rt-spread-hook-host"></div>);
      child(document.getElementById("rt-spread-hook-host")!, build);
      for (let i = 0; i < 50; i++) {
        if (spreadHook.mock.calls.length > 0 && explicitHook.mock.calls.length > 0) break;
        await delay();
      }
      expect(spreadHook).toHaveBeenCalledTimes(1);
      expect(explicitHook).toHaveBeenCalledTimes(1);
    });

    test("prop routes a spread error: key: dispatch runs through the merged config and errorConfig's own build stays the reset target", () => {
      const suppressed = suppressConsole();
      try {
        const ownBuild = mark(() => template(`<b id="rt-err-own">own</b>`)());
        const spreadFallback = mark(() => template(`<i id="rt-err-fb">fallback</i>`)());
        let captured: ErrorContext | undefined;
        onError((_error, context) => {
          captured = context;
          return context.config?.fallback?.(_error) ?? null;
        });
        const shouldThrow = signal(false);
        const build = mark(() => {
          const root = template(`<div id="rt-err-boundary"><span id="rt-err-deep"></span></div>`)();
          errorConfig(root, { boundary: true }, ownBuild);
          applySpread(root, {
            "error:fallback": () => spreadFallback,
            "error:category": "spread",
          });
          const deep = root.children[0]!;
          prop(deep, "class", () => {
            if (shouldThrow()) throw new Error("boom");
            return "calm";
          });
          return root;
        });
        mount(<div id="rt-err-host"></div>);
        child(document.getElementById("rt-err-host")!, build);
        const boundaryEl = document.getElementById("rt-err-boundary")!;
        expect(peekState(boundaryEl)?.originalBuild).toBe(ownBuild);
        shouldThrow(true);
        flush();
        expect(captured?.config?.category).toBe("spread");
        expect(boundaryEl.querySelector("#rt-err-fb")).not.toBeNull();
        captured?.reset?.();
        expect(boundaryEl.querySelector("#rt-err-own")).not.toBeNull();
        expect(boundaryEl.querySelector("#rt-err-fb")).toBeNull();
      } finally {
        suppressed.restore();
      }
    });

    test("prop keeps non-family colon keys on the attribute path", () => {
      mount(
        <div id="rt-spread-colon-host">
          <a id="rt-spread-colon"></a>
        </div>,
      );
      const anchor = document.getElementById("rt-spread-colon")!;
      applySpread(anchor, { "xlink:href": "#page" });
      expect(anchor.getAttribute("xlink:href")).toBe("#page");
    });

    test("prop keeps the reactive-effect path for non-prefixed function values through a spread", () => {
      const value = signal("a");
      const build = mark(() => {
        const root = template(`<span id="rt-spread-reactive"></span>`)();
        applySpread(root, { "data-x": () => value() });
        return root;
      });
      mount(<div id="rt-spread-reactive-host"></div>);
      child(document.getElementById("rt-spread-reactive-host")!, build);
      const el = document.getElementById("rt-spread-reactive")!;
      expect(el.getAttribute("data-x")).toBe("a");
      value("b");
      flush();
      expect(el.getAttribute("data-x")).toBe("b");
    });

    test("child wires every compiled input class", () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      child(host, "str");
      child(host, 0);
      const toggle = signal(true);
      child(host, () => (toggle() ? <b id="rt-b">bold</b> : "plain"));
      child(host, ["arr-a", mark(() => template(`<i id="rt-i1"></i>`)()), "arr-b"]);
      child(host, raw(`<u id="rt-u"></u>`));
      expect(host.textContent).toContain("str");
      expect(host.textContent).toContain("0");
      expect(document.getElementById("rt-b")).not.toBeNull();
      toggle(false);
      flush();
      expect(document.getElementById("rt-b")).toBeNull();
      expect(host.textContent).toContain("plain");
      toggle(true);
      flush();
      expect(document.getElementById("rt-b")).not.toBeNull();
      expect(document.getElementById("rt-i1")).not.toBeNull();
      expect(document.getElementById("rt-u")).not.toBeNull();
      child(
        host,
        mark(() => template(`<em id="rt-em"></em>`)()),
      );
      child(
        host,
        component((() => mark(() => template(`<code id="rt-code"></code>`)())) as ComponentFn, {}),
      );
      expect(document.getElementById("rt-em")).not.toBeNull();
      expect(document.getElementById("rt-code")).not.toBeNull();
    });

    // Old behavior "child mounts a HellaNode child through the walker": the walker
    // accepted hand-built HellaNode children. The flip rejects them at the child() gate —
    // compiled builds emit runtime calls, never HellaNode literals.
    test("child throws on a hand-built HellaNode child", () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      expect(() => child(host, { tag: "b", children: ["bold"] })).toThrow(
        "[dom] child: hand-built HellaNode input is not supported",
      );
    });

    test("component wrapping a fn-returning component drains inner effects on removal", async () => {
      const count = signal(0);
      const innerTracker = vi.fn(() => count());
      const bodyTracker = vi.fn(() => count());
      const Counter = () => {
        effect(bodyTracker);
        return mark(() => {
          const root = template(`<div id="rt-comp"><span class="v"></span></div>`)();
          text(root.children[0]!, () => count());
          registry.addEffect(root, innerTracker);
          return root;
        });
      };
      mount(<div id="rt-comp-host"></div>);
      child(document.getElementById("rt-comp-host")!, component(Counter as ComponentFn, {}));
      const root = document.getElementById("rt-comp")!;
      expect(root).not.toBeNull();
      expect(innerTracker).toHaveBeenCalledTimes(1);
      count(1);
      flush();
      expect(document.querySelector("#rt-comp .v")!.textContent).toBe("1");
      document.getElementById("rt-comp-host")!.remove();
      for (let i = 0; i < 50; i++) {
        if (peekState(root) === undefined) break;
        await delay();
      }
      expect(peekState(root)).toBeUndefined();
      const innerRuns = innerTracker.mock.calls.length;
      const bodyRuns = bodyTracker.mock.calls.length;
      count(2);
      flush();
      expect(innerTracker).toHaveBeenCalledTimes(innerRuns);
      expect(bodyTracker).toHaveBeenCalledTimes(bodyRuns);
    });

    test("flagged fns resolve under a parent with overlay parity and chained component scopes", async () => {
      const count = signal(0);
      const innerTracker = vi.fn(() => count());
      const outerTracker = vi.fn(() => count());
      const Inner = () =>
        mark(() => {
          const root = template(`<div id="rt-inner"><span></span></div>`)();
          registry.addEffect(root, innerTracker);
          return root;
        });
      const Outer = () => {
        effect(outerTracker);
        return component(Inner as ComponentFn, {});
      };
      mount(<div id="rt-ol-host"></div>);
      child(document.getElementById("rt-ol-host")!, component(Outer as ComponentFn, {}));
      const root = document.getElementById("rt-inner")!;
      expect(root).not.toBeNull();
      document.getElementById("rt-ol-host")!.remove();
      for (let i = 0; i < 50; i++) {
        if (peekState(root) === undefined) break;
        await delay();
      }
      expect(peekState(root)).toBeUndefined();
      const innerRuns = innerTracker.mock.calls.length;
      const outerRuns = outerTracker.mock.calls.length;
      count(9);
      flush();
      expect(innerTracker).toHaveBeenCalledTimes(innerRuns);
      expect(outerTracker).toHaveBeenCalledTimes(outerRuns);
    });
  });
});
