import { css, type CSSObject } from "@hellajs/css";
import { scale, size, colors } from "../global";

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
  backgroundColor: colors.neutral[100],
  color: colors.neutral[900],
  outline: "none",
  transition: "all 0.15s ease-in-out",
  "&::placeholder": {
    color: colors.neutral[400],
  },
  "&:hover": {
    borderColor: colors.neutral[400],
  },
  "&:focus": {
    borderColor: colors.neutral[500],
    backgroundColor: colors.neutral[100],
    boxShadow: "0 0 0 3px var(--color-neutral-200)",
  },
  "&:disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
    backgroundColor: colors.neutral[200],
  },
  ...styles
}, { name: "input" });

export const inputOutline = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      backgroundColor: "transparent",
      borderColor: colors[colorKey][400],
      "&:hover": {
        borderColor: colors[colorKey][500],
      },
      "&:focus": {
        borderColor: colors[colorKey][600],
        boxShadow: `0 0 0 3px ${colors[colorKey][200]}`,
      },
      ...styles
    }, { name: `input-outline-${colorKey}` });
  });
};

export const inputFilled = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      backgroundColor: colors[colorKey][100],
      borderColor: colors[colorKey][300],
      "&:hover": {
        borderColor: colors[colorKey][400],
      },
      "&:focus": {
        borderColor: colors[colorKey][500],
        backgroundColor: colors[colorKey][100],
        boxShadow: `0 0 0 3px ${colors[colorKey][200]}`,
      },
      ...styles
    }, { name: `input-filled-${colorKey}` });
  });
};

export const inputUnderline = (styles?: CSSObject) => css({
  borderRadius: 0,
  border: "none",
  borderBottom: "2px solid ${colors.neutral[300]}",
  backgroundColor: "transparent",
  paddingInline: 0,
  "&:hover": {
    borderBottomColor: colors.neutral[400],
  },
  "&:focus": {
    borderBottomColor: colors.neutral[600],
    boxShadow: "none",
  },
  ...styles
}, { name: "input-underline" });

export const inputRounded = (styles?: CSSObject) => css({
  borderRadius: size(9999),
  ...styles
}, { name: "input-rounded" });

export const inputScale = (size: "sm" | "lg", styles?: CSSObject) => css({
  paddingInline: `calc(${inputConfig.paddingInline} * ${scale[size]})`,
  paddingBlock: `calc(${inputConfig.paddingBlock} * ${scale[size]})`,
  fontSize: `calc(${inputConfig.fontSize} * ${scale[size]})`,
  ...styles
}, { name: `input-${size}` });

export const textarea = (styles?: CSSObject) => css({
  minHeight: size(5),
  resize: "vertical",
  ...styles
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
