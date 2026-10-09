import type { HTMLAttributes } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("textarea", {
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  fieldSizing: "content",
  minHeight: "4rem",
  outlineStyle: "none",
  paddingBlock: "0.5rem",
  paddingInline: "0.75rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&::placeholder": {
    color: "var(--muted-foreground)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "@media (min-width: 48rem)": {
    "&": {
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
    },
  },
  "&:is(.dark *)": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
});

const focus = style("textarea-focus", {
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
});

const invalid = style("textarea-invalid", {
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
});

interface TextareaProps extends HTMLAttributes<"textarea"> {
  class?: string;
}

export default function Textarea({ class: cls, ...attrs }: TextareaProps): JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      class={
        [
          base,
          focus,
          invalid,
          cls,
        ]
      }
      {...attrs}
    />
  );
}
