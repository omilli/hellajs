import type { PaginationProps, PaginationContentProps, PaginationItemProps, PaginationLinkProps, PaginationNavProps, PaginationEllipsisProps } from "./pagination-types.js";

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

export function Pagination({ children, class: cls, ...attrs }: PaginationProps): JSX.Element {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </nav>
  );
}

export function PaginationContent({ children, class: cls, ...attrs }: PaginationContentProps): JSX.Element {
  return (
    <ul
      data-slot="pagination-content"
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </ul>
  );
}

export function PaginationItem({ children, class: cls, ...attrs }: PaginationItemProps): JSX.Element {
  return (
    <li
      data-slot="pagination-item"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </li>
  );
}

export function PaginationLink({ isActive, size, children, class: cls, ...attrs }: PaginationLinkProps): JSX.Element {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive === undefined ? undefined : String(isActive)}
      class={
        // @hella:compose
        [
          linkBase,
          isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes[size ?? "icon"],
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </a>
  );
}

export function PaginationPrevious({ isActive, class: cls, ...attrs }: PaginationNavProps): JSX.Element {
  return (
    <a
      aria-label="Go to previous page"
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive === undefined ? undefined : String(isActive)}
      class={
        // @hella:compose
        [
          linkBase,
          isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          previous,
          cls,
        ]
        // @hella:end
      }
      {...attrs}
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
      <span class={hiddenUntilSm}>Previous</span>
    </a>
  );
}

export function PaginationNext({ isActive, class: cls, ...attrs }: PaginationNavProps): JSX.Element {
  return (
    <a
      aria-label="Go to next page"
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive === undefined ? undefined : String(isActive)}
      class={
        // @hella:compose
        [
          linkBase,
          isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          next,
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    >
      <span class={hiddenUntilSm}>Next</span>
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
  );
}

export function PaginationEllipsis({ class: cls, ...attrs }: PaginationEllipsisProps): JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      class={
        // @hella:compose
        [ellipsis, cls]
        // @hella:end
      }
      {...attrs}
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
      <span class={srOnly}>More pages</span>
    </span>
  );
}
