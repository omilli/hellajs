import { css, type CSSObject } from "@hellajs/css";
import { scale } from "./global";
import { size } from "./utils";

const button: CSSObject = {
  // Layout
  paddingInline: size(1.25),
  paddingBlock: size(1),
  // Typography
  fontSize: size(0.9),
  backgroundColor: "var(--color-neutral-900)",
  color: "var(--color-neutral-contrast900)",
};

css({
  // Layout
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  paddingInline: button.paddingInline,
  paddingBlock: button.paddingBlock,
  borderRadius: size(0.25),
  border: "none",
  // display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  // Typography
  fontSize: button.fontSize,
  fontWeight: 500,
  lineHeight: 1,
  // Colors
  backgroundColor: button.backgroundColor,
  color: button.color,
  // Interaction
  cursor: "pointer",
  userSelect: "none",
  outline: "none",
  transition: "all 0.1s ease-in-out",
  "&::before": {
    content: '',
    position: "absolute",
    inset: 0,
    backgroundColor: "black",
    opacity: 0,
    transition: "all 0.3s ease",
    mixBlendMode: "luminosity",
    zIndex: -1
  },
  "&:hover": {
    transform: "scale(1.01)",
    "&::before": {
      opacity: 0.1,
    }
  },
  "&:focus-visible": {
    outline: `2px solid var(--color-neutral-500)`,
    outlineOffset: "2px",
    borderColor: "var(--color-neutral-500)",
  },
  "&:active": {
    transform: "translateY(2px)",
    filter: "grayscale(0.3)",
  },
  "&:disabled": {
    opacity: 0.6,
    filter: "grayscale(0.7)",
    cursor: "not-allowed",
    "&:hover": {
      transform: "scale(1)",
      "&::before": {
        opacity: 0,
      }
    },
  }
}, { name: "btn" });


css({
  borderRadius: "9999px",
}, { name: "btn-rounded" });

css({
  width: "100%",
}, { name: "btn-full" });

css({
  width: size(2.5),
  height: size(2.5),
  padding: 0,
}, { name: "btn-icon" });

export const btnColor = (colorKeys: string[]) => {
  colorKeys.forEach((colorKey) => {
    css({
      backgroundColor: `var(--color-${colorKey}-500)`,
      color: `var(--color-${colorKey}-contrast500)`,
    }, { name: `btn-${colorKey}` })
  })
};

export const btnOutline = (colorKeys: string[]) => {
  colorKeys.forEach((colorKey) => {
    const baseColor = `var(--color-${colorKey}-600)`;
    css({
      backgroundColor: "transparent",
      "&::before": {
        backgroundColor: baseColor,
      },
      border: `1px solid ${baseColor}`,
      color: baseColor,
    }, { name: `btn-outline-${colorKey}` });
  });
};

export const btnSoft = (colorKeys: string[]) => {
  colorKeys.forEach((colorKey) => {
    const baseColor = `var(--color-${colorKey}-600)`;
    css({
      backgroundColor: "transparent",
      color: baseColor,
      "&::before": {
        backgroundColor: baseColor,
        opacity: 0.1
      },
      "&:hover::before": {
        opacity: 0.2
      }
    }, { name: `btn-soft-${colorKey}` });
  });
};

export const btnScale = (size: "sm" | "lg") => css({
  paddingInline: `calc(${button.paddingInline} * ${scale[size]})`,
  paddingBlock: `calc(${button.paddingBlock} * ${scale[size]})`,
  fontSize: `calc(${button.fontSize} * ${scale[size]})`,
}, { name: `btn-${size}` });