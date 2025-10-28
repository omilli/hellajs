import { css, type CSSObject } from "@hellajs/css";
import { scale } from "./global";
import { size } from "./utils";

const selectConfig: CSSObject = {
  paddingInline: size(0.75),
  paddingBlock: size(0.5),
  fontSize: size(1),
};

export const select = (styles?: CSSObject) => css({
  position: "relative",
  paddingInline: selectConfig.paddingInline,
  paddingBlock: selectConfig.paddingBlock,
  paddingRight: size(2.5),
  borderRadius: size(0.25),
  border: "1px solid var(--color-neutral-300)",
  display: "block",
  width: "100%",
  fontSize: selectConfig.fontSize,
  lineHeight: 1.5,
  backgroundColor: "var(--color-neutral-100)",
  color: "var(--color-neutral-900)",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.75rem center",
  backgroundSize: size(0.75),
  transition: "all 0.15s ease-in-out",
  "&:hover": {
    borderColor: "var(--color-neutral-400)",
  },
  "&:focus": {
    borderColor: "var(--color-neutral-500)",
    backgroundColor: "var(--color-neutral-100)",
    boxShadow: "0 0 0 3px var(--color-neutral-200)",
  },
  "&:disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
    backgroundColor: "var(--color-neutral-200)",
  },
  ...styles
}, { name: "select" });

export const selectOutline = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      backgroundColor: "transparent",
      borderColor: `var(--color-${colorKey}-400)`,
      "&:hover": {
        borderColor: `var(--color-${colorKey}-500)`,
      },
      "&:focus": {
        borderColor: `var(--color-${colorKey}-600)`,
        boxShadow: `0 0 0 3px var(--color-${colorKey}-200)`,
      },
      ...styles
    }, { name: `select-outline-${colorKey}` });
  });
};

export const selectFilled = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      backgroundColor: `var(--color-${colorKey}-100)`,
      borderColor: `var(--color-${colorKey}-300)`,
      "&:hover": {
        borderColor: `var(--color-${colorKey}-400)`,
      },
      "&:focus": {
        borderColor: `var(--color-${colorKey}-500)`,
        backgroundColor: `var(--color-${colorKey}-100)`,
        boxShadow: `0 0 0 3px var(--color-${colorKey}-200)`,
      },
      ...styles
    }, { name: `select-filled-${colorKey}` });
  });
};

export const selectRounded = (styles?: CSSObject) => css({
  borderRadius: size(9999),
  ...styles
}, { name: "select-rounded" });

export const selectScale = (size: "sm" | "lg", styles?: CSSObject) => css({
  paddingInline: `calc(${selectConfig.paddingInline} * ${scale[size]})`,
  paddingBlock: `calc(${selectConfig.paddingBlock} * ${scale[size]})`,
  fontSize: `calc(${selectConfig.fontSize} * ${scale[size]})`,
  ...styles
}, { name: `select-${size}` });

export const selectModule = (colorKeys: string[]) => {
  select();
  selectOutline(colorKeys);
  selectFilled(colorKeys);
  selectRounded();
  selectScale("sm");
  selectScale("lg");
};
