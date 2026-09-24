export const group = "group/item-group flex flex-col";

export const separatorBase = "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px";

export const separator = "my-0";

export const base = "group/item flex flex-wrap items-center rounded-md border border-transparent text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-accent/50";

export const variants = {
  default: "bg-transparent",
  outline: "border-border",
  muted: "bg-muted/50",
};

export const sizes = {
  default: "gap-4 p-4",
  sm: "gap-2.5 px-4 py-3",
};

export const media = "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none";

export const mediaVariants = {
  default: "bg-transparent",
  icon: "size-8 rounded-sm border bg-muted [&_svg:not([class*='size-'])]:size-4",
  image: "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover",
};

export const content = "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none";

export const title = "flex w-fit items-center gap-2 text-sm leading-snug font-medium";

export const description = "line-clamp-2 text-sm leading-normal font-normal text-balance text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary";

export const actions = "flex items-center gap-2";

export const header = "flex basis-full items-center justify-between gap-2";

export const footer = "flex basis-full items-center justify-between gap-2";
