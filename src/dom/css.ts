import {
  STYLE_CACHE,
  kebabCase,
  STYLE_CONFIG,
  isString,
  isRecord,
  isFalsy,
} from "../global";
import { effect } from "../reactive";
import {
  StyleConfig,
  StyleProcessor,
  StyleSizeTo,
  StyleValue,
  StyleValueWithConfig,
} from "../types";

export function css(
  styles: StyleValue,
  config?: StyleConfig
): () => StyleValueWithConfig {
  return () => ({
    ...styles,
    _styleConfig: {
      ...STYLE_CONFIG,
      ...config,
    },
  });
}

export function globalStyles(styles: StyleValue): void {
  const hash = hashStyle(JSON.stringify(styles));
  if (STYLE_CACHE.global.has(hash)) return;
  const processor = createStyleProcessor({
    scope: STYLE_CONFIG.scope,
    sizeTo: STYLE_CONFIG.sizeTo,
  });
  const styleSheet = createStyleSheet(":root", styles, processor);
  document.head.appendChild(styleSheet);
  STYLE_CACHE.global.set(hash, styleSheet.textContent || "");
}

export function applyStyles(
  element: HTMLElement,
  styles: StyleValue | (() => StyleValueWithConfig)
): void {
  typeof styles === "function"
    ? handleDynamicStyles(element, styles)
    : (element.className = processStyles(styles));
}

function applyInlineStyles(
  element: HTMLElement,
  styles: Record<string, any>,
  sizeTo: StyleSizeTo
): void {
  const processor = createStyleProcessor({ scope: "inline", sizeTo });
  const styleObj = processor.processInlineStyles(styles);
  Object.assign(element.style, styleObj);
}

function processStyles(
  styles: StyleValue,
  config?: StyleConfig,
  className?: string
): string {
  const styleConfig: StyleConfig = {
    ...STYLE_CONFIG,
    ...config,
  };
  const hash = hashStyle(JSON.stringify(styles));
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

function processStyleEntry(
  key: string,
  value: any,
  parentSelector: string,
  mergedStyles: Map<string, Record<string, any>>,
  atRules: string[],
  styleRule: (selector: string, styles: Record<string, any>) => string
): void {
  const isNestedStyle = isRecord(value) && !isFalsy(value);
  switch (true) {
    case isNestedStyle:
      handleNestedStyle(key, value, parentSelector, mergedStyles);
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

function processStyleRules(
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

function handleNestedStyle(
  key: string,
  value: Record<string, any>,
  parentSelector: string,
  mergedStyles: Map<string, Record<string, any>>
): void {
  const selector = key.startsWith(":")
    ? `${parentSelector}${key}`
    : `${parentSelector} ${key}`;
  !mergedStyles.has(selector) && mergedStyles.set(selector, {});
  Object.assign(mergedStyles.get(selector)!, value);
}

function handleGlobalStyles(
  styles: StyleValue,
  className: string,
  hash: string,
  processor: StyleProcessor
): string {
  if (!STYLE_CACHE.global.has(hash)) {
    const selector = className
      .split(" ")
      .map((c) => `.${c}`)
      .join("");
    const [rules, atRules] = processor.processNestedStyles(selector, styles);
    const styleId = `hella-global-${hash}`;
    const styleContent = [...rules, ...atRules].join("\n");
    createAndAppendStyle(styleContent, styleId);
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
    const styleSheet = document.createElement("style");
    styleSheet.textContent = [...rules, ...atRules].join("\n");
    document.head.appendChild(styleSheet);
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

function handleDynamicStyles(
  element: HTMLElement,
  stylesFn: () => StyleValueWithConfig
): void {
  effect(() => {
    const result = stylesFn();
    const config: StyleConfig = {
      scope: STYLE_CONFIG.scope,
      sizeTo: STYLE_CONFIG.sizeTo,
      ...result._styleConfig,
    };
    config.scope === "inline"
      ? applyInlineStyles(element, result, config.sizeTo!)
      : (element.className = processStyles(result, config, element.className));
  });
}

function createStyleProcessor(config: StyleConfig): StyleProcessor {
  const processValue = createValueProcessor(
    config.sizeTo || STYLE_CONFIG.sizeTo!
  );
  function styleRule(selector: string, styles: Record<string, any>): string {
    const declarations = Object.entries(styles)
      .filter(([k]) => !k.startsWith("_"))
      .map(([prop, value]) => `${kebabCase(prop)}: ${processValue(value)};`)
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

function createValueProcessor(sizeTo: string) {
  return (value: any): string => {
    const resolved = typeof value === "function" ? value() : value;
    return typeof resolved === "number" ? `${resolved}${sizeTo}` : resolved;
  };
}

function createAtRuleProcessor(
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

function createInlineStyleProcessor(processValue: (value: any) => string) {
  return (styles: Record<string, any>): Record<string, string> => {
    return Object.fromEntries(
      Object.entries(styles)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, value]) => [key, processValue(value)])
    );
  };
}

function createStyleSheet(
  selector: string,
  styles: StyleValue,
  processor: StyleProcessor
): HTMLStyleElement {
  const [rules, atRules] = processor.processNestedStyles(selector, styles);
  const styleSheet = document.createElement("style");
  styleSheet.textContent = [...rules, ...atRules].join("\n");
  return styleSheet;
}

function createInlineStyleString(
  styles: Record<string, any>,
  processor: StyleProcessor
): string {
  const styleObj = processor.processInlineStyles(styles);
  return Object.entries(styleObj)
    .map(([key, value]) => `${kebabCase(key)}: ${value}`)
    .join(";");
}

function createAndAppendStyle(content: string, id: string): void {
  if (!document.getElementById(id)) {
    const styleSheet = document.createElement("style");
    styleSheet.id = id;
    styleSheet.textContent = content;
    document.head.appendChild(styleSheet);
  }
}

function hashStyle(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
