import { css } from "@hellajs/css";
import { size } from "./global/utils";
import { colors } from "./global";

export const modalModule = () => {
  const baseDialog = css({
    border: "none",
    borderRadius: size(0.5),
    padding: 0,
    maxWidth: size(32),
    maxHeight: "85vh",
    overflow: "auto",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    "&::backdrop": {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(2px)"
    },
    "&[open]": {
      display: "flex",
      flexDirection: "column"
    }
  }, { name: "dialog" });

  const header = css({
    padding: size(1.5),
    borderBottom: `1px solid ${colors.neutral[200]}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: size(1)
  }, { name: "dialog-header" });

  const title = css({
    margin: 0,
    fontSize: size(1.25),
    fontWeight: 600,
    color: colors.neutral[900]
  }, { name: "dialog-title" });

  const closeBtn = css({
    background: "none",
    border: "none",
    fontSize: size(1.5),
    cursor: "pointer",
    color: colors.neutral[600],
    padding: size(0.25),
    lineHeight: 1,
    borderRadius: size(0.25),
    transition: "color 0.15s, background-color 0.15s",
    "&:hover": {
      color: colors.neutral[900],
      backgroundColor: colors.neutral[100]
    },
    "&:focus": {
      outline: `2px solid ${colors.primary[500]}`,
      outlineOffset: "2px"
    }
  }, { name: "dialog-close" });

  const body = css({
    padding: size(1.5),
    flex: 1,
    overflow: "auto"
  }, { name: "dialog-body" });

  const footer = css({
    padding: size(1.5),
    borderTop: `1px solid ${colors.neutral[200]}`,
    display: "flex",
    gap: size(0.75),
    justifyContent: "flex-end"
  }, { name: "dialog-footer" });

  return { baseDialog, header, title, closeBtn, body, footer };
};
