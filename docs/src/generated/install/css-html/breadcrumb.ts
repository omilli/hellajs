import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const list = style("breadcrumb-list", {
  alignItems: "center",
  color: tokens.mutedForeground,
  display: "flex",
  flexWrap: "wrap",
  fontSize: "0.875rem",
  gap: "0.375rem",
  lineHeight: "1.25rem",
  listStyle: "none",
  margin: "0",
  overflowWrap: "break-word",
  padding: "0",
  "@media (min-width: 40rem)": {
    "&": {
      gap: "0.625rem",
    },
  },
});

const item = style("breadcrumb-item", {
  alignItems: "center",
  display: "inline-flex",
  gap: "0.375rem",
});

const link = style("breadcrumb-link", {
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    color: tokens.foreground,
  },
});

const page = style("breadcrumb-page", {
  color: tokens.foreground,
  fontWeight: "400",
});

const separator = style("breadcrumb-separator", {
  "& svg": {
    height: "0.875rem",
    width: "0.875rem",
  },
});

const ellipsis = style("breadcrumb-ellipsis", {
  alignItems: "center",
  display: "flex",
  height: "2.25rem",
  justifyContent: "center",
  width: "2.25rem",
});

const ellipsisIcon = style("breadcrumb-ellipsis-icon", {
  height: "1rem",
  width: "1rem",
});

const srOnly = style("breadcrumb-sr-only", {
  border: "0",
  clip: "rect(0, 0, 0, 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
});

interface BreadcrumbProps extends HTMLAttributes<"nav"> {
  class?: string;
  children?: HellaChildren;
}

export default function Breadcrumb({ children, class: cls, ...attrs }: BreadcrumbProps): HellaNode {
  return html`
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      class="${
        [cls]
      }"
      ...${attrs}
    >${() => children}</nav>
  ` as HellaNode;
}

interface BreadcrumbPartProps extends HTMLAttributes<"li"> {
  class?: string;
  children?: HellaChildren;
}

export function BreadcrumbList({ children, class: cls, ...attrs }: BreadcrumbPartProps): HellaNode {
  return html`
    <ol
      data-slot="breadcrumb-list"
      class="${
        [list, cls]
      }"
      ...${attrs}
    >${() => children}</ol>
  ` as HellaNode;
}

export function BreadcrumbItem({ children, class: cls, ...attrs }: BreadcrumbPartProps): HellaNode {
  return html`
    <li
      data-slot="breadcrumb-item"
      class="${
        [item, cls]
      }"
      ...${attrs}
    >${() => children}</li>
  ` as HellaNode;
}

interface BreadcrumbLinkProps extends HTMLAttributes<"a"> {
  class?: string;
  children?: HellaChildren;
}

export function BreadcrumbLink({ children, class: cls, ...attrs }: BreadcrumbLinkProps): HellaNode {
  return html`
    <a
      data-slot="breadcrumb-link"
      class="${
        [link, cls]
      }"
      ...${attrs}
    >${() => children}</a>
  ` as HellaNode;
}

interface BreadcrumbPageProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function BreadcrumbPage({ children, class: cls, ...attrs }: BreadcrumbPageProps): HellaNode {
  return html`
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      class="${
        [page, cls]
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface BreadcrumbSeparatorProps extends HTMLAttributes<"li"> {
  /** Replaces the inlined chevron when given. */
  children?: HellaChildren;
  class?: string;
}

export function BreadcrumbSeparator({ children, class: cls, ...attrs }: BreadcrumbSeparatorProps): HellaNode {
  return html`
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      class="${
        [separator, cls]
      }"
      ...${attrs}
    >
      ${() => children ?? html`
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
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>`}
    </li>
  ` as HellaNode;
}

interface BreadcrumbEllipsisProps extends HTMLAttributes<"span"> {
  class?: string;
}

export function BreadcrumbEllipsis({ class: cls, ...attrs }: BreadcrumbEllipsisProps): HellaNode {
  return html`
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      class="${
        [ellipsis, cls]
      }"
      ...${attrs}
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
        aria-hidden="true"
        class="${
          [ellipsisIcon]
        }"
      >
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
      <span class="${srOnly}">More</span>
    </span>
  ` as HellaNode;
}
