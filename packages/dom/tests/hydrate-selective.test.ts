import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { hydrate, html, Suspense } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import { streamContainer, suppressWarn } from "./helpers";

beforeEach(() => {
  resetTestState();
});

/** Shadows document.readyState around fn, restoring the real value even on throw (guides/tests.md §Patched browser globals). */
const withReadyState = async (state: string, fn: () => Promise<void> | void): Promise<void> => {
  Object.defineProperty(document, "readyState", { get: () => state, configurable: true });
  try {
    await fn();
  } finally {
    Reflect.deleteProperty(document, "readyState");
  }
};

/** Streams node's real ssr.stream output, then removes every staged <template> — the mid-stream "stage not yet arrived" shape. */
const streamWithoutTemplates = async (node: HellaNode | (() => HellaNode)) => {
  const container = await streamContainer(node);
  const templates = Array.from(container.querySelectorAll("template"));
  templates.forEach((tpl) => tpl.remove());
  return { container, templates };
};

/** The app root's full text — the whole rendered surface (memory 034), excluding the stream's inert <script> baggage. */
const rootText = (container: Element): string => container.querySelector("#root")!.textContent ?? "";

/** Microtask-hop poll until selector matches — MutationObserver delivery needs no macrotask (HappyDOM WeakRef GC hazard). */
const untilAdopted = async (container: Element, selector: string): Promise<void> => {
  for (let i = 0; i < 50; i++) {
    if (container.querySelector(selector)) return;
    await delay();
  }
};

