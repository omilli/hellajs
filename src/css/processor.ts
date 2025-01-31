import {
  isFunction,
  isNumber,
  isRecord,
  kebabCase,
  STYLE_SIZE_IGNORE,
  STYLE_CONFIG,
} from "../global";
import { StyleConfig, StyleProcessor } from "./types";
import { processStyleRules } from "./handlers";

export function createStyleProcessor(config: StyleConfig): StyleProcessor {
  const processValue = createValueProcessor(
    config.sizeTo || STYLE_CONFIG.sizeTo!
  );

  function styleRule(selector: string, styles: Record<string, any>): string {
    const declarations = Object.entries(styles)
      .map(([prop, value]) =>
        isRecord(value)
          ? ""
          : `${kebabCase(prop)}: ${processValue(value, prop)};`
      )
      .filter(Boolean)
      .join(" ");
    return declarations ? `${selector} { ${declarations} }` : "";
  }

  function processNestedStyles(
    parentSelector: string,
    styles: Record<string, any>
  ): [string[], string[]] {
    return processStyleRules(parentSelector, styles, styleRule);
  }

  return {
    processNestedStyles,
    processAtRule: createAtRuleProcessor(processNestedStyles),
    processInlineStyles: createInlineStyleProcessor(processValue),
  };
}

export function createAtRuleProcessor(
  processNestedStyles: (
    parentSelector: string,
    styles: Record<string, any>
  ) => [string[], string[]]
) {
  return (rule: string, value: any, parentSelector: string): string => {
    if (typeof value !== "object" || !value) return "";
    const [rules, atRules] = processNestedStyles(parentSelector, value);
    const content = [...rules, ...atRules].join("\n");
    return content ? `${rule} {\n${content}\n}` : "";
  };
}

export function createInlineStyleString(
  styles: Record<string, any>,
  processor: StyleProcessor
): string {
  const styleObj = processor.processInlineStyles(styles);
  return Object.entries(styleObj)
    .map(([key, value]) => `${kebabCase(key)}: ${value}`)
    .join(";");
}

function createValueProcessor(sizeTo: string) {
  return (value: any, prop?: string): string => {
    const resolved = isFunction(value) ? value() : value;
    const shouldAddUnit =
      isNumber(resolved) && prop && !STYLE_SIZE_IGNORE.has(prop.toLowerCase());
    return shouldAddUnit ? `${resolved}${sizeTo}` : resolved;
  };
}

function createInlineStyleProcessor(processValue: (value: any) => string) {
  return (styles: Record<string, any>): Record<string, string> => {
    return Object.fromEntries(
      Object.entries(styles)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, value]) => [key, processValue(value)])
    );
  };
}
