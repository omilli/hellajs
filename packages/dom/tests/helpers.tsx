import { setupContainer, compileJsx, runCompiledModule } from "@utils/test-helpers.js";
import { ForEach, onError } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";
import * as domRuntimeNs from "@hellajs/dom/runtime";
import * as domNs from "@hellajs/dom";
import * as coreNs from "@hellajs/core";
import * as domFeatureErrorsNs from "@hellajs/dom/features/errors";
import * as domFeatureHooksNs from "@hellajs/dom/features/hooks";
import * as domFeatureDirectNs from "@hellajs/dom/features/direct-events";
import * as domFeatureRawNs from "@hellajs/dom/features/raw";
import * as domFeatureNamespacesNs from "@hellajs/dom/features/namespaces";
import * as domFeatureCustomElementsNs from "@hellajs/dom/features/custom-elements";
import type { HellaChild, HellaNode } from "@hellajs/dom";

/**
 * Renders `items` through ForEach inside a `<ul>` — the default renderer wraps each item in a keyed
 * `<li>`; pass `itemRenderer` to control the per-item markup. Shared by the ForEach test files.
 */
export const createList = <T,>(
  items: T[] | (() => T[]),
  itemRenderer?: (item: T) => HellaChild,
): JSX.Element => (
  <ul>
    <ForEach
      each={items}
      use={itemRenderer || ((item: T) => <li key={item}>Item {item}</li>)}
    ></ForEach>
  </ul>
);

/**
 * Renders `items` through ForEach with a `key` extractor inside a `<ul>` — the default renderer
 * wraps each item in a keyless `<li>` (the extractor supersedes the vnode `key` prop); pass
 * `itemRenderer` to control the per-item markup. Shared by the ForEach test files.
 */
export const createKeyedList = <T,>(
  items: T[] | (() => T[]),
  getKey: (item: T, index: number) => unknown,
  itemRenderer?: (item: T) => HellaChild,
): JSX.Element => (
  <ul>
    <ForEach
      each={items}
      key={getKey}
      use={itemRenderer || ((item: T) => <li>Item {item}</li>)}
    ></ForEach>
  </ul>
);

/** Text content of every `<li>` currently in the document, in DOM order. */
export const getListTexts = () =>
  Array.from(document.querySelectorAll("li")).map((li) => li.textContent);

export const fallbackHandler = (def: JSX.Element | (() => JSX.Element) | null = null) =>
  onError(
    (error: Error, context) => context.config?.fallback?.(error) ?? (def as JSX.Element | null),
  );

/**
 * Suppresses `console.warn` for the duration of `fn`, restoring it afterward even if `fn` throws.
 * Captured warnings are returned for assertion. Use this instead of a bare save/restore pair so a
 * failing assertion between them cannot leak the stub into later files (guides/tests.md §Patched browser globals).
 */
export const suppressWarn = <T,>(fn: () => T): { result: T; warnings: unknown[][] } => {
  const orig = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
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
  while (!chunk.done) {
    html += chunk.value;
    chunk = await reader.read();
  }
  container.innerHTML = html;
  return container;
};

/** Module bindings for `runCompiledModule` over two-target sources: the runtime namespaces plus the REAL feature modules (importing them loads the registrations the stripped bare imports would have). */
export const TWO_TARGET_MODULES: Record<string, unknown> = {
  "@hellajs/dom/runtime": domRuntimeNs,
  "@hellajs/dom": domNs,
  "@hellajs/core": coreNs,
  "@hellajs/dom/features/errors": domFeatureErrorsNs,
  "@hellajs/dom/features/hooks": domFeatureHooksNs,
  "@hellajs/dom/features/direct-events": domFeatureDirectNs,
  "@hellajs/dom/features/raw": domFeatureRawNs,
  "@hellajs/dom/features/namespaces": domFeatureNamespacesNs,
  "@hellajs/dom/features/custom-elements": domFeatureCustomElementsNs,
};

/**
 * Compiles one app source at both plugin targets — the wrapper's per-environment split, in-test:
 * the server arm (default ast) feeds `ssrContainer` (marker-bearing server HTML); the client arm
 * (target "dom") yields the flagged build `hydrate` consumes. The source's last statement binds
 * an exports object (`const __out = { App, count }` — name overridable); the CLIENT arm's entries
 * are the live ones the test drives. Signals live at module scope so both arms initialize to the
 * same values the server rendered.
 * @param source The app module source (imports from `@hellajs/core` / `@hellajs/dom` only)
 * @param outName The exports-object binding name (default `__out`)
 * @returns The ssr-filled container + the client module's exports
 */
export const twoTargetContainer = async (
  source: string,
  outName = "__out",
): Promise<{
  container: Element;
  client: Record<string, unknown>;
  server: Record<string, unknown>;
}> => {
  const serverOut = runCompiledModule(
    await compileJsx(source),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "server" },
    outName,
  ) as Record<string, unknown>;
  const serverApp = serverOut.App;
  // An async component arm resolves to its AST only after awaiting — ssr needs the node.
  const serverNode =
    typeof serverApp === "function" ? await (serverApp as () => unknown)() : serverApp;
  const client = runCompiledModule(
    await compileJsx(source, { target: "dom" }),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "client" },
    outName,
  ) as Record<string, unknown>;
  return { container: ssrContainer(serverNode as HellaNode), client, server: serverOut };
};

/** {@link twoTargetContainer} with the `ssr.async()` fill — awaited regions (Lazy loaders, Promise getters) resolved in the server HTML. */
export const twoTargetAsyncContainer = async (
  source: string,
  outName = "__out",
): Promise<{
  container: Element;
  client: Record<string, unknown>;
  server: Record<string, unknown>;
}> => {
  const serverOut = runCompiledModule(
    await compileJsx(source),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "server" },
    outName,
  ) as Record<string, unknown>;
  const serverApp = serverOut.App;
  const serverNode =
    typeof serverApp === "function" ? await (serverApp as () => unknown)() : serverApp;
  const client = runCompiledModule(
    await compileJsx(source, { target: "dom" }),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "client" },
    outName,
  ) as Record<string, unknown>;
  const container = setupContainer();
  container.innerHTML = await ssr.async(serverNode as HellaNode);
  return { container, client, server: serverOut };
};

/** {@link twoTargetContainer} with the `ssr.stream()` fill — streaming HTML (Suspense fallbacks, sentinels, staged templates). */
export const twoTargetStreamed = async (
  source: string,
  outName = "__out",
): Promise<{
  container: Element;
  client: Record<string, unknown>;
  server: Record<string, unknown>;
}> => {
  const server = runCompiledModule(
    await compileJsx(source),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "server" },
    outName,
  ) as Record<string, unknown>;
  const client = runCompiledModule(
    await compileJsx(source, { target: "dom" }),
    { ...TWO_TARGET_MODULES, __HELLA_ARM: "client" },
    outName,
  ) as Record<string, unknown>;
  return { container: await streamContainer(server.App as HellaNode), client, server };
};
