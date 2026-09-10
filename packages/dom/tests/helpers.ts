import { setupContainer } from "@utils/test-helpers.js";
import { html, ForEach, onError } from "@hellajs/dom/bundle";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaChild, HellaNode } from "@hellajs/dom";

/**
 * Renders `items` through ForEach inside a `<ul>` — the default renderer wraps each item in a keyed
 * `<li>`; pass `itemRenderer` to control the per-item markup. Shared by the ForEach test files.
 */
export const createList = <T>(items: T[] | (() => T[]), itemRenderer?: (item: T) => HellaChild): HellaNode =>
  html`<ul><${ForEach} each=${items} use=${itemRenderer || ((item: T) => html`<li key=${item}>Item ${item}</li>`)} /></ul>` as HellaNode;

/** Text content of every `<li>` currently in the document, in DOM order. */
export const getListTexts = () => Array.from(document.querySelectorAll("li")).map(li => li.textContent);

export const fallbackHandler = (
  def: HellaNode | (() => HellaNode) | null = null
) =>
  onError((error: Error, context) =>
    context.config?.fallback?.(error) ?? (def as HellaNode | null));

/**
 * Suppresses `console.warn` for the duration of `fn`, restoring it afterward even if `fn` throws.
 * Captured warnings are returned for assertion. Use this instead of a bare save/restore pair so a
 * failing assertion between them cannot leak the stub into later files (guides/tests.md §Patched browser globals).
 */
export const suppressWarn = <T>(fn: () => T): { result: T; warnings: unknown[][] } => {
  const orig = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    const result = fn();
    return { result, warnings };
  } finally {
    console.warn = orig;
  }
};

/**
 * Produces a fresh container whose innerHTML is the REAL `ssr()` output for `node` — marker-bearing
 * (`<!--[->…<!--]-->`) server HTML that `hydrate(node, container)` consumes. Use this whenever the
 * tree has dynamic children: it reproduces the exact contract `ssr` ships, including region markers.
 */
export const ssrContainer = (node: HellaNode | (() => HellaNode)): Element => {
  const resolved = typeof node === "function" ? (node as () => HellaNode)() : node;
  const container = setupContainer();
  container.innerHTML = ssr(resolved);
  return container;
};

/**
 * Produces a fresh container whose innerHTML is the REAL `ssr.async()` output for `node` — server HTML
 * with awaited regions resolved (Lazy loaders, Promise-returning getters). Use this for hydrate tests of
 * async-rendered content (e.g. the Lazy no-flash contract).
 */
export const ssrAsyncContainer = async (node: HellaNode | (() => HellaNode)): Promise<Element> => {
  const resolved = typeof node === "function" ? (node as () => HellaNode)() : node;
  const container = setupContainer();
  container.innerHTML = await ssr.async(resolved);
  return container;
};

/**
 * Produces a fresh container whose innerHTML is the REAL `ssr.stream()` output for `node` — the streamed
 * HTML including `<Suspense>` fallbacks, sentinel comments, and staged `<template>`s that `hydrate`
 * swaps in. Use this for streaming/hydrate-swap tests (β).
 */
export const streamContainer = async (node: HellaNode | (() => HellaNode)): Promise<Element> => {
  const resolved = typeof node === "function" ? (node as () => HellaNode)() : node;
  const container = setupContainer();
  const reader = ssr.stream(resolved).getReader();
  let html = "";
  let chunk = await reader.read();
  while (!chunk.done) { html += chunk.value; chunk = await reader.read(); }
  container.innerHTML = html;
  return container;
};
