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

export const labelRequired = () => css({
  "&::after": {
    content: "*",
    color: "var(--color-error-500)",
    marginLeft: size(0.25),
  },
}, { name: "label-required" });

export const helperText = () => css({
  display: "block",
  fontSize: size(0.75),
  marginTop: size(0.25),
  color: "var(--color-neutral-500)",
}, { name: "helper-text" });

export const errorText = () => css({
  display: "block",
  fontSize: size(0.75),
  marginTop: size(0.25),
  color: "var(--color-error-600)",
}, { name: "error-text" });

export const successText = () => css({
  display: "block",
  fontSize: size(0.75),
  marginTop: size(0.25),
  color: "var(--color-success-600)",
}, { name: "success-text" });

export const formGroup = () => css({
  marginBottom: size(1),
}, { name: "form-group" });

export const labelModule = () => {
  label();
  labelRequired();
  helperText();
  errorText();
  successText();
  formGroup();
};
