import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

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
        cn(cls)
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
        cn("flex flex-wrap list-none items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5", cls)
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
        cn("inline-flex items-center gap-1.5", cls)
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
        cn("transition-colors hover:text-foreground", cls)
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
        cn("font-normal text-foreground", cls)
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
        cn("[&>svg]:size-3.5", cls)
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
        cn("flex size-9 items-center justify-center", cls)
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
          cn("size-4")
        }"
      >
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
      <span class="sr-only">More</span>
    </span>
  ` as HellaNode;
}
