import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import {resetTestState} from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("template", () => {
    test("lifecycle hooks via hook: prefix", () => {
      const hooks = {
        beforeMount: () => { },
        afterMount: () => { },
        beforeDestroy: () => { },
        afterDestroy: () => { }
      };

      const node = html`<div
        hook:beforeMount=${hooks.beforeMount}
        hook:afterMount=${hooks.afterMount}
        hook:beforeDestroy=${hooks.beforeDestroy}
        hook:afterDestroy=${hooks.afterDestroy}
      >Lifecycle</div>` as HellaNode;

      expect(node.hooks).toEqual(hooks);
    });

    test("combines props, on, hooks", () => {
      const className = signal("active");
      const handleClick = () => { };
      const afterMount = () => { };

      const node = html`<div
        id="combo"
        class=${className}
        on:click=${handleClick}
        hook:afterMount=${afterMount}
      >Combined</div>` as HellaNode;

      expect(node.props!.id).toBe("combo");
      expect(node.props!.class).toBe(className);
      expect(node.on!.click).toBe(handleClick);
      expect(node.hooks!.afterMount).toBe(afterMount);
    });

    test("component functions with children", () => {
      const Wrapper = (props: { children?: HellaNode; title: string }) =>
        html`<div class="wrapper"><h1>${props.title}</h1>${props.children}</div>`;

      const node = html`<${Wrapper} title="Hello"><span>Child</span></${Wrapper}>` as HellaNode;

      expect(node.tag).toBe("div");
      expect(node.props!.class).toBe("wrapper");
      expect((node.children![0] as HellaNode).children![0]).toBe("Hello");
    });

    test("whitespace-only text nodes between elements excluded", () => {
      const node = html`
        <div>
          <span>Text</span>
        </div>
      ` as HellaNode;
      expect(node.children!.length).toBe(1);
      expect((node.children![0] as HellaNode).tag).toBe("span");
    });

    test("unclosed single tag auto-closes on parse", () => {
      mount(html`<div><span>Unclosed`);
      expect(document.querySelector("#app div span")?.textContent).toBe("Unclosed");
    });

    test("nested unclosed tags auto-close in order", () => {
      mount(html`<div><p><b>Nested unclosed`);
      expect(document.querySelector("#app div p b")?.textContent).toBe("Nested unclosed");
    });

    test("leading and trailing text render alongside root elements", () => {
      mount(html`Before<div>Middle</div>After`);
      expect(document.getElementById("app")?.textContent).toContain("Before");
      expect(document.getElementById("app")?.textContent).toContain("After");
    });

    test("root-level interpolation", () => {
      const getValue = () => ({ tag: "span", children: ["Dynamic"] });
      const funcNode = html`${getValue}`;
      expect(funcNode).toBe(getValue);

      const count = signal(42);
      const sigNode = html`${count}`;
      expect(sigNode as unknown).toEqual(count);

      const value = { tag: "div", children: ["Static"] };
      const staticNode = html`${value}`;
      expect(staticNode).toEqual(value);
    });

    test("self-closing tags", () => {
      const input = html`<input type="text" value="test" />` as HellaNode;
      expect(input.tag).toBe("input");
      expect(input.props?.type).toBe("text");
      expect(input.children?.length).toBe(0);

      const br = html`<br />` as HellaNode;
      expect(br.tag).toBe("br");
      expect(br.children?.length).toBe(0);

      const img = html`<img src="test.jpg" alt="test" />` as HellaNode;
      expect(img.tag).toBe("img");
      expect(img.props?.src).toBe("test.jpg");
    });

    test("boolean attributes", () => {
      const disabled = html`<input disabled />` as HellaNode;
      expect(disabled.props?.disabled).toBe(true);

      const checked = html`<input checked />` as HellaNode;
      expect(checked.props?.checked).toBe(true);

      const readonlyTrue = html`<input readonly=${true} />` as HellaNode;
      expect(readonlyTrue.props?.readonly).toBe(true);

      const readonlyFalse = html`<input readonly=${false} />` as HellaNode;
      expect(readonlyFalse.props?.readonly).toBe(false);

      const readonlyNull = html`<input readonly=${null} />` as HellaNode;
      expect(readonlyNull.props?.readonly).toBeNull();

      mount(html`<input id="bool-test" disabled />`);
      expect(document.getElementById("bool-test")?.hasAttribute("disabled")).toBe(true);

      mount(html`<input id="bool-false" disabled=${false} />`);
      expect(document.getElementById("bool-false")?.hasAttribute("disabled")).toBe(false);
    });

    test("array attribute values (class lists)", () => {
      const node = html`<div class=${["a", "b", "c"]}>Array class</div>` as HellaNode;
      expect(node.props?.class).toEqual(["a", "b", "c"]);

      mount(html`<div id="array-class" class=${["foo", "bar", "baz"]}>Content</div>`);
      expect(document.getElementById("array-class")?.className).toBe("foo bar baz");

      mount(html`<div id="filtered-class" class=${["active", null, "visible", undefined, ""]}>Content</div>`);
      expect(document.getElementById("filtered-class")?.className).toBe("active visible");
    });

    test("reactive array attribute updates on signal change", () => {
      const active = signal("on");
      mount(html`<div id="reactive-array" class=${() => [active(), "base"]}>x</div>`);
      expect(document.getElementById("reactive-array")?.className).toBe("on base");

      active("off");
      flush();
      expect(document.getElementById("reactive-array")?.className).toBe("off base");
    });

    test("reactive call attribute updates on signal change", () => {
      const active = signal("primary");
      mount(html`<div id="reactive-call" class=${() => active()}>x</div>`);
      expect(document.getElementById("reactive-call")?.className).toBe("primary");

      active("secondary");
      flush();
      expect(document.getElementById("reactive-call")?.className).toBe("secondary");
    });

    test("reactive attribute re-filters falsy entries on update", () => {
      const on = signal(true);
      mount(html`<div id="reactive-filter" class=${() => on() ? ["active", null, "base"] : ["off"]}>x</div>`);
      expect(document.getElementById("reactive-filter")?.className).toBe("active base");

      on(false);
      flush();
      expect(document.getElementById("reactive-filter")?.className).toBe("off");
    });

    test("multiple root elements become fragment", () => {
      const fragment = html`<span>A</span><span>B</span>` as HellaNode;
      expect(fragment.tag).toBe("$");
      expect(fragment.children?.length).toBe(2);
      expect((fragment.children![0] as HellaNode).tag).toBe("span");
      expect((fragment.children![1] as HellaNode).tag).toBe("span");

      const threeRoots = html`<div>1</div><div>2</div><div>3</div>` as HellaNode;
      expect(threeRoots.tag).toBe("$");
      expect(threeRoots.children?.length).toBe(3);
    });

    test("explicit fragment syntax at root", () => {
      const fragment = html`<><span id="a">A</span><span id="b">B</span></>` as HellaNode;
      expect(fragment.tag).toBe("$");
      expect(fragment.children?.length).toBe(2);

      mount(html`<><span id="root-a">A</span><span id="root-b">B</span></>`);
      expect(document.getElementById("root-a")?.textContent).toBe("A");
      expect(document.getElementById("root-b")?.textContent).toBe("B");
      expect(document.getElementById("app")!.children.length).toBe(2);
    });

    test("nested fragment syntax renders children without wrapper", () => {
      mount(html`<div id="host"><><span>a</span><span>b</span></></div>`);
      const host = document.getElementById("host")!;
      expect(host.children.length).toBe(2);
      expect(host.textContent).toBe("ab");
    });

    test("nested fragments inside fragments flatten", () => {
      mount(html`<div id="host"><><span>a</span><><span>b</span><span>c</span></></></div>`);
      const host = document.getElementById("host")!;
      expect(host.children.length).toBe(3);
      expect(host.textContent).toBe("abc");
    });

    test("sibling fragments render sequentially", () => {
      mount(html`<div id="host"><><span>a</span></><><span>b</span></></div>`);
      const host = document.getElementById("host")!;
      expect(host.children.length).toBe(2);
      expect(host.textContent).toBe("ab");
    });

    test("fragment with mixed text and element children", () => {
      mount(html`<div id="host"><>text<span>s</span>more</></div>`);
      const host = document.getElementById("host")!;
      expect(host.childNodes.length).toBe(3);
      expect(host.textContent).toBe("textsmore");
    });

    test("fragment produces no stray text nodes", () => {
      mount(html`<div id="host"><><span>only</span></></div>`);
      const host = document.getElementById("host")!;
      expect(host.childNodes.length).toBe(1);
      expect(host.childNodes[0]!.nodeName).toBe("SPAN");
    });

    test("dynamic component with merged props", () => {
      const Comp = (props: { id: string; class?: string; onClick?: () => void }) =>
        html`<div id=${props.id} class=${props.class} on:click=${props.onClick}>Component</div>`;

      const handler = () => { };
      const className = signal("dynamic");

      const node = html`<${Comp}
        id="test-id"
        class="static-class"
        class=${className}
        on:click=${handler}
      />` as HellaNode;

      expect(node.tag).toBe("div");
      expect(node.props?.id).toBe("test-id");
    });

    test("attribute prefix detection (on:, hook:, e:)", () => {
      const handler = () => { };
      const bindVal = signal("bound");
      const hookFn = () => { };

      const node = html`<div
        id="prefix-test"
        on:click=${handler}
        class=${bindVal}
        hook:afterMount=${hookFn}
        e:focus=${handler}
      >Prefixes</div>` as HellaNode;

      expect(node.props?.id).toBe("prefix-test");
      expect(node.on?.click).toBe(handler);
      expect(node.props?.class).toBe(bindVal);
      expect(node.hooks?.afterMount).toBe(hookFn);
      expect(node.on?.focus).toBe(undefined);
    });

    test("preserves multiple child elements through template whitespace", () => {
      const node = html`
        <div>
          <span>A</span>
          <span>B</span>
        </div>
      ` as HellaNode;

      expect(node.tag).toBe("div");
      expect(node.children!.length).toBeGreaterThan(1);
    });

    test("nested placeholders", () => {
      const inner = signal("inner");

      const node = html`<div>${() => html`<span>${inner}</span>`}</div>` as HellaNode;
      expect(node.tag).toBe("div");

      mount(html`<div id="nested-placeholder">${() => html`<span>${inner}</span>`}</div>`);
      expect(document.querySelector("#nested-placeholder span")?.textContent).toBe("inner");

      inner("updated");
      flush();
      expect(document.querySelector("#nested-placeholder span")?.textContent).toBe("updated");
    });

    test("placeholder in attribute value", () => {
      const dynamicId = signal("dynamic-id");
      const node = html`<div id=${dynamicId}>Content</div>` as HellaNode;

      expect(node.props?.id).toEqual(dynamicId);
    });
  });
});