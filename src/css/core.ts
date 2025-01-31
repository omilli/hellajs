import { STYLE_CACHE, STYLE_CONFIG } from "../global";
import { StyleConfig, StyleValue, StyleValueWithConfig } from "./types";
import { createStyleProcessor } from "./processor";
import { hashStyle } from "./utils";
import { handleDynamicStyles, mergeClasses, processStyles } from "./handlers";

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
  const processor = createStyleProcessor({ ...STYLE_CONFIG });
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
  STYLE_CACHE.global.set(hash, styleContent);
}

export function applyStyles(
  element: HTMLElement,
  styles: StyleValue | (() => StyleValueWithConfig)
): void {
  const existingClasses = element.className.split(" ").filter(Boolean);
  const cssClasses =
    typeof styles === "function"
      ? handleDynamicStyles(element, styles)
      : processStyles(styles);

  element.className = mergeClasses(existingClasses, cssClasses);
}
