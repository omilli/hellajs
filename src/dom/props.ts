import { isReactiveProp } from "../global";
import { effect } from "../reactive";
import { HProps, PropHandler, PropValue } from "../types";
import { applyStyles } from "./css";
import { DOM_STATE } from "../global";

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
  const cleanup = effect(() => updateProp(el, key, value?.()));

  // Track prop effect
  if (!DOM_STATE.propEffects.has(el)) {
    DOM_STATE.propEffects.set(el, new Map());
  }
  DOM_STATE.propEffects.get(el)?.set(key, cleanup);
}

export function cleanupEffects(el: HTMLElement): void {
  // Cleanup prop effects
  const propEffects = DOM_STATE.propEffects.get(el);
  if (propEffects) {
    propEffects.forEach((cleanup) => cleanup());
    DOM_STATE.propEffects.delete(el);
  }

  // Cleanup node effects
  const nodeEffects = DOM_STATE.nodeEffects.get(el);
  if (nodeEffects) {
    nodeEffects.forEach((cleanup) => cleanup());
    DOM_STATE.nodeEffects.delete(el);
  }

  // Recursively cleanup child effects
  Array.from(el.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      cleanupEffects(child);
    }
  });
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
