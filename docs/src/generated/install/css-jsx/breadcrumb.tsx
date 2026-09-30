import type { HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";

const list = style({
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
}, { label: "hella-breadcrumb-list", layer: "hella" });

const item = style({
  alignItems: "center",
  display: "inline-flex",
  gap: "0.375rem",
}, { label: "hella-breadcrumb-item", layer: "hella" });

const link = style({
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    color: "var(--foreground)",
  },
}, { label: "hella-breadcrumb-link", layer: "hella" });

const page = style({
  color: "var(--foreground)",
  fontWeight: "400",
}, { label: "hella-breadcrumb-page", layer: "hella" });

const separator = style({
  "& svg": {
    height: "0.875rem",
    width: "0.875rem",
  },
}, { label: "hella-breadcrumb-separator", layer: "hella" });

const ellipsis = style({
  alignItems: "center",
  display: "flex",
  height: "2.25rem",
  justifyContent: "center",
  width: "2.25rem",
}, { label: "hella-breadcrumb-ellipsis", layer: "hella" });

const ellipsisIcon = style({
  height: "1rem",
  width: "1rem",
}, { label: "hella-breadcrumb-ellipsis-icon", layer: "hella" });

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
}, { label: "hella-breadcrumb-sr-only", layer: "hella" });

interface BreadcrumbProps {
  children?: HellaChildren;
  class?: string;
}

export default function Breadcrumb(props: BreadcrumbProps): JSX.Element {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      class={
        [props.class]
      }
    >
      {props.children}
    </nav>
  );
}

interface BreadcrumbPartProps {
  children?: HellaChildren;
  class?: string;
}

export function BreadcrumbList(props: BreadcrumbPartProps): JSX.Element {
  return (
    <ol
      data-slot="breadcrumb-list"
      class={
        [list, props.class]
      }
    >
      {props.children}
    </ol>
  );
}

export function BreadcrumbItem(props: BreadcrumbPartProps): JSX.Element {
  return (
    <li
      data-slot="breadcrumb-item"
      class={
        [item, props.class]
      }
    >
      {props.children}
    </li>
  );
}

interface BreadcrumbLinkProps {
  children?: HellaChildren;
  href?: string;
  class?: string;
}

export function BreadcrumbLink(props: BreadcrumbLinkProps): JSX.Element {
  return (
    <a
      data-slot="breadcrumb-link"
      href={props.href}
      class={
        [link, props.class]
      }
    >
      {props.children}
    </a>
  );
}

interface BreadcrumbPageProps {
  children?: HellaChildren;
  class?: string;
}

export function BreadcrumbPage(props: BreadcrumbPageProps): JSX.Element {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      class={
        [page, props.class]
      }
    >
      {props.children}
    </span>
  );
}

interface BreadcrumbSeparatorProps {
  /** Replaces the inlined chevron when given. */
  children?: HellaChildren;
  class?: string;
}

export function BreadcrumbSeparator(props: BreadcrumbSeparatorProps): JSX.Element {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      class={
        [separator, props.class]
      }
    >
      {() => props.children ?? (
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
        </svg>
      )}
    </li>
  );
}

export function BreadcrumbEllipsis(props: BreadcrumbPartProps): JSX.Element {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      class={
        [ellipsis, props.class]
      }
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
        class={
          [ellipsisIcon]
        }
      >
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
      <span class={srOnly}>More</span>
    </span>
  );
}
