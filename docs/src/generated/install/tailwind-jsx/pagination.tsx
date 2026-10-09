import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
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

interface PaginationProps extends HTMLAttributes<"nav"> {
  class?: string;
  children?: HellaChildren;
}

export default function Pagination({ children, class: cls, ...attrs }: PaginationProps): JSX.Element {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      class={
        cn("mx-auto flex w-full justify-center", cls)
      }
      {...attrs}
    >
      {children}
    </nav>
  );
}

interface PaginationContentProps extends HTMLAttributes<"ul"> {
  class?: string;
  children?: HellaChildren;
}

export function PaginationContent({ children, class: cls, ...attrs }: PaginationContentProps): JSX.Element {
  return (
    <ul
      data-slot="pagination-content"
      class={
        cn("flex flex-row items-center gap-1", cls)
      }
      {...attrs}
    >
      {children}
    </ul>
  );
}

interface PaginationItemProps extends HTMLAttributes<"li"> {
  class?: string;
  children?: HellaChildren;
}

export function PaginationItem({ children, class: cls, ...attrs }: PaginationItemProps): JSX.Element {
  return (
    <li
      data-slot="pagination-item"
      class={
        cn(cls)
      }
      {...attrs}
    >
      {children}
    </li>
  );
}

interface PaginationLinkProps extends HTMLAttributes<"a"> {
  class?: string;
  children?: HellaChildren;
  /** Renders aria-current="page" and the outline variant; no router coupling — href forwards natively. */
  isActive?: boolean;
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export function PaginationLink({ isActive, size, children, class: cls, ...attrs }: PaginationLinkProps): JSX.Element {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive === undefined ? undefined : String(isActive)}
      class={
        cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes[size ?? "icon"],
          cls,
        )
      }
      {...attrs}
    >
      {children}
    </a>
  );
}

interface PaginationNavProps extends HTMLAttributes<"a"> {
  class?: string;
  /** Renders aria-current="page" and the outline variant. */
  isActive?: boolean;
}

export function PaginationPrevious({ isActive, class: cls, ...attrs }: PaginationNavProps): JSX.Element {
  return (
    <a
      aria-label="Go to previous page"
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive === undefined ? undefined : String(isActive)}
      class={
        cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          "gap-1 px-2.5 sm:pl-2.5",
          cls,
        )
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
      <span class="hidden sm:block">Previous</span>
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
        cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          "gap-1 px-2.5 sm:pr-2.5",
          cls,
        )
      }
      {...attrs}
    >
      <span class="hidden sm:block">Next</span>
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

interface PaginationEllipsisProps extends HTMLAttributes<"span"> {
  class?: string;
}

export function PaginationEllipsis({ class: cls, ...attrs }: PaginationEllipsisProps): JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      class={
        cn("flex size-9 items-center justify-center", cls)
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
      <span class="sr-only">More pages</span>
    </span>
  );
}
