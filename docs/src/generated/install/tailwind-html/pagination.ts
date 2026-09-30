import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const linkVariants = {
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
};

const linkSizes = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
  lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
  icon: "size-9",
  "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-8",
  "icon-lg": "size-10",
};

const previous = "gap-1 px-2.5 sm:pl-2.5";

const next = "gap-1 px-2.5 sm:pr-2.5";

const hiddenUntilSm = "hidden sm:block";

const srOnly = "sr-only";

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
        cn("mx-auto flex w-full justify-center", props.class)
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
        cn("flex flex-row items-center gap-1", props.class)
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
        cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          props.isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes[props.size ?? "icon"],
          props.class,
        )
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
        cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          props.isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          previous,
          props.class,
        )
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
        cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          props.isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          next,
          props.class,
        )
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
