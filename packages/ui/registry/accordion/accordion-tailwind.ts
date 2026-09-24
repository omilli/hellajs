export const base = "";

export const item = "border-b last:border-b-0";

export const header = "flex";

export const trigger = "flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180";

export const icon = "pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200";

// The ref's animate-accordion-up/down keyframes animate a measured height
// custom property; this port animates the same 200ms window through the
// measurement-free grid-rows technique instead (both flavors).
export const content = "grid grid-rows-[0fr] text-sm opacity-0 transition-all duration-200 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100";

export const contentInner = "min-h-0 overflow-hidden pt-0 pb-4";
