import { css, type CSSObject } from "@hellajs/css";
import { scale, size, colors } from "../global";

const switchConfig = {
  width: size(2.5),
  height: size(1.375),
  thumbSize: size(1),
};

export const switchToggle = (styles?: CSSObject) => css({
  appearance: "none",
  position: "relative",
  width: switchConfig.width,
  height: switchConfig.height,
  backgroundColor: colors.neutral[300],
  border: "none",
  borderRadius: size(9999),
  cursor: "pointer",
  outline: "none",
  transition: "all 0.2s ease-in-out",
  flexShrink: 0,
  "&::before": {
    content: "",
    position: "absolute",
    top: "50%",
    left: size(0.1875),
    transform: "translateY(-50%)",
    width: switchConfig.thumbSize,
    height: switchConfig.thumbSize,
    backgroundColor: "white",
    borderRadius: "50%",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    transition: "all 0.2s ease-in-out",
  },
  "&:hover": {
    backgroundColor: colors.neutral[400],
  },
  "&:focus": {
    boxShadow: "0 0 0 3px var(--color-neutral-200)",
  },
  "&:checked": {
    backgroundColor: colors.neutral[600],
    "&::before": {
      left: "calc(100% - 1rem - 0.1875rem)",
    },
  },
  "&:disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  ...styles
}, { name: "switch" });

export const switchColor = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      "&:checked": {
        backgroundColor: colors[colorKey][600],
      },
      "&:focus": {
        boxShadow: `0 0 0 3px ${colors[colorKey][200]}`,
      },
      ...styles
    }, { name: `switch-${colorKey}` });
  });
};

export const switchScale = (size: "sm" | "lg", styles?: CSSObject) => css({
  width: `calc(${switchConfig.width} * ${scale[size]})`,
  height: `calc(${switchConfig.height} * ${scale[size]})`,
  "&::before": {
    width: `calc(${switchConfig.thumbSize} * ${scale[size]})`,
    height: `calc(${switchConfig.thumbSize} * ${scale[size]})`,
  },
  ...styles
}, { name: `switch-${size}` });

export const switchLabel = (styles?: CSSObject) => css({
  display: "inline-flex",
  alignItems: "center",
  gap: size(0.5),
  cursor: "pointer",
  fontSize: size(0.875),
  userSelect: "none",
  "&:has(input:disabled)": {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  ...styles
}, { name: "switch-label" });

export const switchModule = (colorKeys: string[]) => {
  switchToggle();
  switchColor(colorKeys);
  switchScale("sm");
  switchScale("lg");
  switchLabel();
};
