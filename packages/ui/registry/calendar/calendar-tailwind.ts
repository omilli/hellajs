/** The ref's root: `group/calendar` chrome, card/popover transparency ancestors, `--cell-size` at spacing(8); the rtl `.rdp-*` selectors are dropped (no rdp classes in this port). */
export const base = "group/calendar w-fit bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent";

export const months = "relative flex flex-col gap-4 md:flex-row";

export const month = "flex w-full flex-col gap-4";

export const monthCaption = "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)";

export const captionLabel = "font-medium select-none text-sm";

export const nav = "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1";

/** The ref's nav buttons: ghost `buttonVariants` (base + variant) with the default size tokens pre-merged out against `size-(--cell-size)`/`p-0`. */
export const navButton = "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-(--cell-size) p-0 select-none aria-disabled:opacity-50";

export const icon = "size-4";

export const monthGrid = "w-full border-collapse";

export const weekdays = "flex";

export const weekday = "flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none";

export const week = "mt-2 flex w-full";

/** The ref's day cell plus its state hooks, data-attribute driven: today/outside/disabled/hidden/range land as conditioned utilities on one static string (the ref's outside `aria-selected:` color rule folds into the base outside color). */
export const day = "group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md [&:first-child[data-selected=true]_button]:rounded-l-md data-[today=true]:rounded-md data-[today=true]:bg-accent data-[today=true]:text-accent-foreground data-[today=true]:data-[selected=true]:rounded-none data-[outside=true]:text-muted-foreground data-[disabled=true]:text-muted-foreground data-[disabled=true]:opacity-50 data-[hidden=true]:invisible data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-accent data-[range-middle=true]:rounded-none data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-accent";

/** The ref's CalendarDayButton: ghost icon-class button tokens with the conflicts the ref's `cn()` resolves pre-merged (`gap-2`→`gap-1`, `font-medium`→`font-normal`, `size-9`→`size-auto w-full min-w-(--cell-size) aspect-square`). */
export const dayButton = "flex shrink-0 aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-md text-sm font-normal leading-none whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>span]:text-xs [&>span]:opacity-70 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 dark:hover:text-accent-foreground group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground";
