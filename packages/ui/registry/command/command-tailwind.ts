export const base = "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground";

export const inputWrapper = "flex h-9 items-center gap-2 border-b px-3";

export const icon = "size-4 shrink-0 opacity-50";

export const input = "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50";

export const list = "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto";

export const empty = "py-6 text-center text-sm";

export const group = "overflow-hidden p-1 text-foreground [&_[data-slot='command-group-heading']]:px-2 [&_[data-slot='command-group-heading']]:py-1.5 [&_[data-slot='command-group-heading']]:text-xs [&_[data-slot='command-group-heading']]:font-medium [&_[data-slot='command-group-heading']]:text-muted-foreground";

export const groupHeading = "px-2 py-1.5 text-xs font-medium text-muted-foreground";

export const separator = "-mx-1 h-px bg-border";

export const item = "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

export const shortcut = "ml-auto text-xs tracking-widest text-muted-foreground";

export const palette = "[&_[data-slot='command-input-wrapper']]:h-12 [&_[data-slot='command-group-heading']]:px-2 [&_[data-slot='command-group-heading']]:font-medium [&_[data-slot='command-group-heading']]:text-muted-foreground [&_[data-slot='command-group']]:px-2 [&_[data-slot='command-group']:not([hidden])~[data-slot='command-group']]:pt-0 [&_[data-slot='command-input-wrapper']_svg]:h-5 [&_[data-slot='command-input-wrapper']_svg]:w-5 [&_[data-slot='command-input']]:h-12 [&_[data-slot='command-item']]:px-2 [&_[data-slot='command-item']]:py-3 [&_[data-slot='command-item']_svg]:h-5 [&_[data-slot='command-item']_svg]:w-5";

export const dialogOverlay = "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0";

export const dialogPanel = "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-0 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg overflow-hidden";

export const dialogHeader = "sr-only";

export const dialogTitle = "text-lg leading-none font-semibold";

export const dialogDescription = "text-sm text-muted-foreground";

export const dialogClose = "absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
