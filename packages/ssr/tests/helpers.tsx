import { signal } from "@hellajs/core";
import { ForEach, Transition, component } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";
import type { HeadOptions } from "@hellajs/ssr";

/** Collects all chunks from a ReadableStream<string> into a single string. */
export async function collect(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  let chunk = await reader.read();
  while (!chunk.done) {
    out += chunk.value;
    chunk = await reader.read();
  }
  return out;
}

/** An isDynamic function carrying no `ssr` meta — every walker must render it as an empty marker region. */
const bareDynamicFn = (() => {
  const fn = () => "";
  (fn as { isDynamic?: true }).isDynamic = true;
  return fn;
})();

/** The vendored-component codegen shape: children re-interpolated through the compiled JSX path. */
export const SlotBox = (props: { children?: unknown }) => <div>{() => props.children}</div>;

/** Parity node cases — inputs every walker (`ssr`/`ssr.async`/`ssr.stream`) must render byte-identically. */
export const parityCases: { name: string; node: HellaNode }[] = [
  { name: "falsy child (false)", node: (<div>{false}</div>) as HellaNode },
  { name: "number child", node: (<p>{5}</p>) as HellaNode },
  { name: "boolean true child", node: (<div>{true}</div>) as HellaNode },
  { name: "escaped text child", node: (<p>{signal('<b>&"x')}</p>) as HellaNode },
  {
    name: "fragment child among siblings",
    node: (
      <div>
        a
        {
          <>
            <b></b>
            <c></c>
          </>
        }
        d
      </div>
    ),
  },
  {
    name: "reactive child resolving to an element",
    node: <div>{signal(<b></b>)}</div>,
  },
  {
    name: "reactive getter returning an array of nodes",
    node: <ul>{() => [1, 2, 3].map((n) => <li>{n}</li>)}</ul>,
  },
  {
    name: "reactive getter through a component child slot",
    node: (
      <ul>
        <SlotBox>{() => [1, 2].map((n) => <li>{n}</li>)}</SlotBox>
      </ul>
    ),
  },
  {
    name: "reactive child resolving to a non-HellaNode object",
    node: <div>{signal({ notag: true } as unknown as HellaNode)}</div>,
  },
  {
    name: "reactive getter returning an isDynamic component",
    node: <div>{() => ForEach({ each: signal([1, 2, 3]), use: (n: number) => <li>{n}</li> })}</div>,
  },
  {
    name: "isDynamic function without ssr meta (empty region)",
    node: <div>{bareDynamicFn}</div>,
  },
  {
    name: "Transition with JSX array children (children: [child])",
    node: (
      <div>
        {component(Transition as unknown as (props: Record<string, unknown>) => HellaNode, {
          show: true,
          children: [<p>on</p>],
        })}
      </div>
    ),
  },
];

/** Attribute-serialization parity cases — exercise the `serializeProp` branches (void / boolean / array / falsy). */
export const attributeCases: { name: string; node: HellaNode }[] = [
  { name: "void element", node: (<img src={"a.jpg"} />) as HellaNode },
  { name: "boolean attribute", node: (<input disabled={true} />) as HellaNode },
  { name: "array attribute", node: (<div class={["a", "b"]}></div>) as HellaNode },
  { name: "falsy attributes", node: (<div class={false} id={undefined}></div>) as HellaNode },
];

/**
 * Head-collection parity cases — trees every walker must hoist identically into an `ssr.head()` bag.
 * `body`/`bag` pin the sync walk's exact output (the baseline the async and stream members are compared
 * against live): getter attrs resolve, reactive title text resolves, marker wrapping of the reactive
 * sibling is unchanged, and non-text children leave a `<title>`/`<style>` rendered in place.
 */
