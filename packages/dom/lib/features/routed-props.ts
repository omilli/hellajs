import type { ElementHooks, ErrorConfig } from "../types/nodes";
import { objectLoop } from "../internal/core";
import { setRoutedPropsResolver } from "../internal/utils";
import type { RoutedBuckets } from "../internal/utils";

/**
 * Slices prefixed props keys ("on:x", "e:x", "hook:x", "error:x") into their live
 * buckets so a component forwarding prefixed attrs onto an element routes them
 * through the same paths as compiled element buckets (setNodeHandler,
 * bindDirectHandler, registry.addHook, state.errorConfig). Keys starting exactly
 * with one of the four prefixes move out of props; every other key keeps
 * rendering as an attribute (namespaced attrs like `xlink:href`/`xml:lang`,
 * `data-*`, plain props). Routed values win per-key over same-named bucket
 * entries — re-emitted handlers override compiled element buckets. Colon-free
 * props take the early-out: the helper runs once per element render, and the
 * original buckets pass through untouched when nothing routes.
 * @param props The vnode's props record
 * @param on The vnode's delegated-events bucket
 * @param e The vnode's direct-events bucket
 * @param hooks The vnode's lifecycle-hooks bucket
 * @param error The vnode's error-config bucket
 * @returns Effective buckets — prefixed keys sliced out of props, routed values merged over on/e/hooks/error
 */
function routePrefixedProps(
  props: Record<string, unknown> | undefined,
  on: Record<string, unknown> | undefined,
  e: Record<string, unknown> | undefined,
  hooks: Partial<ElementHooks> | undefined,
  error: ErrorConfig | undefined,
): RoutedBuckets {
  if (!props) return { props, on, e, hooks, error };

  const keys = Object.keys(props);
  let i = 0;
  let hasColon = false;
  while (i < keys.length) {
    if (keys[i++]!.includes(":")) {
      hasColon = true;
      break;
    }
  }
  if (!hasColon) return { props, on, e, hooks, error };

  let routed = false;
  const rest: Record<string, unknown> = {};
  const routedOn: Record<string, unknown> = {};
  const routedE: Record<string, unknown> = {};
  const routedHooks: Record<string, unknown> = {};
  const routedError: Record<string, unknown> = {};

  objectLoop(props, (key, value) => {
    if (key.startsWith("on:")) {
      routedOn[key.slice(3)] = value;
      routed = true;
    } else if (key.startsWith("e:")) {
      routedE[key.slice(2)] = value;
      routed = true;
    } else if (key.startsWith("hook:")) {
      routedHooks[key.slice(5)] = value;
      routed = true;
    } else if (key.startsWith("error:")) {
      routedError[key.slice(6)] = value;
      routed = true;
    } else {
      rest[key] = value;
    }
  });

  if (!routed) return { props, on, e, hooks, error };

  return {
    props: rest,
    on: Object.keys(routedOn).length > 0 ? { ...on, ...routedOn } : on,
    e: Object.keys(routedE).length > 0 ? { ...e, ...routedE } : e,
    hooks:
      Object.keys(routedHooks).length > 0
        ? ({ ...hooks, ...routedHooks } as Partial<ElementHooks>)
        : hooks,
    error:
      Object.keys(routedError).length > 0 ? ({ ...error, ...routedError } as ErrorConfig) : error,
  };
}

setRoutedPropsResolver(routePrefixedProps);
