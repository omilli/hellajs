import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style({
  display: "flex",
  justifyContent: "center",
  marginInline: "auto",
  width: "100%",
}, { label: "hella-pagination", layer: "hella" });

const content = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "row",
  gap: "0.25rem",
}, { label: "hella-pagination-content", layer: "hella" });

const linkBase = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-pagination-link", layer: "hella" });

const linkVariants = {
  ghost: style({
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }, { label: "hella-pagination-link-ghost", layer: "hella" }),
  outline: style({
    background: "var(--background)",
    border: "1px solid var(--border)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *)": {
      borderColor: "var(--input)",
      background: "color-mix(in oklab, var(--input) 30%, transparent)",
    },
    "&:is(.dark *):hover": {
      background: "color-mix(in oklab, var(--input) 50%, transparent)",
    },
  }, { label: "hella-pagination-link-outline", layer: "hella" }),
};

const linkSizes = {
  default: style({
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }, { label: "hella-pagination-link-size-default", layer: "hella" }),
  xs: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    fontSize: "0.75rem",
    gap: "0.25rem",
    height: "1.5rem",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    "&:has(> svg)": {
      paddingInline: "0.375rem",
    },
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "hella-pagination-link-size-xs", layer: "hella" }),
  sm: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }, { label: "hella-pagination-link-size-sm", layer: "hella" }),
  lg: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }, { label: "hella-pagination-link-size-lg", layer: "hella" }),
  icon: style({
    height: "2.25rem",
    width: "2.25rem",
  }, { label: "hella-pagination-link-size-icon", layer: "hella" }),
  "icon-xs": style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "hella-pagination-link-size-icon-xs", layer: "hella" }),
  "icon-sm": style({
    height: "2rem",
    width: "2rem",
  }, { label: "hella-pagination-link-size-icon-sm", layer: "hella" }),
  "icon-lg": style({
    height: "2.5rem",
    width: "2.5rem",
  }, { label: "hella-pagination-link-size-icon-lg", layer: "hella" }),
};

const previous = style({
  gap: "0.25rem",
  paddingInline: "0.625rem",
  "@media (min-width: 40rem)": {
    "&": {
      paddingLeft: "0.625rem",
    },
  },
}, { label: "hella-pagination-previous", layer: "hella" });

const next = style({
  gap: "0.25rem",
  paddingInline: "0.625rem",
  "@media (min-width: 40rem)": {
    "&": {
      paddingRight: "0.625rem",
    },
  },
}, { label: "hella-pagination-next", layer: "hella" });

const hiddenUntilSm = style({
  display: "none",
  "@media (min-width: 40rem)": {
    "&": {
      display: "block",
    },
  },
}, { label: "hella-pagination-hidden-until-sm", layer: "hella" });

const srOnly = style({
  border: "0",
  clip: "rect(0, 0, 0, 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
}, { label: "hella-pagination-sr-only", layer: "hella" });

const ellipsis = style({
  alignItems: "center",
  display: "flex",
  height: "2.25rem",
  justifyContent: "center",
  width: "2.25rem",
  "& svg": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-pagination-ellipsis", layer: "hella" });

interface PaginationProps {
  children?: HellaChildren;
  class?: string;
}

export default function Pagination(props: PaginationProps): HellaNode {
  return html`
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      class="${
        [base, props.class]
      }"
    >${() => props.children}</nav>
  ` as HellaNode;
}

interface PaginationContentProps {
  children?: HellaChildren;
  class?: string;
}

export function PaginationContent(props: PaginationContentProps): HellaNode {
  return html`
    <ul
      data-slot="pagination-content"
      class="${
        [content, props.class]
      }"
    >${() => props.children}</ul>
  ` as HellaNode;
}

interface PaginationItemProps {
  children?: HellaChildren;
  class?: string;
}

export function PaginationItem(props: PaginationItemProps): HellaNode {
  return html`
    <li
      data-slot="pagination-item"
      class="${props.class}"
    >${() => props.children}</li>
  ` as HellaNode;
}

interface PaginationLinkProps {
  children?: HellaChildren;
  /** Renders aria-current="page" and the outline variant; no router coupling — href is an optional passthrough. */
  isActive?: boolean;
  href?: string;
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  class?: string;
  onclick?: () => void;
}

export function PaginationLink(props: PaginationLinkProps): HellaNode {
  return html`
    <a
      aria-current="${props.isActive ? "page" : undefined}"
      data-slot="pagination-link"
      data-active="${props.isActive === undefined ? undefined : String(props.isActive)}"
      href="${props.href}"
      class="${
        [
          linkBase,
          props.isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes[props.size ?? "icon"],
          props.class,
        ]
      }"
      e:click="${() => props.onclick?.()}"
    >${() => props.children}</a>
  ` as HellaNode;
}

interface PaginationNavProps {
  isActive?: boolean;
  href?: string;
  class?: string;
  onclick?: () => void;
}

export function PaginationPrevious(props: PaginationNavProps): HellaNode {
  return html`
    <a
      aria-label="Go to previous page"
      aria-current="${props.isActive ? "page" : undefined}"
      data-slot="pagination-link"
      data-active="${props.isActive === undefined ? undefined : String(props.isActive)}"
      href="${props.href}"
      class="${
        [
          linkBase,
          props.isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          previous,
          props.class,
        ]
      }"
      e:click="${() => props.onclick?.()}"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span class="${hiddenUntilSm}">Previous</span>
    </a>
  ` as HellaNode;
}

export function PaginationNext(props: PaginationNavProps): HellaNode {
  return html`
    <a
      aria-label="Go to next page"
      aria-current="${props.isActive ? "page" : undefined}"
      data-slot="pagination-link"
      data-active="${props.isActive === undefined ? undefined : String(props.isActive)}"
      href="${props.href}"
      class="${
        [
          linkBase,
          props.isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          next,
          props.class,
        ]
      }"
      e:click="${() => props.onclick?.()}"
    >
      <span class="${hiddenUntilSm}">Next</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </a>
  ` as HellaNode;
}

interface PaginationEllipsisProps {
  class?: string;
}

export function PaginationEllipsis(props: PaginationEllipsisProps): HellaNode {
  return html`
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      class="${
        [ellipsis, props.class]
      }"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4"
      >
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
      <span class="${srOnly}">More pages</span>
    </span>
  ` as HellaNode;
}