describe("dom hydrate selective hydration", () => {
  test("defers a region whose staged template has not arrived while the document streams", async () => {
    const producer = mock(() => html`<b id="b">x</b>` as HellaNode);
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i id="fb">wait</i>`}>${producer}</${Suspense}></div>`;
    const { container } = await streamWithoutTemplates(html`<${App} />` as HellaNode);
    producer.mockClear();   // the server walk already resolved the child into the (now removed) template
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      expect(producer).not.toHaveBeenCalled();   // deferred — children fn not re-invoked, no re-suspension
      expect(container.querySelector("#fb")).not.toBeNull();   // fallback stays mounted
      expect(rootText(container)).toBe("wait");
    });
  });

  test("adopts the region reactively when the staged template arrives", async () => {
    const count = signal(0);
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i id="fb">wait</i>`}><b id="b" data-n=${count}>x</b></${Suspense}></div>`;
    const { container, templates } = await streamWithoutTemplates(html`<${App} />` as HellaNode);
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      container.appendChild(document.createElement("span"));   // unrelated mutation — the pending region must survive the recheck
      await delay();
      expect(container.querySelector("#fb")).not.toBeNull();
      container.appendChild(templates[0]!);   // simulated late arrival
      await untilAdopted(container, "#b");
      expect(container.querySelector("#fb")).toBeNull();   // fallback swapped out
      expect(container.querySelector("template")).toBeNull();   // template consumed
      expect(rootText(container)).toBe("x");
    });
    const b = container.querySelector("#b")!;
    expect(b.getAttribute("data-n")).toBe("0");
    count(7);
    flush();
    expect(b.getAttribute("data-n")).toBe("7");   // adopted + reactive
  });

  test("replays a click buffered on the fallback once the region adopts", async () => {
    const handler = mock(() => {});
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<button id="fb" type="button">wait</button>`}><button id="b" type="button" on:click=${handler}>go</button></${Suspense}></div>`;
    const { container, templates } = await streamWithoutTemplates(html`<${App} />` as HellaNode);
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      container.querySelector("#fb")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(handler).not.toHaveBeenCalled();   // region unhydrated — nothing is wired yet
      container.appendChild(templates[0]!);
      await untilAdopted(container, "#b");
      expect(handler).toHaveBeenCalledTimes(1);   // buffered, then positionally replayed on the resolved button
      expect(rootText(container)).toBe("go");
    });
  });

  test("fires a click outside any pending region immediately, without buffering it", async () => {
    const handler = mock(() => {});
    const App = () => html`<div id="root"><button id="shell" on:click=${handler}>shell</button><${Suspense} fallback=${html`<i id="fb">wait</i>`}><b id="b">x</b></${Suspense}></div>`;
    const { container, templates } = await streamWithoutTemplates(html`<${App} />` as HellaNode);
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      container.querySelector("#shell")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);   // shell interactivity is live during deferral
      container.appendChild(templates[0]!);
      await untilAdopted(container, "#b");
      expect(handler).toHaveBeenCalledTimes(1);   // never buffered, never replayed
    });
  });

  test("does not buffer or replay events on an already-adopted region", async () => {
    const handler = mock(() => {});
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i id="fb">wait</i>`}><button id="b" on:click=${handler}>go</button></${Suspense}></div>`;
    const { container, templates } = await streamWithoutTemplates(html`<${App} />` as HellaNode);
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      container.appendChild(templates[0]!);
      await untilAdopted(container, "#b");
      container.querySelector("#b")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);
      container.appendChild(document.createElement("span"));   // post-adoption mutation — nothing may replay
      await delay();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  test("drops a buffered event whose target has no connected counterpart after the swap", async () => {
    const handler = mock(() => {});
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i>one</i><i id="two">two</i>`}><button id="b" on:click=${handler}>go</button></${Suspense}></div>`;
    const { container, templates } = await streamWithoutTemplates(html`<${App} />` as HellaNode);
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      container.querySelector("#two")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));   // second fallback node — the single resolved node has no index-1 counterpart
      container.appendChild(templates[0]!);
      await untilAdopted(container, "#b");
      expect(handler).not.toHaveBeenCalled();   // entry dropped, not replayed onto the resolved button
      expect(rootText(container)).toBe("go");
    });
  });

  test("degrades a deferred region to client-side re-suspension when the stream dies", async () => {
    const producer = mock(() => Promise.resolve(html`<p id="late">resolved</p>` as HellaNode));
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i id="fb">wait</i>`}>${producer}</${Suspense}></div>`;
    const { container } = await streamWithoutTemplates(html`<${App} />` as HellaNode);
    producer.mockClear();
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      expect(producer).not.toHaveBeenCalled();
      expect(container.querySelector("#fb")).not.toBeNull();
    });
    await withReadyState("complete", async () => {
      suppressWarn(() => document.dispatchEvent(new Event("readystatechange")));   // the degrade path warns
    });
    expect(producer).toHaveBeenCalledTimes(1);   // re-suspended client-side
    await delay(0);   // macrotask — suspendChild's .then chain settles
    expect(container.querySelector("#fb")).toBeNull();
    expect(rootText(container)).toBe("resolved");
  });

  test("adopts synchronously when the template is present and parsing is done", async () => {
    const count = signal(0);
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i id="fb">wait</i>`}><b id="b" data-n=${count}>x</b></${Suspense}></div>`;
    const container = await streamContainer(html`<${App} />` as HellaNode);   // no shadowing — the test env's readyState never defers
    hydrate(html`<${App} />`, container);
    expect(container.querySelector("#fb")).toBeNull();   // swapped + adopted in the hydrate pass
    expect(rootText(container)).toBe("x");
    const b = container.querySelector("#b")!;
    count(7);
    flush();
    expect(b.getAttribute("data-n")).toBe("7");   // reactive — no regression vs the hydrate-suspense suite
  });

  test("hydrates two regions independently when one stage is present and one deferred", async () => {
    const count = signal(0);
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i id="fb1">w1</i>`}><b id="b1" data-n=${count}>a</b></${Suspense}><${Suspense} fallback=${html`<i id="fb2">w2</i>`}><b id="b2" data-n=${count}>b</b></${Suspense}></div>`;
    const container = await streamContainer(html`<${App} />` as HellaNode);
    const deferred = Array.from(container.querySelectorAll("template")).find((tpl) => tpl.content.querySelector("#b2"))!;
    deferred.remove();
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#b1")).not.toBeNull();   // present stage adopted synchronously
      expect(container.querySelector("#fb2")).not.toBeNull();   // missing stage deferred — fallback stays
      expect(rootText(container)).toBe("aw2");
      count(5);
      flush();
      expect(container.querySelector("#b1")!.getAttribute("data-n")).toBe("5");   // region 1 live while region 2 waits
      container.appendChild(deferred);
      await untilAdopted(container, "#b2");
      expect(container.querySelector("#fb2")).toBeNull();
      expect(rootText(container)).toBe("ab");
      expect(container.querySelector("#b2")!.getAttribute("data-n")).toBe("5");   // adopted at the current signal value
    });
  });

  test("keeps a region's buffered event while a sibling region adopts, then replays it", async () => {
    const handler = mock(() => {});
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i id="fb1">w1</i>`}><b id="b1">a</b></${Suspense}><${Suspense} fallback=${html`<button id="fb2" type="button">w2</button>`}><button id="b2" type="button" on:click=${handler}>b</button></${Suspense}></div>`;
    const { container, templates } = await streamWithoutTemplates(html`<${App} />` as HellaNode);
    const t1 = templates.find((tpl) => tpl.content.querySelector("#b1"))!;
    const t2 = templates.find((tpl) => tpl.content.querySelector("#b2"))!;
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      container.querySelector("#fb2")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      container.appendChild(t1);   // sibling adopts first — region 2's buffered entry must survive it
      await untilAdopted(container, "#b1");
      expect(handler).not.toHaveBeenCalled();
      expect(rootText(container)).toBe("aw2");
      container.appendChild(t2);   // region 2 adopts — its buffered click replays now
      await untilAdopted(container, "#b2");
      expect(handler).toHaveBeenCalledTimes(1);
      expect(rootText(container)).toBe("ab");
    });
  });

  test("adopts a region whose fallback was swapped out externally before recheck", async () => {
    const count = signal(0);
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i id="fb">wait</i>`}><b id="b" data-n=${count}>x</b></${Suspense}></div>`;
    const { container } = await streamWithoutTemplates(html`<${App} />` as HellaNode);
    await withReadyState("loading", async () => {
      hydrate(html`<${App} />`, container);
      const root = container.querySelector("#root")!;
      const b = document.createElement("b");
      b.id = "b";
      b.textContent = "x";
      // sentinel-only removal (e.g. comment-stripping middleware): the fallback is still live, so the region stays pending
      Array.from(root.childNodes).find((n) => n.nodeType === Node.COMMENT_NODE)!.remove();
      root.appendChild(b);
      count(3);
      for (let i = 0; i < 5; i++) await delay();   // microtask hops — let the observer recheck run
      expect(b.hasAttribute("data-n")).toBe(false);   // not adopted while the fallback stands in
      // full external swap (an inline $hs that ran while the markers were intact): fallback + sentinel replaced, no template
      root.querySelector("#fb")!.remove();
      for (let i = 0; i < 50 && b.getAttribute("data-n") !== "3"; i++) await delay();
      expect(b.getAttribute("data-n")).toBe("3");   // replacement adopted + reactive
      expect(rootText(container)).toBe("x");
    });
  });
});
