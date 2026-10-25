import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush } from "@hellajs/core";
import {
  resetTestState,
  setupContainer,
  compileJsx,
  runCompiledModule,
} from "@utils/test-helpers.js";
import { suppressWarn } from "./helpers";
import { hydrate, component } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";
import * as runtimeNs from "@hellajs/dom/runtime";
import * as domNs from "@hellajs/dom";
import * as coreNs from "@hellajs/core";
import type { HellaNode, ComponentFn, TemplateBuildFn } from "@hellajs/dom";

/** Fixture sources publish their internal signals here so tests can flip them post-hydrate. */
const controls: Record<string, (v: unknown) => void> = {};

type Fixture = { source: string; host: string; props?: Record<string, unknown> };

const MODULES = {
  "@hellajs/dom/runtime": runtimeNs,
  "@hellajs/dom": domNs,
  "@hellajs/core": coreNs,
  "@hellajs/test-controls": { controls },
};

const execComponent = (code: string): ComponentFn =>
  runCompiledModule(code, MODULES, "App") as unknown as ComponentFn;

const fixtureByName = (name: string): Fixture => FIXTURES[name]!;

/**
 * Representative compiled shapes (the unit-02 golden emissions): the same fixture source runs in
 * both arms — the ast arm through `ssr()`'s serializer, the dom arm through `hydrate`'s adoption
 * context claiming the serialized output.
 */
const FIXTURES: Record<string, Fixture> = {
  "bench row": {
    host: "tbody",
    props: { row: { id: 1, label: "Alpha" } },
    source: `import { signal } from "@hellajs/core";
      import { controls } from "@hellajs/test-controls";
      const App = (props) => {
        const selected = signal(0);
        controls.selected = selected;
        return (
          <tr class={selected() === props.row.id ? "danger" : "dim"}>
            <td>{props.row.id}</td>
            <td><a class="lbl" on:click={() => selected(props.row.id)}>{props.row.label}</a></td>
          </tr>
        );
      };`,
  },
  "static subtree": {
    host: "div",
    source: `const App = () => (
        <div id="static-box" class="box"><span>hi</span><p>deep <b>static</b></p></div>
      );`,
  },
  "fragment root": {
    host: "div",
    source: `import { signal } from "@hellajs/core";
      import { controls } from "@hellajs/test-controls";
      const App = () => {
        const label = signal("x");
        controls.label = label;
        return (<>count {label}</>);
      };`,
  },
  "reactive text and prop regions": {
    host: "div",
    source: `import { signal } from "@hellajs/core";
      import { controls } from "@hellajs/test-controls";
      const App = () => {
        const cls = signal("a");
        const label = signal("on");
        controls.cls = cls;
        controls.label = label;
        return (<div id="wired" class={cls}>{label}</div>);
      };`,
  },
  "nested component": {
    host: "div",
    source: `import { signal } from "@hellajs/core";
      const Badge = (props) => <b class={props.kind}>tag</b>;
      const App = () => {
        const kind = signal("hot");
        return (<div><Badge kind={kind} /><span>tail</span></div>);
      };`,
  },
  "region swap": {
    host: "div",
    source: `import { signal } from "@hellajs/core";
      import { controls } from "@hellajs/test-controls";
      const App = () => {
        const cond = signal(true);
        controls.cond = cond;
        return (<div id="swap">{cond() ? <a id="ta" /> : <b id="tb" />}<span>tail</span></div>);
      };`,
  },
  "raw child": {
    host: "div",
    source: `import { raw } from "@hellajs/dom";
      const App = () => <div id="raw-box">{raw('<u id="ru">raw</u>')}</div>;
    `,
  },
};

const parityHost = (tag: string): HTMLElement => {
  if (tag === "tbody") {
    const table = document.createElement("table");
    const body = document.createElement("tbody");
    table.appendChild(body);
    document.body.appendChild(table);
    return body;
  }
  const container = setupContainer();
  return container;
};

const renderServer = async (fixture: Fixture): Promise<HTMLElement> => {
  const container = parityHost(fixture.host);
  const App = execComponent(await compileJsx(fixture.source));
  container.innerHTML = ssr(App(fixture.props ?? {}) as HellaNode);
  return container;
};

const hydrateImperative = async (
  container: HTMLElement,
  fixture: Fixture,
): Promise<ReturnType<typeof hydrate>> => {
  const App = execComponent(await compileJsx(fixture.source, { target: "dom" }));
  return hydrate(() => component(App, fixture.props ?? {}) as TemplateBuildFn, container);
};

