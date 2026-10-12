import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface BreadcrumbProps extends HTMLAttributes<"nav"> {
  class?: string;
  children?: HellaChildren;
}

export interface BreadcrumbPartProps extends HTMLAttributes<"li"> {
  class?: string;
  children?: HellaChildren;
}

export interface BreadcrumbLinkProps extends HTMLAttributes<"a"> {
  class?: string;
  children?: HellaChildren;
}

export interface BreadcrumbPageProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export interface BreadcrumbSeparatorProps extends HTMLAttributes<"li"> {
  /** Replaces the inlined chevron when given. */
  children?: HellaChildren;
  class?: string;
}

export interface BreadcrumbEllipsisProps extends HTMLAttributes<"span"> {
  class?: string;
}
