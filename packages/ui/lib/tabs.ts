import { css, type CSSObject } from "@hellajs/css";
import { scale, size, colors } from "./global";

const tabsConfig: CSSObject = {
  paddingInline: size(1),
  paddingBlock: size(0.75),
  fontSize: size(0.9),
};

export const tabList = (styles?: CSSObject) => css({
  display: "flex",
  gap: size(0.25),
  borderBottom: "2px solid var(--color-neutral-200)",
  listStyle: "none",
  margin: 0,
  padding: 0,
  ...styles
}, { name: "tabs" });

export const tab = (styles?: CSSObject) => css({
  position: "relative",
  paddingInline: tabsConfig.paddingInline,
  paddingBlock: tabsConfig.paddingBlock,
  fontSize: tabsConfig.fontSize,
  fontWeight: 500,
  backgroundColor: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  color: colors.neutral[600],
  cursor: "pointer",
  userSelect: "none",
  outline: "none",
  transition: "all 0.15s ease",
  marginBottom: "-2px",
  "&:hover": {
    color: colors.neutral[900],
    backgroundColor: colors.neutral[100],
  },
  "&:focus-visible": {
    outline: "2px solid var(--color-neutral-500)",
    outlineOffset: "2px",
  },
  "&[aria-selected='true']": {
    color: colors.neutral[900],
    borderBottomColor: colors.neutral[900],
  },
  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
    "&:hover": {
      color: colors.neutral[600],
      backgroundColor: "transparent",
    }
  },
  ...styles
}, { name: "tab" });

export const tabPanel = (styles?: CSSObject) => css({
  paddingBlock: size(1.5),
  "&[hidden]": {
    display: "none",
  },
  ...styles
}, { name: "tab-panel" });

export const tabColor = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      "&[aria-selected='true']": {
        color: colors[colorKey][600],
        borderBottomColor: colors[colorKey][600],
      },
      ...styles
    }, { name: `tab-${colorKey}` })
  })
};

export const tabUnderline = (styles?: CSSObject) => css({
  borderRadius: 0,
  "&:hover": {
    backgroundColor: "transparent",
    color: colors.neutral[900],
  },
  ...styles
}, { name: "tab-underline" });

export const tabPills = (styles?: CSSObject) => css({
  borderRadius: size(0.375),
  border: "none",
  marginBottom: 0,
  "&[aria-selected='true']": {
    backgroundColor: colors.neutral[900],
    color: colors.neutral.contrast900,
    borderBottomColor: "transparent",
  },
  ...styles
}, { name: "tab-pills" });

export const tabPillsColor = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      "&[aria-selected='true']": {
        backgroundColor: colors[colorKey][500],
        color: colors[colorKey].contrast500,
        borderBottomColor: "transparent",
      },
      ...styles
    }, { name: `tab-pills-${colorKey}` })
  })
};

export const tabPillsColorUnselected = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      color: colors[colorKey][600],
      "&:hover": {
        color: colors[colorKey][700],
      },
      ...styles
    }, { name: `tab-pills-soft-${colorKey}` })
  })
};

export const tabBordered = (styles?: CSSObject) => css({
  border: "1px solid ${colors.neutral[300]}",
  borderBottom: "1px solid var(--color-neutral-300)",
  borderRadius: size(0.375),
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  marginBottom: 0,
  "&[aria-selected='true']": {
    backgroundColor: colors.neutral[50],
    borderBottomColor: colors.neutral[50],
    zIndex: 1,
  },
  ...styles
}, { name: "tab-bordered" });

export const tabListBordered = (styles?: CSSObject) => css({
  borderBottom: "1px solid var(--color-neutral-300)",
  ...styles
}, { name: "tabs-bordered" });

export const tabPanelBordered = (styles?: CSSObject) => css({
  border: "1px solid var(--color-neutral-300)",
  borderTop: "none",
  padding: size(1.5),
  borderBottomLeftRadius: size(0.375),
  borderBottomRightRadius: size(0.375),
  ...styles
}, { name: "tab-panel-bordered" });

export const tabScale = (size: "sm" | "lg", styles?: CSSObject) => css({
  paddingInline: `calc(${tabsConfig.paddingInline} * ${scale[size]})`,
  paddingBlock: `calc(${tabsConfig.paddingBlock} * ${scale[size]})`,
  fontSize: `calc(${tabsConfig.fontSize} * ${scale[size]})`,
  ...styles
}, { name: `tab-${size}` });

export const tabsModule = (colorKeys: string[]) => {
  tabList();
  tab();
  tabPanel();
  tabColor(colorKeys);
  tabUnderline();
  tabPills();
  tabPillsColor(colorKeys);
  tabPillsColorUnselected(colorKeys);
  tabBordered();
  tabListBordered();
  tabPanelBordered();
  tabScale("sm");
  tabScale("lg");
};
