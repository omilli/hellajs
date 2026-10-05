import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const list = style("breadcrumb-list", {
  alignItems: "center",
  color: "var(--muted-foreground)",
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
    color: "var(--foreground)",
  },
});

const page = style("breadcrumb-page", {
  color: "var(--foreground)",
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

interface BreadcrumbProps {
  children?: HellaChildren;
  class?: string;
}

export default function Breadcrumb(props: BreadcrumbProps): HellaNode {
  return html`
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      class="${
        [props.class]
      }"
    >${() => props.children}</nav>
  ` as HellaNode;
}

interface BreadcrumbPartProps {
  children?: HellaChildren;
  class?: string;
}

export function BreadcrumbList(props: BreadcrumbPartProps): HellaNode {
  return html`
    <ol
      data-slot="breadcrumb-list"
      class="${
        [list, props.class]
      }"
    >${() => props.children}</ol>
  ` as HellaNode;
}

export function BreadcrumbItem(props: BreadcrumbPartProps): HellaNode {
  return html`
    <li
      data-slot="breadcrumb-item"
      class="${
        [item, props.class]
      }"
    >${() => props.children}</li>
  ` as HellaNode;
}

interface BreadcrumbLinkProps {
  children?: HellaChildren;
  href?: string;
  class?: string;
}

export function BreadcrumbLink(props: BreadcrumbLinkProps): HellaNode {
  return html`
    <a
      data-slot="breadcrumb-link"
      href="${props.href}"
      class="${
        [link, props.class]
      }"
    >${() => props.children}</a>
  ` as HellaNode;
}

interface BreadcrumbPageProps {
  children?: HellaChildren;
  class?: string;
}

export function BreadcrumbPage(props: BreadcrumbPageProps): HellaNode {
  return html`
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      class="${
        [page, props.class]
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

interface BreadcrumbSeparatorProps {
  /** Replaces the inlined chevron when given. */
  children?: HellaChildren;
  class?: string;
}

export function BreadcrumbSeparator(props: BreadcrumbSeparatorProps): HellaNode {
  return html`
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      class="${
        [separator, props.class]
      }"
    >
      ${() => props.children ?? html`
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

export function BreadcrumbEllipsis(props: BreadcrumbPartProps): HellaNode {
  return html`
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
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
