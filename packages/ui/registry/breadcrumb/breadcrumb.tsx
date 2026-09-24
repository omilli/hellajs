import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

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
        // @hella:compose
        [base, props.class]
        // @hella:end
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
        // @hella:compose
        [list, props.class]
        // @hella:end
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
        // @hella:compose
        [item, props.class]
        // @hella:end
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
        // @hella:compose
        [link, props.class]
        // @hella:end
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
        // @hella:compose
        [page, props.class]
        // @hella:end
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
        // @hella:compose
        [separator, props.class]
        // @hella:end
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
        // @hella:compose
        [ellipsis, props.class]
        // @hella:end
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
          // @hella:compose
          [ellipsisIcon]
          // @hella:end
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
