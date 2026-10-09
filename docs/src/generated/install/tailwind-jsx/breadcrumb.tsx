import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface BreadcrumbProps extends HTMLAttributes<"nav"> {
  class?: string;
  children?: HellaChildren;
}

export default function Breadcrumb({ children, class: cls, ...attrs }: BreadcrumbProps): JSX.Element {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      class={
        cn(cls)
      }
      {...attrs}
    >
      {children}
    </nav>
  );
}

interface BreadcrumbPartProps extends HTMLAttributes<"li"> {
  class?: string;
  children?: HellaChildren;
}

export function BreadcrumbList({ children, class: cls, ...attrs }: BreadcrumbPartProps): JSX.Element {
  return (
    <ol
      data-slot="breadcrumb-list"
      class={
        cn("flex flex-wrap list-none items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5", cls)
      }
      {...attrs}
    >
      {children}
    </ol>
  );
}

export function BreadcrumbItem({ children, class: cls, ...attrs }: BreadcrumbPartProps): JSX.Element {
  return (
    <li
      data-slot="breadcrumb-item"
      class={
        cn("inline-flex items-center gap-1.5", cls)
      }
      {...attrs}
    >
      {children}
    </li>
  );
}

interface BreadcrumbLinkProps extends HTMLAttributes<"a"> {
  class?: string;
  children?: HellaChildren;
}

export function BreadcrumbLink({ children, class: cls, ...attrs }: BreadcrumbLinkProps): JSX.Element {
  return (
    <a
      data-slot="breadcrumb-link"
      class={
        cn("transition-colors hover:text-foreground", cls)
      }
      {...attrs}
    >
      {children}
    </a>
  );
}

interface BreadcrumbPageProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function BreadcrumbPage({ children, class: cls, ...attrs }: BreadcrumbPageProps): JSX.Element {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      class={
        cn("font-normal text-foreground", cls)
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface BreadcrumbSeparatorProps extends HTMLAttributes<"li"> {
  /** Replaces the inlined chevron when given. */
  children?: HellaChildren;
  class?: string;
}

export function BreadcrumbSeparator({ children, class: cls, ...attrs }: BreadcrumbSeparatorProps): JSX.Element {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      class={
        cn("[&>svg]:size-3.5", cls)
      }
      {...attrs}
    >
      {() => children ?? (
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

interface BreadcrumbEllipsisProps extends HTMLAttributes<"span"> {
  class?: string;
}

export function BreadcrumbEllipsis({ class: cls, ...attrs }: BreadcrumbEllipsisProps): JSX.Element {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
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
        aria-hidden="true"
        class={
          cn("size-4")
        }
      >
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
      <span class="sr-only">More</span>
    </span>
  );
}
