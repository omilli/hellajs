import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("pagination", {
  display: "flex",
  justifyContent: "center",
  marginInline: "auto",
  width: "100%",
});

const content = style("pagination-content", {
  alignItems: "center",
  display: "flex",
  flexDirection: "row",
  gap: "0.25rem",
});

const linkBase = style("pagination-link", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
});

const linkVariants = {
  ghost: style("pagination-link-ghost", {
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    },
  }),
  outline: style("pagination-link-outline", {
    background: tokens.background,
    border: `1px solid ${tokens.border}`,
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *)": {
      borderColor: tokens.input,
      background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
    },
    "&:is(.dark *):hover": {
      background: `color-mix(in oklab, ${tokens.input} 50%, transparent)`,
    },
  }),
};

const linkSizes = {
  default: style("pagination-link-size-default", {
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }),
  xs: style("pagination-link-size-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    fontSize: "0.75rem",
    gap: "0.25rem",
    height: "1.5rem",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    "&:has(> svg)": {
      paddingInline: "0.375rem",
    },
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  sm: style("pagination-link-size-sm", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  lg: style("pagination-link-size-lg", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }),
  icon: style("pagination-link-size-icon", {
    height: "2.25rem",
    width: "2.25rem",
  }),
  "icon-xs": style("pagination-link-size-icon-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  "icon-sm": style("pagination-link-size-icon-sm", {
    height: "2rem",
    width: "2rem",
  }),
  "icon-lg": style("pagination-link-size-icon-lg", {
    height: "2.5rem",
    width: "2.5rem",
  }),
};

const previous = style("pagination-previous", {
  gap: "0.25rem",
  paddingInline: "0.625rem",
  "@media (min-width: 40rem)": {
    "&": {
      paddingLeft: "0.625rem",
    },
  },
});

const next = style("pagination-next", {
  gap: "0.25rem",
  paddingInline: "0.625rem",
  "@media (min-width: 40rem)": {
    "&": {
      paddingRight: "0.625rem",
    },
  },
});

const hiddenUntilSm = style("pagination-hidden-until-sm", {
  display: "none",
  "@media (min-width: 40rem)": {
    "&": {
      display: "block",
    },
  },
});

const srOnly = style("pagination-sr-only", {
  border: "0",
  clip: "rect(0, 0, 0, 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
});

const ellipsis = style("pagination-ellipsis", {
  alignItems: "center",
  display: "flex",
  height: "2.25rem",
  justifyContent: "center",
  width: "2.25rem",
  "& svg": {
    height: "1rem",
    width: "1rem",
  },
});

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
        [base, cls]
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
        [content, cls]
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
        [cls]
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
        [
          linkBase,
          isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes[size ?? "icon"],
          cls,
        ]
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
        [
          linkBase,
          isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          previous,
          cls,
        ]
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
        [
          linkBase,
          isActive ? linkVariants.outline : linkVariants.ghost,
          linkSizes.default,
          next,
          cls,
        ]
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

interface PaginationEllipsisProps extends HTMLAttributes<"span"> {
  class?: string;
}

export function PaginationEllipsis({ class: cls, ...attrs }: PaginationEllipsisProps): JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      class={
        [ellipsis, cls]
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
