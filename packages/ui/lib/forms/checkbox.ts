import { css, type CSSObject } from "@hellajs/css";
import { scale, size } from "../global";

const checkboxConfig = {
  size: size(1.125),
};

export const checkbox = (styles?: CSSObject) => css({
  appearance: "none",
  width: checkboxConfig.size,
  height: checkboxConfig.size,
  border: "2px solid var(--color-neutral-400)",
  borderRadius: size(0.25),
  backgroundColor: "var(--color-neutral-100)",
  cursor: "pointer",
  position: "relative",
  outline: "none",
  transition: "all 0.15s ease-in-out",
  flexShrink: 0,
  "&:hover": {
    borderColor: "var(--color-neutral-500)",
  },
  "&:focus": {
    borderColor: "var(--color-neutral-600)",
    boxShadow: "0 0 0 3px var(--color-neutral-200)",
  },
  "&:checked": {
    backgroundColor: "var(--color-neutral-600)",
    borderColor: "var(--color-neutral-600)",
    "&::after": {
      content: "",
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -60%) rotate(45deg)",
      width: size(0.3),
      height: size(0.55),
      border: "solid white",
      borderWidth: "0 2px 2px 0",
    },
  },
  "&:disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  ...styles
}, { name: "checkbox" });

export const checkboxColor = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      "&:checked": {
        backgroundColor: `var(--color-${colorKey}-600)`,
        borderColor: `var(--color-${colorKey}-600)`,
      },
      "&:focus": {
        boxShadow: `0 0 0 3px var(--color-${colorKey}-200)`,
      },
      ...styles
    }, { name: `checkbox-${colorKey}` });
  });
};

export const checkboxScale = (size: "sm" | "lg", styles?: CSSObject) => css({
  width: `calc(${checkboxConfig.size} * ${scale[size]})`,
  height: `calc(${checkboxConfig.size} * ${scale[size]})`,
  ...styles
}, { name: `checkbox-${size}` });

export const radio = (styles?: CSSObject) => css({
  borderRadius: "50%",
  "&:checked::after": {
    border: "none",
    width: size(0.5),
    height: size(0.5),
    borderRadius: "50%",
    backgroundColor: "white",
    transform: "translate(-50%, -50%)",
  },
  ...styles
}, { name: "radio" });

export const checkboxLabel = (styles?: CSSObject) => css({
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
}, { name: "checkbox-label" });

export const checkboxModule = (colorKeys: string[]) => {
  checkbox();
  checkboxColor(colorKeys);
  checkboxScale("sm");
  checkboxScale("lg");
  radio();
  checkboxLabel();
};
