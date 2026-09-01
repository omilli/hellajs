import { signal } from "@hellajs/core";
import { html, ForEach } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import type { HeadOptions } from "@hellajs/ssr";

/** Collects all chunks from a ReadableStream<string> into a single string. */
export async function collect(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  let chunk = await reader.read();
  while (!chunk.done) { out += chunk.value; chunk = await reader.read(); }
  return out;
}

/** An isDynamic function carrying no `ssr` meta — every walker must render it as an empty marker region. */
const bareDynamicFn = (() => {
  const fn = () => "";
  (fn as { isDynamic?: true }).isDynamic = true;
  return fn;
})();

/** Parity node cases — inputs every walker (`ssr`/`ssr.async`/`ssr.stream`) must render byte-identically. */
export const parityCases: { name: string; node: HellaNode }[] = [
  { name: "falsy child (false)", node: html`<div>${false}</div>` as HellaNode },
  { name: "number child", node: html`<p>${5}</p>` as HellaNode },
  { name: "boolean true child", node: html`<div>${true}</div>` as HellaNode },
  { name: "escaped text child", node: html`<p>${signal('<b>&"x')}</p>` as HellaNode },
  { name: "fragment child among siblings", node: html`<div>a${html`<b></b><c></c>`}d</div>` as HellaNode },
  { name: "reactive child resolving to an element", node: html`<div>${signal(html`<b></b>` as HellaNode)}</div>` as HellaNode },
  { name: "reactive getter returning an array of nodes", node: html`<ul>${() => [1, 2, 3].map((n) => html`<li>${n}</li>`)}</ul>` as HellaNode },
  { name: "reactive child resolving to a non-HellaNode object", node: html`<div>${signal({ notag: true } as unknown as HellaNode)}</div>` as HellaNode },
  { name: "reactive getter returning an isDynamic component", node: html`<div>${() => ForEach({ each: signal([1, 2, 3]), use: (n: number) => html`<li>${n}</li>` })}</div>` as HellaNode },
  { name: "isDynamic function without ssr meta (empty region)", node: html`<div>${bareDynamicFn}</div>` as HellaNode },
];

/** Attribute-serialization parity cases — exercise the `serializeProp` branches (void / boolean / array / falsy). */
export const attributeCases: { name: string; node: HellaNode }[] = [
  { name: "void element", node: html`<img src=${"a.jpg"} />` as HellaNode },
  { name: "boolean attribute", node: html`<input disabled=${true} />` as HellaNode },
  { name: "array attribute", node: html`<div class=${["a", "b"]} />` as HellaNode },
  { name: "falsy attributes", node: html`<div class=${false} id=${undefined} />` as HellaNode },
];

/**
 * Head-collection parity cases — trees every walker must hoist identically into an `ssr.head()` bag.
 * `body`/`bag` pin the sync walk's exact output (the baseline the async and stream members are compared
 * against live): getter attrs resolve, reactive title text resolves, marker wrapping of the reactive
 * sibling is unchanged, and non-text children leave a `<title>`/`<style>` rendered in place.
 */
export const headParityCases: { name: string; node: HellaNode; body: string; bag: HeadOptions }[] = [
  {
    name: "head tags among body content",
    node: html`<div><title>Page - ${signal("Home")}</title><meta charset="utf-8" /><meta name=${() => "viewport"} content=${() => "width=device-width"} /><link rel="icon" href="/f.ico" /><style>a > b { color: red }</style><p>count: ${signal(5)}</p></div>` as HellaNode,
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
    node: html`<div><title>${html`<b>T</b>`}</title><style>${html`<i>s</i>`}</style>keep</div>` as HellaNode,
    body: "<div><title><b>T</b></title><style><i>s</i></style>keep</div>",
    bag: { title: undefined, meta: [], links: [], styles: [] },
  },
];

/** Builds a HellaNode wrapping an isDynamic function with an unknown ssr kind (renders an empty region; the walk warns). */
export function unknownKindNode(): HellaNode {
  const fn = (() => { throw new Error("fn should not be called"); }) as unknown as { isDynamic?: true; ssr?: { kind: "unknown"; props: object } };
  fn.isDynamic = true;
  fn.ssr = { kind: "unknown", props: {} };
  return html`<div>${fn}</div>` as HellaNode;
}
