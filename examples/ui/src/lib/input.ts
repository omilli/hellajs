import { css, type CSSObject } from "@hellajs/css";
import { scale } from "./global";
import { size } from "./utils";

const inputConfig: CSSObject = {
  paddingInline: size(0.75),
  paddingBlock: size(0.5),
  fontSize: size(1),
};

export const input = (styles?: CSSObject) => css({
  position: "relative",
  paddingInline: inputConfig.paddingInline,
  paddingBlock: inputConfig.paddingBlock,
  borderRadius: size(0.25),
  border: "1px solid var(--color-neutral-300)",
  display: "block",
  width: "100%",
  fontSize: inputConfig.fontSize,
  lineHeight: 1.5,
  backgroundColor: "var(--color-neutral-100)",
  color: "var(--color-neutral-900)",
  outline: "none",
  transition: "all 0.15s ease-in-out",
  "&::placeholder": {
    color: "var(--color-neutral-400)",
  },
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
}, { name: "input" });

export const inputOutline = (colorKeys: string[]) => {
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
    }, { name: `input-outline-${colorKey}` });
  });
};

export const inputFilled = (colorKeys: string[]) => {
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
    }, { name: `input-filled-${colorKey}` });
  });
};

export const inputUnderline = () => css({
  borderRadius: 0,
  border: "none",
  borderBottom: "2px solid var(--color-neutral-300)",
  backgroundColor: "transparent",
  paddingInline: 0,
  "&:hover": {
    borderBottomColor: "var(--color-neutral-400)",
  },
  "&:focus": {
    borderBottomColor: "var(--color-neutral-600)",
    boxShadow: "none",
  },
}, { name: "input-underline" });

export const inputRounded = () => css({
  borderRadius: size(9999),
}, { name: "input-rounded" });

export const inputScale = (size: "sm" | "lg") => css({
  paddingInline: `calc(${inputConfig.paddingInline} * ${scale[size]})`,
  paddingBlock: `calc(${inputConfig.paddingBlock} * ${scale[size]})`,
  fontSize: `calc(${inputConfig.fontSize} * ${scale[size]})`,
}, { name: `input-${size}` });

export const textarea = () => css({
  minHeight: size(5),
  resize: "vertical",
}, { name: "textarea" });

export const inputModule = (colorKeys: string[]) => {
  input();
  inputOutline(colorKeys);
  inputFilled(colorKeys);
  inputUnderline();
  inputRounded();
  inputScale("sm");
  inputScale("lg");
  textarea();
};
