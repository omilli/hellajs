import { describe, expect, test } from "vite-plus/test";
import { inlineTypes } from "@hellajs/ui";

describe("inlineTypes", () => {
  test("replaces the types-module import line with the export-stripped body, package import riding along", () => {
    const source = [
      'import type { WidgetProps } from "./widget-types.js";',
      "",
      "export default function W(props: WidgetProps): string {",
      '  return props.label ?? "";',
      "}",
    ].join("\n");
    const typesModule = [
      'import type { HTMLAttributes } from "@hellajs/dom";',
      "",
      'export interface WidgetProps extends HTMLAttributes<"p"> {',
      "  label?: string;",
      "}",
    ].join("\n");
    expect(inlineTypes(source, typesModule)).toBe(
      [
        'import type { HTMLAttributes } from "@hellajs/dom";',
        "",
        'interface WidgetProps extends HTMLAttributes<"p"> {',
        "  label?: string;",
        "}",
        "",
        "export default function W(props: WidgetProps): string {",
        '  return props.label ?? "";',
        "}",
      ].join("\n"),
    );
  });

  test("folds a module type-import into the canonical's existing same-source line instead of double-declaring", () => {
    const source = [
      'import { signal } from "@hellajs/core";',
      'import type { HellaChildren } from "@hellajs/dom";',
      'import type { AccordionProps } from "./accordion-types.js";',
      "",
      "export default function A(props: AccordionProps): string {",
      '  return props.class ?? "";',
      "}",
    ].join("\n");
    const typesModule = [
      'import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";',
      "",
      'export interface AccordionProps extends HTMLAttributes<"div"> {',
      "  class?: string;",
      "  children?: HellaChildren;",
      "}",
    ].join("\n");
    expect(inlineTypes(source, typesModule)).toBe(
      [
        'import { signal } from "@hellajs/core";',
        'import type { HellaChildren, HTMLAttributes } from "@hellajs/dom";',
        "",
        'interface AccordionProps extends HTMLAttributes<"div"> {',
        "  class?: string;",
        "  children?: HellaChildren;",
        "}",
        "",
        "export default function A(props: AccordionProps): string {",
        '  return props.class ?? "";',
        "}",
      ].join("\n"),
    );
  });

  test("throws the no-import contract when the source imports no types module", () => {
    expect(() => inlineTypes("export const x = 1;", "export interface P {}")).toThrow(
      '[ui] inlineTypes: canonical imports no "./*-types.js" module',
    );
  });

  test("throws on duplicate types-module import lines", () => {
    const source = [
      'import type { P } from "./x-types.js";',
      'import type { Q } from "./y-types.js";',
    ].join("\n");
    expect(() => inlineTypes(source, "export interface P {}")).toThrow(
      "[ui] inlineTypes: duplicate types module import",
    );
  });

  test("throws on export default inside the types module, parseStyleModule's error reaching the caller", () => {
    const source = 'import type { P } from "./x-types.js";';
    expect(() => inlineTypes(source, "export default interface P {}")).toThrow(
      '[ui] applyStyleVariant: style module cannot use "export default interface P {}"',
    );
  });

  test("throws on a relative import specifier inside the types module", () => {
    const source = 'import type { P } from "./x-types.js";';
    const typesModule = ['import { tokens } from "./tokens.js";', "export interface P {}"].join(
      "\n",
    );
    expect(() => inlineTypes(source, typesModule)).toThrow(
      '[ui] applyStyleVariant: style module imports must use package specifiers, got "./tokens.js"',
    );
  });

  test("a printWidth-wrapped canonical types import inlines at the import site", () => {
    const source = [
      "import type {",
      "  WidgetProps,",
      '} from "./widget-types.js";',
      "",
      "export default function W(props: WidgetProps): string {",
      '  return props.label ?? "";',
      "}",
    ].join("\n");
    const typesModule = [
      'import type { HTMLAttributes } from "@hellajs/dom";',
      "",
      'export interface WidgetProps extends HTMLAttributes<"p"> {',
      "  label?: string;",
      "}",
    ].join("\n");
    expect(inlineTypes(source, typesModule)).toBe(
      [
        'import type { HTMLAttributes } from "@hellajs/dom";',
        "",
        'interface WidgetProps extends HTMLAttributes<"p"> {',
        "  label?: string;",
        "}",
        "",
        "export default function W(props: WidgetProps): string {",
        '  return props.label ?? "";',
        "}",
      ].join("\n"),
    );
  });

  test("a wrapped module type-import folds into the canonical's wrapped same-source import", () => {
    const source = [
      "import type {",
      "  HellaChildren,",
      '} from "@hellajs/dom";',
      'import type { WidgetProps } from "./widget-types.js";',
      "",
      "export default function W(props: WidgetProps): string {",
      '  return props.label ?? "";',
      "}",
    ].join("\n");
    const typesModule = [
      "import type {",
      "  HTMLAttributes,",
      '} from "@hellajs/dom";',
      "",
      'export interface WidgetProps extends HTMLAttributes<"p"> {',
      "  label?: string;",
      "}",
    ].join("\n");
    expect(inlineTypes(source, typesModule)).toBe(
      [
        'import type { HellaChildren, HTMLAttributes } from "@hellajs/dom";',
        "",
        'interface WidgetProps extends HTMLAttributes<"p"> {',
        "  label?: string;",
        "}",
        "",
        "export default function W(props: WidgetProps): string {",
        '  return props.label ?? "";',
        "}",
      ].join("\n"),
    );
  });

  test("a wrapped module type-import without a same-source target rides verbatim", () => {
    const source = [
      'import type { WidgetProps } from "./widget-types.js";',
      "",
      "export default function W(props: WidgetProps): string {",
      '  return props.label ?? "";',
      "}",
    ].join("\n");
    const typesModule = [
      "import type {",
      "  Variants,",
      '} from "@hellajs/css";',
      "",
      "export interface WidgetProps {",
      "  label?: string;",
      "}",
    ].join("\n");
    expect(inlineTypes(source, typesModule)).toBe(
      [
        "import type {",
        "  Variants,",
        '} from "@hellajs/css";',
        "",
        "interface WidgetProps {",
        "  label?: string;",
        "}",
        "",
        "export default function W(props: WidgetProps): string {",
        '  return props.label ?? "";',
        "}",
      ].join("\n"),
    );
  });
});
