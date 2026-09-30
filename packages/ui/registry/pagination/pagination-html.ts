import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const content: string;
declare const ellipsis: string;
declare const hiddenUntilSm: string;
declare const linkBase: string;
declare const linkSizes: Record<string, string>;
declare const linkVariants: Record<string, string>;
declare const next: string;
declare const previous: string;
declare const srOnly: string;
// @hella:end

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
        // @hella:compose
        [base, props.class]
        // @hella:end
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
        // @hella:compose
        [content, props.class]
        // @hella:end
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
        // @hella:compose
        [
          linkBase,
          props.isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes[props.size ?? "icon"],
          props.class,
        ]
        // @hella:end
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
        // @hella:compose
        [
          linkBase,
          props.isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          previous,
          props.class,
        ]
        // @hella:end
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
        // @hella:compose
        [
          linkBase,
          props.isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          next,
          props.class,
        ]
        // @hella:end
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
        // @hella:compose
        [ellipsis, props.class]
        // @hella:end
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
