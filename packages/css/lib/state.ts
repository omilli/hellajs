

export const cache = new Map<string, string>();
export const cssRules = new Map<string, string>();
export const inlineMemo = new Map<string, string>();
export const refCounts = new Map<string, number>();

let styleSheet: HTMLStyleElement | null = null;
let styleCounter = 0;


export function styles(el?: HTMLStyleElement | null) {
  if (typeof el !== 'undefined') {
    styleSheet = document.createElement('style');
  }

  return styleSheet;
}

export function counter(val?: number): number {
  if (val) {
    styleCounter = val;
  }
  return styleCounter;
} 
