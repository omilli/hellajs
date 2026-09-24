export const base = "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12";

export const header = "flex max-w-sm flex-col items-center gap-2 text-center";

export const media = "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0";

export const mediaVariants = {
  default: "bg-transparent",
  icon: "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
};

export const title = "text-lg font-medium tracking-tight";

export const description = "text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary";

export const content = "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance";
