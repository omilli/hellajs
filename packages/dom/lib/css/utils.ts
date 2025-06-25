import { cssRules, styles } from "./state";
import type { CSSObject } from "./types";

export function kebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function stringify(obj: unknown): string {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    let out = '{';
    for (let i = 0; i < keys.length; i++) {
      if (i) out += ',';
      out += JSON.stringify(keys[i]) + ':' + stringify((obj as Record<string, unknown>)[keys[i]]);
    }
    return out + '}';
  } else if (Array.isArray(obj)) {
    return '[' + (obj as Array<unknown>).map(stringify).join(',') + ']';
  } else {
    return JSON.stringify(obj);
  }
}

export function update(): void {
  if (!styles()) return;
  styles()!.textContent = Array.from(cssRules.values()).join('');
}

export function process(obj: CSSObject, selector: string, global: boolean = false): string {
  let css = '', props = '';
  for (const key in obj) {
    const value = obj[key as keyof CSSObject];
    switch (true) {
      case key.startsWith('@keyframes'):
        css += `@keyframes${key.slice(10)}{`;
        for (const frame in value as CSSObject) {
          css += `${frame}{`;
          const frameObj = (value as Record<string, CSSObject>)[frame];
          for (const prop in frameObj) {
            css += `${kebab(prop)}:${frameObj[prop as keyof CSSObject]};`;
          }
          css += '}';
        }
        css += '}';
        break;
      case key.startsWith('@'):
        css += `${key}{${process(value as CSSObject, selector, global)}}`;
        break;
      case key.startsWith('$'):
        css += process(value as CSSObject, `${selector} ${key.slice(1)}`, global);
        break;
      case key.includes('&'):
        key.split(',').forEach(s => {
          css += process(value as CSSObject, s.trim().replace(/&/g, selector), global);
        });
        break;
      case key.includes(','):
        key.split(',').forEach(s => {
          const t = s.trim();
          if (t.startsWith(':') || t.startsWith('&')) {
            const nsel = t.startsWith(':') ? `${selector}${t}` : `${selector}${t.replace(/^&/, '')}`;
            css += process(value as CSSObject, nsel, global);
          } else {
            css += process(value as CSSObject, global ? t : `${selector} ${t}`, global);
          }
        });
        break;
      case key.startsWith(':'):
        css += process(value as CSSObject, `${selector}${key}`, global);
        break;
      case typeof value === 'object' && value !== null:
        css += process(value as CSSObject, global ? `${key}` : `${selector} ${key}`, global);
        break;
      default:
        props += key.startsWith('--') ? `${key}:${value};` : `${kebab(key)}:${value};`;
    }
  }
  if (props) css = `${selector}{${props}}` + css;
  return css;
}

export function flattenVars(vars: Record<string, any>, prefix = ''): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const k in vars) {
    const v = vars[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = flattenVars(v, prefix ? `${prefix}-${k}` : k);
      Object.assign(out, nested);
    } else {
      out[prefix ? `${prefix}-${k}` : k] = v;
    }
  }
  return out;
}