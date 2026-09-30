import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const srOnly = "sr-only";

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
        cn(props.class)
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
        cn("flex flex-wrap list-none items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5", props.class)
      }"
    >${() => props.children}</ol>
  ` as HellaNode;
}

export function BreadcrumbItem(props: BreadcrumbPartProps): HellaNode {
  return html`
    <li
      data-slot="breadcrumb-item"
      class="${
        cn("inline-flex items-center gap-1.5", props.class)
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
        cn("transition-colors hover:text-foreground", props.class)
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
        cn("font-normal text-foreground", props.class)
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
        cn("[&>svg]:size-3.5", props.class)
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
        cn("flex size-9 items-center justify-center", props.class)
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
          cn("size-4")
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
