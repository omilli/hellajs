import { css, type CSSObject } from "@hellajs/css";
import { size } from "./utils";

export const label = (styles?: CSSObject) => css({
  display: "block",
  fontSize: size(0.875),
  fontWeight: 500,
  marginBottom: size(0.375),
  color: "var(--color-neutral-700)",
  ...styles
}, { name: "label" });

export const labelRequired = (styles?: CSSObject) => css({
  "&::after": {
    content: "*",
    color: "var(--color-error-500)",
    marginLeft: size(0.25),
  },
  ...styles
}, { name: "label-required" });

export const helperText = (styles?: CSSObject) => css({
  display: "block",
  fontSize: size(0.75),
  marginTop: size(0.25),
  color: "var(--color-neutral-500)",
  ...styles
}, { name: "helper-text" });

export const errorText = (styles?: CSSObject) => css({
  display: "block",
  fontSize: size(0.75),
  marginTop: size(0.25),
  color: "var(--color-error-600)",
  ...styles
}, { name: "error-text" });

export const successText = (styles?: CSSObject) => css({
  display: "block",
  fontSize: size(0.75),
  marginTop: size(0.25),
  color: "var(--color-success-600)",
  ...styles
}, { name: "success-text" });

export const labelModule = () => {
  label();
  labelRequired();
  helperText();
  errorText();
  successText();
};
