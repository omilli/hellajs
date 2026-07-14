import { setupContainer } from "@utils/test-helpers.js";
import { onError } from "@hellajs/dom/bundle";
import { ssr, ssrStream } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";

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
 * (`<!--[->…<!--]-->`) server HTML that `hydrate(node, container)` consumes. Use this (not
 * `serverContainer`) whenever the tree has dynamic children: it reproduces the exact contract `ssr`
 * ships, including region markers, with no mount/divergence caveats.
 */
export const ssrContainer = (node: HellaNode | (() => HellaNode)): Element => {
  const resolved = typeof node === "function" ? (node as () => HellaNode)() : node;
  const container = setupContainer();
  container.innerHTML = ssr(resolved);
  return container;
};

/**
 * Produces a fresh container whose innerHTML is the REAL `ssrStream()` output for `node` — the streamed
 * HTML including `<Suspense>` fallbacks, sentinel comments, and staged `<template>`s that `hydrate`
 * swaps in. Use this for streaming/hydrate-swap tests (β).
 */
export const streamContainer = async (node: HellaNode | (() => HellaNode)): Promise<Element> => {
  const resolved = typeof node === "function" ? (node as () => HellaNode)() : node;
  const container = setupContainer();
  const reader = ssrStream(resolved).getReader();
  let html = "";
  let chunk = await reader.read();
  while (!chunk.done) { html += chunk.value; chunk = await reader.read(); }
  container.innerHTML = html;
  return container;
};
