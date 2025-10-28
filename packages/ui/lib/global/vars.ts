import { cssVars } from "@hellajs/css";
import { colors } from "../global";

export interface NestedVars {
  [key: string]: string | NestedVars;
  [key: number]: string;
}

type DeepNestedVars = {
  [K in string]: NestedVars;
};

type VarsTarget = Record<string | symbol, string | NestedVars>;

export const scale = cssVars({
  lg: 1.25,
  md: 1,
  sm: 0.875,
}, { prefix: "scale" });

/**
 * Creates a proxy object for CSS variables that returns var() strings on read
 * and updates CSS variables on write.
 * @param prefix Optional prefix for the CSS variables
 * @returns Proxy object for CSS variable access
 */
function varsProxy(prefix = ''): NestedVars {
  const prefixStr = prefix ? `${prefix}-` : '';

  const handler: ProxyHandler<VarsTarget> = {
    get(target, prop): string | NestedVars {
      if (typeof prop === 'symbol') return target[prop] as string | NestedVars;

      const key = prop as string;
      const cssVarName = `--${prefixStr}${key}`;

      // For numeric keys, always return CSS variable string
      if (!isNaN(Number(key))) {
        return `var(${cssVarName.replace(/\./g, '-')})`;
      }

      // Check if accessing a nested object
      if (!(key in target)) {
        // Return a nested proxy for chained access
        target[key] = varsProxy(`${prefixStr}${key}`);
      }

      // If it's already a proxy, return it
      if (typeof target[key] === 'object' && target[key] !== null) {
        return target[key] as NestedVars;
      }

      // Return the CSS variable reference
      return `var(${cssVarName.replace(/\./g, '-')})`;
    },

    set(target, prop, value) {
      if (typeof prop === 'symbol') {
        target[prop] = value;
        return true;
      }

      const key = prop as string;
      const cssVarName = `--${prefixStr}${key}`.replace(/\./g, '-');

      // Set the CSS variable on the document root
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty(cssVarName, String(value));
      }

      target[key] = value;
      return true;
    }
  };

  return new Proxy({} as VarsTarget, handler) as NestedVars;
}

/**
 * Global CSS variables proxy.
 * Read access returns var(--key) strings.
 * Write access updates the CSS variable value.
 * 
 * @example
 * ```ts
 * // Reading returns CSS variable reference
 * vars.color.primary[500] // '${colors.primary[500]}'
 * 
 * // Writing updates the CSS variable
 * vars.color.primary[500] = '#ff0000' // sets --color-primary-500 to '#ff0000'
 * ```
 */
export const vars = varsProxy() as NestedVars as DeepNestedVars;