describe("hydrate", () => {
  beforeEach(() => {
    resetTestState();
  });

  test.each(Object.entries(FIXTURES))(
    "adopts %s identically to the ast output",
    async (_name, fixture) => {
      const container = await renderServer(fixture);
      const serverHtml = container.innerHTML.replaceAll("<!--[-->", "").replaceAll("<!--]-->", "");
      await hydrateImperative(container, fixture);
      expect(container.innerHTML).toBe(serverHtml);
    },
  );

  test("claims the existing server nodes with no clone churn", async () => {
    const fixture = fixtureByName("bench row");
    const tbody = await renderServer(fixture);
    const root = tbody.querySelector("tr");
    const link = tbody.querySelector("a");
    await hydrateImperative(tbody, fixture);
    expect(tbody.querySelector("tr")).toBe(root);
    expect(tbody.querySelector("a")).toBe(link);
  });

  test("dispatches on: handlers on the claimed node and flips its prop in place", async () => {
    const fixture = fixtureByName("bench row");
    const tbody = await renderServer(fixture);
    await hydrateImperative(tbody, fixture);
    const root = tbody.querySelector("tr")!;
    const link = tbody.querySelector("a")!;
    expect(root.className).toBe("dim");
    link.click();
    flush();
    expect(root.className).toBe("danger");
  });

  test("updates claimed text and prop regions on signal changes", async () => {
    const fixture = fixtureByName("reactive text and prop regions");
    const container = await renderServer(fixture);
    await hydrateImperative(container, fixture);
    const el = document.getElementById("wired")!;
    expect(el.className).toBe("a");
    expect(el.textContent).toBe("on");
    controls.cls!("b");
    flush();
    expect(el.className).toBe("b");
    controls.label!("off");
    flush();
    expect(el.textContent).toBe("off");
  });

  test("swaps a region ternary ahead of its anchor without disturbing siblings", async () => {
    const fixture = fixtureByName("region swap");
    const container = await renderServer(fixture);
    await hydrateImperative(container, fixture);
    expect(document.getElementById("ta")).not.toBeNull();
    expect(document.getElementById("tb")).toBeNull();
    controls.cond!(false);
    flush();
    expect(document.getElementById("ta")).toBeNull();
    expect(document.getElementById("tb")).not.toBeNull();
    const swap = document.getElementById("swap")!;
    expect(swap.lastElementChild!.textContent).toBe("tail");
  });

  test("throws the documented mismatch when a claim has no matching server node", async () => {
    const container = setupContainer();
    container.innerHTML = "<section></section>";
    const App = execComponent(
      await compileJsx(fixtureByName("static subtree").source, { target: "dom" }),
    );
    expect(() => hydrate(() => component(App, {}) as TemplateBuildFn, container)).toThrow(
      "[dom] hydrate: unmatched server DOM for imperative root",
    );
  });

  test("drains claimed-node effects when the hydrated root unmounts", async () => {
    const fixture = fixtureByName("reactive text and prop regions");
    const container = await renderServer(fixture);
    const handle = await hydrateImperative(container, fixture);
    const el = document.getElementById("wired")!;
    expect(el.className).toBe("a");
    handle.unmount();
    controls.cls!("b");
    controls.label!("off");
    flush();
    expect(el.className).toBe("a");
    expect(el.textContent).toBe("on");
    expect(el.isConnected).toBe(false);
  });

  test("adopts a raw child opaquely, leaving its nodes unwired in place", async () => {
    const fixture = fixtureByName("raw child");
    const container = await renderServer(fixture);
    const serverHtml = container.innerHTML.replaceAll("<!--[-->", "").replaceAll("<!--]-->", "");
    await hydrateImperative(container, fixture);
    const rawEl = document.getElementById("ru");
    expect(container.innerHTML).toBe(serverHtml);
    expect(rawEl?.isConnected).toBe(true);
  });

  test("throws the documented mismatch when a raw child has no marker", async () => {
    const fixture = fixtureByName("raw child");
    const container = parityHost(fixture.host);
    container.innerHTML = (await renderServer(fixture)).innerHTML
      .replaceAll("<!--[-->", "")
      .replaceAll("<!--]-->", "");
    const App = execComponent(await compileJsx(fixture.source, { target: "dom" }));
    expect(() => hydrate(() => component(App, {}) as TemplateBuildFn, container)).toThrow(
      "[dom] hydrate: unmatched server DOM for imperative root",
    );
  });

  test("warns and remounts a reactive region whose marker is missing", async () => {
    const fixture = fixtureByName("reactive text and prop regions");
    const container = parityHost(fixture.host);
    container.innerHTML = (await renderServer(fixture)).innerHTML
      .replaceAll("<!--[-->", "")
      .replaceAll("<!--]-->", "");
    const App = execComponent(await compileJsx(fixture.source, { target: "dom" }));
    const { warnings } = suppressWarn(() =>
      hydrate(() => component(App, fixture.props ?? {}) as TemplateBuildFn, container),
    );
    expect(warnings.length).toBeGreaterThan(0);
    const el = container.querySelector("#wired")!;
    expect(el.textContent).toContain("on");
    controls.cls!("b");
    flush();
    expect(el.className).toBe("b");
  });

  test("mounts a flagged root fresh when the container is empty", async () => {
    const container = setupContainer();
    const App = execComponent(
      await compileJsx(fixtureByName("static subtree").source, { target: "dom" }),
    );
    hydrate(() => component(App, {}) as TemplateBuildFn, container);
    const box = document.getElementById("static-box");
    expect(box).not.toBeNull();
    expect(box!.className).toBe("box");
  });
});
