import { process } from "../css";
import { hash, stringify } from "./shared";
import type { StyleObject } from "../types";

/**
 * @internal
 * Derives the deterministic scoped class name for a style object:
 * `h-{label}-{hash}` with a label, `h-{hash}` without. The hash covers the
 * object only — never the label or the emitted text — so the same object with
 * different labels yields distinct classes sharing identical rule bodies, and
 * the name never depends on the selector it will be embedded in. Labels are
 * sanitized to [a-zA-Z0-9-] (invalid characters become `-`, leading/trailing
 * hyphens trimmed); a label empty after sanitization is treated as absent.
 * @param obj Style object the hash is computed over
 * @param label Optional label embedded between the prefix and the hash
 * @returns The scoped class name
 */
export function scopedClassName(obj: StyleObject, label?: string): string {
  const sanitized = label
    ? label.replace(/[^a-zA-Z0-9-]/g, "-").replace(/^-+|-+$/g, "")
    : "";
  return `h-${sanitized}${sanitized ? "-" : ""}${hash(stringify(obj))}`;
}

/**
 * @internal
 * Derivation options accepted by `scopedRule`. `host` is part of the bag so
 * callers forward their full resolved options in one argument; it does not
 * participate in derivation — sheet placement happens at registration.
 */
export interface ScopedRuleOptions {
  /** Label embedded between the prefix and the hash. */
  label?: string;
  /** Media condition interpolated verbatim — wraps the whole rule text as `@media {q}{ … }`. */
  media?: string;
  /** Registration host; ignored by derivation (see interface doc). */
  host?: ParentNode;
}

/**
 * @internal
 * The result of a scoped-rule derivation: the class name and the emitted
 * rule text (the registration identity).
 */
export interface ScopedRule {
  cls: string;
  cssText: string;
}

/**
 * @internal
 * Derives the deterministic scoped class and rule text for a style object —
 * no registration, no DOM. `scopedClassName` produces the class, `process`
 * emits the rules under `.{cls}`, and a `media` condition wraps the whole
 * text in the at-rule (`@media {q}{ … }`). Shared by `style()` (via
 * `resolveStyle`) and `cva()` — the same object, label, and media always
 * derive the same pair, which is what lets `removeStyle()` locate what either
 * API registered.
 * @param obj Style object to scope under the generated class
 * @param options Optional derivation bag — `label`, `media`, `host`
 * @returns The scoped class name and its emitted rule text
 */
export function scopedRule(obj: StyleObject, options: ScopedRuleOptions = {}): ScopedRule {
  const cls = scopedClassName(obj, options.label);
  const text = process(obj, `.${cls}`, false);
  return { cls, cssText: options.media ? `@media ${options.media}{${text}}` : text };
}