export const headParityCases: { name: string; node: HellaNode; body: string; bag: HeadOptions }[] =
  [
    {
      name: "head tags among body content",
      node: (
        <div>
          <title>Page - {signal("Home")}</title>
          <meta charset="utf-8" />
          <meta name={() => "viewport"} content={() => "width=device-width"} />
          <link rel="icon" href="/f.ico" />
          <style>{"a > b { color: red }"}</style>
          <p>count: {signal(5)}</p>
        </div>
      ),
      body: "<div><p>count: <!--[-->5<!--]--></p></div>",
      bag: {
        title: "Page - Home",
        meta: [{ charset: "utf-8" }, { name: "viewport", content: "width=device-width" }],
        links: [{ rel: "icon", href: "/f.ico" }],
        styles: ["a > b { color: red }"],
      },
    },
    {
      name: "non-text head children stay in place",
      node: (
        <div>
          <title>{<b>T</b>}</title>
          <style>{<i>s</i>}</style>keep
        </div>
      ),
      body: "<div><title><b>T</b></title><style><i>s</i></style>keep</div>",
      bag: { title: undefined, meta: [], links: [], styles: [] },
    },
  ];

/** Builds a HellaNode wrapping an isDynamic function with an unknown ssr kind (renders an empty region; the walk warns). */
export function unknownKindNode(): HellaNode {
  const fn = (() => {
    throw new Error("fn should not be called");
  }) as unknown as { isDynamic?: true; ssr?: { kind: "unknown"; props: object } };
  fn.isDynamic = true;
  fn.ssr = { kind: "unknown", props: {} };
  return <div>{fn}</div>;
}

import { compileJsx, runCompiledModule, setupContainer } from "@utils/test-helpers.js";
import * as coreNs from "@hellajs/core";
import * as domNs from "@hellajs/dom";
import * as domRuntimeNs from "@hellajs/dom/runtime";

/** Module bindings for the in-test compiler: the real core/dom namespaces, so stripped bare imports bind. */
const TWO_TARGET_MODULES = {
  "@hellajs/core": coreNs,
  "@hellajs/dom": domNs,
  "@hellajs/dom/runtime": domRuntimeNs,
};

/**
 * Compiles one app source at both plugin targets — the wrapper's per-environment split,
 * in-test: the server arm (default ast) feeds `ssr()`; the client arm (target "dom") yields
 * the flagged build `hydrate` consumes. The source's last statement binds the exports
 * object (`const __out = { App, ... }`); the CLIENT arm's entries are the live ones.
 * @param source The app module source (plain JS; imports from `@hellajs/core` / `@hellajs/dom`)
 * @returns The ssr-filled container + the client module's exports
 */
export const twoTarget = async (
  source: string,
): Promise<{ container: Element; client: Record<string, unknown> }> => {
  const serverOut = runCompiledModule(
    await compileJsx(source),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "server" },
    "__out",
  ) as Record<string, unknown>;
  const client = runCompiledModule(
    await compileJsx(source, { target: "dom" }),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "client" },
    "__out",
  ) as Record<string, unknown>;
  const container = setupContainer();
  container.innerHTML = ssr((serverOut.App as () => unknown)() as never);
  return { container, client };
};

/** {@link twoTarget} with the `ssr.stream()` fill — streamed HTML (fallbacks, sentinels, staged templates). */
export const twoTargetStreamed = async (
  source: string,
): Promise<{ container: Element; client: Record<string, unknown> }> => {
  const serverOut = runCompiledModule(
    await compileJsx(source),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "server" },
    "__out",
  ) as Record<string, unknown>;
  const client = runCompiledModule(
    await compileJsx(source, { target: "dom" }),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "client" },
    "__out",
  ) as Record<string, unknown>;
  const container = setupContainer();
  const reader = ssr.stream((serverOut.App as () => unknown)() as never).getReader();
  let html = "";
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    html += chunk.value;
  }
  container.innerHTML = html;
  return { container, client };
};

/** {@link twoTarget} with the `ssr.async()` fill — awaited regions (Lazy loaders, Promise getters) resolved in the server HTML. */
export const twoTargetAsync = async (
  source: string,
): Promise<{ container: Element; client: Record<string, unknown> }> => {
  const serverOut = runCompiledModule(
    await compileJsx(source),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "server" },
    "__out",
  ) as Record<string, unknown>;
  const client = runCompiledModule(
    await compileJsx(source, { target: "dom" }),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "client" },
    "__out",
  ) as Record<string, unknown>;
  const container = setupContainer();
  container.innerHTML = await ssr.async((serverOut.App as () => unknown)() as never);
  return { container, client };
};
