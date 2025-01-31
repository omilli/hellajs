import {
  isFalsy,
  isRecord,
  isString,
  STYLE_CACHE,
  STYLE_CONFIG,
} from "../global";
import { effect } from "../reactive";
import {
  StyleConfig,
  StyleProcessor,
  StyleSizeTo,
  StyleValue,
  StyleValueWithConfig,
} from "./types";
import {
  createAtRuleProcessor,
  createInlineStyleString,
  createStyleProcessor,
} from "./processor";
import { hashStyle } from "./utils";

export function processStyles(
  styles: StyleValue,
  config?: StyleConfig,
  className?: string
): string {
  const styleConfig: StyleConfig = {
    ...STYLE_CONFIG,
    ...config,
  };
  const hash = hashStyle(JSON.stringify(styles));
  delete styles._styleConfig;
  const processor = createStyleProcessor(styleConfig as Required<StyleConfig>);
  switch (true) {
    case styleConfig.scope === "inline":
      return createInlineStyleString(styles, processor);
    case styleConfig.scope === "global" && isString(className):
      return handleGlobalStyles(styles, className, hash, processor);
    default:
      return handleScopedStyles(styles, hash, processor);
  }
}

export function processStyleRules(
  parentSelector: string,
  styles: Record<string, any>,
  styleRule: (selector: string, styles: Record<string, any>) => string
): [string[], string[]] {
  const rules: string[] = [];
  const atRules: string[] = [];
  const mergedStyles: Map<string, Record<string, any>> = new Map();

  Object.entries(styles).forEach(([key, value]) =>
    processStyleEntry(
      key,
      value,
      parentSelector,
      mergedStyles,
      atRules,
      styleRule
    )
  );

  mergedStyles.forEach((styleObj, selector) => {
    const rule = styleRule(selector, styleObj);
    rule && rules.push(rule);
  });

  return [rules, atRules];
}

export function handleDynamicStyles(
  element: HTMLElement,
  stylesFn: () => StyleValueWithConfig
): string {
  let className = "";
  effect(() => {
    const result = stylesFn();
    const config: StyleConfig = {
      ...STYLE_CONFIG,
      ...result._styleConfig,
    };
    const newClassName =
      config.scope === "inline"
        ? (applyInlineStyles(element, result, config.sizeTo!), "")
        : processStyles(result, config, element.className);

    className = newClassName;
    element.className = mergeClasses(
      element.className.split(" ").filter((c) => !c.startsWith("h-")),
      newClassName
    );
  });
  return className;
}

export function mergeClasses(existing: string[], generated: string): string {
  const newClasses = generated.split(" ").filter(Boolean);
  return [...new Set([...existing, ...newClasses])].join(" ");
}

function handleGlobalStyles(
  styles: StyleValue,
  className: string,
  hash: string,
  processor: StyleProcessor
): string {
  if (!STYLE_CACHE.global.has(hash)) {
    const [rules, atRules] = processor.processNestedStyles("", styles);
    const styleContent = [...rules, ...atRules].join("\n");
    const styleId = "hella-global-css";
    let styleSheet = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleSheet) {
      styleSheet = document.createElement("style");
      styleSheet.id = styleId;
      document.head.appendChild(styleSheet);
    }
    styleSheet.textContent += `\n${styleContent}`;
    STYLE_CACHE.global.set(hash, className);
  }
  return className;
}

function handleScopedStyles(
  styles: StyleValue,
  hash: string,
  processor: StyleProcessor
): string {
  const generatedClassName = `h-${hash}`;
  if (!STYLE_CACHE.scoped.has(hash)) {
    const [rules, atRules] = processor.processNestedStyles(
      `.${generatedClassName}`,
      styles
    );
    const styleContent = [...rules, ...atRules].join("\n");
    const styleId = "h-scoped-css";
    let styleSheet = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleSheet) {
      styleSheet = document.createElement("style");
      styleSheet.id = styleId;
      document.head.appendChild(styleSheet);
    }
    styleSheet.textContent += `\n${styleContent}`;
    STYLE_CACHE.scoped.set(hash, generatedClassName);
  }
  return STYLE_CACHE.scoped.get(hash) || generatedClassName;
}

function handleAtRule(
  rule: string,
  value: any,
  parentSelector: string,
  atRules: string[],
  styleRule: (selector: string, styles: Record<string, any>) => string
): void {
  const processor = createAtRuleProcessor((parentSelector, styles) =>
    processStyleRules(parentSelector, styles, styleRule)
  );
  const processed = processor(rule, value, parentSelector);
  if (processed) atRules.push(processed);
}

function applyInlineStyles(
  element: HTMLElement,
  styles: Record<string, any>,
  sizeTo: StyleSizeTo
): void {
  delete styles._styleConfig;
  const processor = createStyleProcessor({ scope: "inline", sizeTo });
  const styleObj = processor.processInlineStyles(styles);
  Object.assign(element.style, styleObj);
}

function processStyleEntry(
  key: string,
  value: any,
  parentSelector: string,
  mergedStyles: Map<string, Record<string, any>>,
  atRules: string[],
  styleRule: (selector: string, styles: Record<string, any>) => string
): void {
  const isNestedSelector = isRecord(value) && !isFalsy(value);
  switch (true) {
    case isNestedSelector:
      const nestedSelector = key.startsWith(":")
        ? `${parentSelector}${key}`
        : `${parentSelector} ${key}`;
      Object.entries(value).forEach(([nestedKey, nestedValue]) =>
        processStyleEntry(
          nestedKey,
          nestedValue,
          nestedSelector,
          mergedStyles,
          atRules,
          styleRule
        )
      );
      break;
    case key.startsWith("_"):
      return;
    case key.startsWith("@"):
      handleAtRule(key, value, parentSelector, atRules, styleRule);
      return;
    default:
      !mergedStyles.has(parentSelector) && mergedStyles.set(parentSelector, {});
      mergedStyles.get(parentSelector)![key] = value;
  }
}
