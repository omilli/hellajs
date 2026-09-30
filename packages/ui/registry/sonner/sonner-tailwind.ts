export const base = "pointer-events-none fixed inset-0 z-[100] flex list-none flex-col gap-3 p-4 group/toaster";

export const toasterPositions = {
  "top-left": "flex-col justify-start items-start [--enter-offset:-100%] [--stack-offset:1.5rem] [--stack-origin:top]",
  "top-center": "flex-col justify-start items-center [--enter-offset:-100%] [--stack-offset:1.5rem] [--stack-origin:top]",
  "top-right": "flex-col justify-start items-end [--enter-offset:-100%] [--stack-offset:1.5rem] [--stack-origin:top]",
  "bottom-left": "flex-col-reverse justify-start items-start [--enter-offset:100%] [--stack-offset:-1.5rem] [--stack-origin:bottom]",
  "bottom-center": "flex-col-reverse justify-start items-center [--enter-offset:100%] [--stack-offset:-1.5rem] [--stack-origin:bottom]",
  "bottom-right": "flex-col-reverse justify-start items-end [--enter-offset:100%] [--stack-offset:-1.5rem] [--stack-origin:bottom]",
};

export const item = "pointer-events-auto relative z-40 flex w-[356px] max-w-[calc(100vw-2rem)] items-center gap-2 rounded-md border bg-popover p-4 text-sm text-popover-foreground shadow-md transition-all max-h-(--toast-height,16rem) animate-in fade-in-0 group-data-[position^=top]/toaster:slide-in-from-top-6 group-data-[position^=bottom]/toaster:slide-in-from-bottom-6 [transform-origin:var(--stack-origin,bottom)] data-[depth=1]:z-30 data-[depth=2]:z-20 data-[depth=3]:z-10 data-[depth=1]:[transform:translateY(calc(var(--stack-offset)*1))_scale(0.95)] data-[depth=2]:[transform:translateY(calc(var(--stack-offset)*2))_scale(0.9)] data-[depth=3]:[transform:translateY(calc(var(--stack-offset)*3))_scale(0.85)] data-[dragging=true]:transition-none data-[removed=true]:pointer-events-none data-[removed=true]:opacity-0 data-[removed=true]:max-h-0 data-[removed=true]:overflow-hidden data-[removed=true]:py-0 [&:hover_[data-slot=sonner-close]]:opacity-100 data-[rich-colors=true]:data-[type=success]:border-green-600 data-[rich-colors=true]:data-[type=success]:bg-green-50 data-[rich-colors=true]:data-[type=success]:text-green-800 data-[rich-colors=true]:data-[type=error]:border-red-600 data-[rich-colors=true]:data-[type=error]:bg-red-50 data-[rich-colors=true]:data-[type=error]:text-red-800 data-[rich-colors=true]:data-[type=warning]:border-amber-600 data-[rich-colors=true]:data-[type=warning]:bg-amber-50 data-[rich-colors=true]:data-[type=warning]:text-amber-800 data-[rich-colors=true]:data-[type=info]:border-blue-600 data-[rich-colors=true]:data-[type=info]:bg-blue-50 data-[rich-colors=true]:data-[type=info]:text-blue-800 dark:data-[rich-colors=true]:data-[type=success]:border-green-700 dark:data-[rich-colors=true]:data-[type=success]:bg-green-950 dark:data-[rich-colors=true]:data-[type=success]:text-green-300 dark:data-[rich-colors=true]:data-[type=error]:border-red-700 dark:data-[rich-colors=true]:data-[type=error]:bg-red-950 dark:data-[rich-colors=true]:data-[type=error]:text-red-300 dark:data-[rich-colors=true]:data-[type=warning]:border-amber-700 dark:data-[rich-colors=true]:data-[type=warning]:bg-amber-950 dark:data-[rich-colors=true]:data-[type=warning]:text-amber-300 dark:data-[rich-colors=true]:data-[type=info]:border-blue-700 dark:data-[rich-colors=true]:data-[type=info]:bg-blue-950 dark:data-[rich-colors=true]:data-[type=info]:text-blue-300";

export const content = "flex min-w-0 flex-1 flex-col gap-0.5";

export const title = "font-medium leading-5";

export const description = "opacity-90";

export const icon = "inline-flex shrink-0 items-center [&>svg]:size-4 data-[type=success]:text-green-600 data-[type=error]:text-red-600 data-[type=warning]:text-amber-500 data-[type=info]:text-blue-500 dark:data-[type=success]:text-green-500 dark:data-[type=error]:text-red-500 dark:data-[type=warning]:text-amber-400 dark:data-[type=info]:text-blue-400 data-[type=loading]:[&>svg]:animate-spin";

export const actionButton = "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-current/30 bg-transparent px-3 text-xs font-medium text-inherit transition-colors hover:bg-current/10";

export const close = "absolute top-2 right-2 inline-flex shrink-0 cursor-pointer items-center rounded-[calc(var(--radius)*0.5)] border-none bg-transparent p-1 opacity-0 text-inherit transition-opacity focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>svg]:size-4";
