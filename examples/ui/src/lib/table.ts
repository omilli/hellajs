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
  backgroundColor: "var(--color-neutral-100)",
  color: "var(--color-neutral-900)",
  "& thead": {
    backgroundColor: "var(--color-neutral-200)",
    borderBottom: `2px solid var(--color-neutral-300)`,
  },
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
    borderBottom: `1px solid var(--color-neutral-200)`,
  },
  "& tbody tr:last-child td": {
    borderBottom: "none",
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

export const tableContainer = () => css({
  width: "100%",
  overflowX: "auto",
  position: "relative",
  borderRadius: size(0.25),
  border: `1px solid var(--color-neutral-200)`,
  "@media (max-width: 768px)": {
    borderRadius: 0,
    border: "none",
    borderTop: `1px solid var(--color-neutral-200)`,
    borderBottom: `1px solid var(--color-neutral-200)`,
  },
}, { name: "table-container" });

export const tableStriped = () => css({
  "& tbody tr:nth-child(even)": {
    backgroundColor: "var(--color-neutral-150)",
  },
}, { name: "table-striped" });

export const tableBordered = () => css({
  "& th, & td": {
    border: `1px solid var(--color-neutral-200)`,
  },
}, { name: "table-bordered" });

export const tableHover = () => css({
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
}, { name: "table-hover" });

export const tableCompact = () => css({
  "& th": {
    paddingInline: `calc(${tableConfig.paddingInline} * 0.5)`,
    paddingBlock: `calc(${tableConfig.paddingBlock} * 0.5)`,
  },
  "& td": {
    paddingInline: `calc(${tableConfig.paddingInline} * 0.5)`,
    paddingBlock: `calc(${tableConfig.paddingBlock} * 0.5)`,
  },
}, { name: "table-compact" });

export const tableSticky = () => css({
  "& thead": {
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
}, { name: "table-sticky" });

export const tableColor = (colorKeys: string[]) => {
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
    }, { name: `table-${colorKey}` });
  });
};

export const tableScale = (size: "sm" | "lg") => css({
  fontSize: `calc(${tableConfig.fontSize} * ${scale[size]})`,
  "& th": {
    paddingInline: `calc(${tableConfig.paddingInline} * ${scale[size]})`,
    paddingBlock: `calc(${tableConfig.paddingBlock} * ${scale[size]})`,
  },
  "& td": {
    paddingInline: `calc(${tableConfig.paddingInline} * ${scale[size]})`,
    paddingBlock: `calc(${tableConfig.paddingBlock} * ${scale[size]})`,
  },
}, { name: `table-${size}` });

export const tableModule = (colorKeys: string[]) => {
  table();
  tableContainer();
  tableStriped();
  tableBordered();
  tableHover();
  tableCompact();
  tableSticky();
  tableColor(colorKeys);
  tableScale("sm");
  tableScale("lg");
};
