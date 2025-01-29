import { isReactiveProp } from "../global";
import { effect } from "../reactive";
import { HProps, PropHandler, PropValue } from "../types";
import { applyStyles } from "./css";

export function applyProps(el: HTMLElement, props: HProps = {}): void {
  Object.entries(props).forEach(([key, value]) => {
    const handler = getPropHandler(key);
    if (handler) handler(el, key, value);
  });
}

function updateProp(el: HTMLElement, key: string, value: PropValue): void {
  if (shouldRemoveAttribute(value)) {
    el.removeAttribute(key);
    return;
  }

  if (typeof value === "object") {
    Object.assign((el as any)[key], value);
    return;
  }

  if (typeof value === "boolean") {
    handleBooleanAttribute(el, key, value);
    return;
  }

  el.setAttribute(key, value.toString());
}

function getPropHandler(key: string): PropHandler | null {
  if (key === "mount" || key.startsWith("on")) return null;
  if (key === "styles") return handleStyleProp;
  return handleRegularProp;
}

function handleStyleProp(el: HTMLElement, _: string, value: PropValue): void {
  applyStyles(el, value);
}

function handleRegularProp(
  el: HTMLElement,
  key: string,
  value: PropValue
): void {
  if (isReactiveProp(value)) {
    handleReactiveProp(el, key, value);
  } else {
    updateProp(el, key, value);
  }
}

function handleReactiveProp(
  el: HTMLElement,
  key: string,
  value: PropValue
): void {
  effect(() => updateProp(el, key, value?.()));
}

function handleBooleanAttribute(
  el: HTMLElement,
  key: string,
  value: boolean
): void {
  if (value) el.setAttribute(key, "");
}

function shouldRemoveAttribute(value: PropValue): boolean {
  return value == null || value === false;
}
