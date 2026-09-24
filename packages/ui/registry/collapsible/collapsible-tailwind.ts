export const base = "";

export const trigger = "[&[data-state=open]>svg]:rotate-180";

export const icon = "pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200";

// The shadcn accordion keyframes collapse/expand by animating a measured
// height custom property; this port animates the same 200ms window through
// the measurement-free grid-rows technique instead (both flavors).
export const content = "grid grid-rows-[0fr] opacity-0 transition-all duration-200 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100";

export const contentInner = "min-h-0 overflow-hidden";
