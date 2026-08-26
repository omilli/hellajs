import { signal } from "@hellajs/core";
import { html, ForEach } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

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

/** Builds a HellaNode wrapping an isDynamic function with an unknown ssr kind (renders an empty region; the walk warns). */
export function unknownKindNode(): HellaNode {
  const fn = (() => { throw new Error("fn should not be called"); }) as unknown as { isDynamic?: true; ssr?: { kind: "unknown"; props: object } };
  fn.isDynamic = true;
  fn.ssr = { kind: "unknown", props: {} };
  return html`<div>${fn}</div>` as HellaNode;
}
