import { css, type CSSObject } from "@hellajs/css";
import { scale } from "./global";
import { size } from "./utils";

const tableConfig: CSSObject = {
  paddingInline: size(0.75),
  paddingBlock: size(0.5),
  fontSize: size(0.9),
};

export const table = (styles?: CSSObject) => css({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: tableConfig.fontSize,
  backgroundColor: "transparent",
  color: "var(--color-neutral-900)",
  "& th": {
    paddingInline: tableConfig.paddingInline,
    paddingBlock: tableConfig.paddingBlock,
    textAlign: "left",
    fontWeight: 600,
    color: "var(--color-neutral-900)",
  },
  "& td": {
    paddingInline: tableConfig.paddingInline,
    paddingBlock: tableConfig.paddingBlock,
  },
  "& caption": {
    paddingBlock: tableConfig.paddingBlock,
    fontSize: tableConfig.fontSize,
    fontWeight: 600,
    textAlign: "left",
    color: "var(--color-neutral-700)",
  },
  ...styles
}, { name: "table" });

export const tableContainer = (styles?: CSSObject) => css({
  width: "100%",
  overflowX: "auto",
  position: "relative",
  "@media (max-width: 768px)": {
    marginInline: `calc(${size(1)} * -1)`,
  },
  ...styles
}, { name: "table-container" });

export const tableStriped = (styles?: CSSObject) => css({
  "& tbody tr:nth-child(even)": {
    backgroundColor: "var(--color-neutral-150)",
  },
  ...styles
}, { name: "table-striped" });

export const tableBordered = (styles?: CSSObject) => css({
  "& thead": {
    borderBottom: `2px solid var(--color-neutral-300)`,
  },
  "& tbody tr": {
    borderBottom: `1px solid var(--color-neutral-200)`,
  },
  "& tbody tr:last-child": {
    borderBottom: "none",
  },
  ...styles
}, { name: "table-bordered" });

export const tableBorderedCells = (styles?: CSSObject) => css({
  border: `1px solid var(--color-neutral-200)`,
  "& th, & td": {
    border: `1px solid var(--color-neutral-200)`,
  },
  ...styles
}, { name: "table-bordered-cells" });

export const tableHover = (styles?: CSSObject) => css({
  "& tbody tr": {
    transition: "background-color 0.15s ease",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "var(--color-neutral-200)",
    },
    "&:focus-visible": {
      outline: `2px solid var(--color-neutral-500)`,
      outlineOffset: "-2px",
    },
  },
  ...styles
}, { name: "table-hover" });

export const tableCompact = (styles?: CSSObject) => css({
  "& th": {
    paddingInline: `calc(${tableConfig.paddingInline} * 0.5)`,
    paddingBlock: `calc(${tableConfig.paddingBlock} * 0.5)`,
  },
  "& td": {
    paddingInline: `calc(${tableConfig.paddingInline} * 0.5)`,
    paddingBlock: `calc(${tableConfig.paddingBlock} * 0.5)`,
  },
  ...styles
}, { name: "table-compact" });

export const tableSticky = (styles?: CSSObject) => css({
  "& thead": {
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  ...styles
}, { name: "table-sticky" });

export const tableColor = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      "& thead": {
        backgroundColor: `var(--color-${colorKey}-500)`,
        color: `var(--color-${colorKey}-contrast500)`,
        borderBottomColor: `var(--color-${colorKey}-600)`,
      },
      "& th": {
        color: `var(--color-${colorKey}-contrast500)`,
      },
      ...styles
    }, { name: `table-${colorKey}` });
  });
};

export const tableScale = (size: "sm" | "lg", styles?: CSSObject) => css({
  fontSize: `calc(${tableConfig.fontSize} * ${scale[size]})`,
  "& th": {
    paddingInline: `calc(${tableConfig.paddingInline} * ${scale[size]})`,
    paddingBlock: `calc(${tableConfig.paddingBlock} * ${scale[size]})`,
  },
  "& td": {
    paddingInline: `calc(${tableConfig.paddingInline} * ${scale[size]})`,
    paddingBlock: `calc(${tableConfig.paddingBlock} * ${scale[size]})`,
  },
  ...styles
}, { name: `table-${size}` });

export const tableModule = (colorKeys: string[]) => {
  table();
  tableContainer();
  tableStriped();
  tableBordered();
  tableBorderedCells();
  tableHover();
  tableCompact();
  tableSticky();
  tableColor(colorKeys);
  tableScale("sm");
  tableScale("lg");
};
