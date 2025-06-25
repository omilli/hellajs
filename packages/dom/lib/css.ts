interface CssOptions {
  scoped?: boolean | string;
  name?: string;
  global?: boolean;
}

type CSSValue = string | number | CSSObject;

interface CSSObject {
  [key: string]: CSSValue | CSSObject;
}

let styleSheet: HTMLStyleElement | null = null;
let counter = 0;

const cache = new Map<string, string>();
const cssRules = new Map<string, string>();
const inlineMemo = new Map<string, string>();
const refCounts = new Map<string, number>();
const hash = stableStringify;

export function css(obj: CSSObject, options: CssOptions = {}): string {
  const { scoped = false, name, global = false } = options;
  let selector = '', className = name || '';
  const hashKey = hash({ obj, scoped, name, global });
  if (inlineMemo.has(hashKey)) return inlineMemo.get(hashKey)!;
  if (!global) {
    className = name || `c${(counter++).toString(36)}`;
    selector = '.' + className;
    if (typeof scoped === 'string' && scoped) selector = '.' + scoped + ' ' + selector;
  }
  const key = hash({ obj, selector, global });
  if (cache.has(key)) {
    refCounts.set(key, (refCounts.get(key) || 0) + 1);
    inlineMemo.set(hashKey, cache.get(key)!);
    return cache.get(key)!;
  }
  const cssText = global ? processObject(obj, '', true) : processObject(obj, selector, false);
  if (!styleSheet) {
    styleSheet = document.createElement('style');
    styleSheet.setAttribute('data-css-in-js', '');
    document.head.appendChild(styleSheet);
  }
  cssRules.set(key, cssText);
  updateStyleSheet();
  refCounts.set(key, 1);
  const result = global ? '' : className;
  cache.set(key, result);
  inlineMemo.set(hashKey, result);
  return result;
}

css.remove = function (obj: CSSObject, options: CssOptions = {}) {
  let selector = '', className = options.name || '';
  if (!options.global) {
    className = options.name || '';
    selector = '.' + className;
    if (typeof options.scoped === 'string' && options.scoped) selector = '.' + options.scoped + ' ' + selector;
    if (!options.name) {
      const hashKey = hash({ obj, scoped: options.scoped ?? false, name: undefined, global: !!options.global });
      const generatedClass = inlineMemo.get(hashKey);
      if (generatedClass) {
        className = generatedClass;
        selector = '.' + className;
        if (typeof options.scoped === 'string' && options.scoped) selector = '.' + options.scoped + ' ' + selector;
      }
    }
  }
  const key = hash({ obj, selector, global: !!options.global });
  if (cssRules.has(key)) {
    const count = (refCounts.get(key) || 1) - 1;
    if (count <= 0) {
      cssRules.delete(key);
      cache.delete(key);
      refCounts.delete(key);
      updateStyleSheet();
      if (cssRules.size === 0 && styleSheet) {
        styleSheet.remove();
        styleSheet = null;
      }
    } else {
      refCounts.set(key, count);
    }
  }
};

export function cssReset(): void {
  cache.clear();
  cssRules.clear();
  inlineMemo.clear();
  refCounts.clear();
  if (styleSheet) {
    styleSheet.remove();
    styleSheet = null;
  }
  counter = 0;
}

function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function stableStringify(obj: unknown): string {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    let out = '{';
    for (let i = 0; i < keys.length; i++) {
      if (i) out += ',';
      out += JSON.stringify(keys[i]) + ':' + stableStringify((obj as Record<string, unknown>)[keys[i]]);
    }
    return out + '}';
  } else if (Array.isArray(obj)) {
    return '[' + (obj as Array<unknown>).map(stableStringify).join(',') + ']';
  } else {
    return JSON.stringify(obj);
  }
}
function updateStyleSheet(): void {
  if (!styleSheet) return;
  styleSheet.textContent = Array.from(cssRules.values()).join('');
}

function processObject(obj: CSSObject, selector: string, global: boolean = false): string {
  let css = '', props = '';
  for (const key in obj) {
    const value = obj[key];
    switch (true) {
      case key.startsWith('@keyframes'):
        css += `@keyframes${key.slice(10)}{`;
        for (const frame in value as CSSObject) {
          css += `${frame}{`;
          const frameObj = (value as Record<string, CSSObject>)[frame];
          for (const prop in frameObj) {
            css += `${toKebabCase(prop)}:${frameObj[prop]};`;
          }
          css += '}';
        }
        css += '}';
        break;
      case key.startsWith('@'):
        css += `${key}{${processObject(value as CSSObject, selector, global)}}`;
        break;
      case key.startsWith('$'):
        css += processObject(value as CSSObject, `${selector} ${key.slice(1)}`, global);
        break;
      case key.includes('&'):
        key.split(',').forEach(s => {
          css += processObject(value as CSSObject, s.trim().replace(/&/g, selector), global);
        });
        break;
      case key.includes(','):
        key.split(',').forEach(s => {
          const t = s.trim();
          if (t.startsWith(':') || t.startsWith('&')) {
            const nsel = t.startsWith(':') ? `${selector}${t}` : `${selector}${t.replace(/^&/, '')}`;
            css += processObject(value as CSSObject, nsel, global);
          } else {
            css += processObject(value as CSSObject, global ? t : `${selector} ${t}`, global);
          }
        });
        break;
      case key.startsWith(':'):
        css += processObject(value as CSSObject, `${selector}${key}`, global);
        break;
      case typeof value === 'object' && value !== null:
        css += processObject(value as CSSObject, global ? `${key}` : `${selector} ${key}`, global);
        break;
      default:
        props += key.startsWith('--') ? `${key}:${value};` : `${toKebabCase(key)}:${value};`;
    }
  }
  if (props) css = `${selector}{${props}}` + css;
  return css;
}
