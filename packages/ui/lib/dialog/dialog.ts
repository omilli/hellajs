import { signal, element, elements, batch } from '../deps';
import { component } from '../component';
import { DIALOG, DIALOG_TRIGGER, DIALOG_BACKDROP, DIALOG_CLOSE, OPEN, MODAL } from './const';
import "./css";

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    const dialogs = document.querySelectorAll(`[${DIALOG}]`);
    let j = 0, len = dialogs.length;
    while (j < len) {
      const handler = (dialogs[j] as any).__esc;
      if (typeof handler === 'function') {
        handler(e);
      }
      j++;
    }
  }
});

export const dialog = (id: string) => {
  const selector = `[${DIALOG}="${id}"]`;
  const state = signal(false);
  const modal = signal(true);
  const { exec, flush } = component();

  const setState = (value: boolean) =>
    batch(() => {
      if (state() !== value) state(value);
    });

  element(selector).onLoad(() => {
    const node = document.querySelector(selector);
    (node as any).__esc = () => setState(false);
    const rootNode = element(selector).node;
    if (!rootNode) return;

    const initialOpen = rootNode.hasAttribute(OPEN);
    modal(rootNode.hasAttribute(MODAL));

    const triggers = elements(`[${DIALOG_TRIGGER}="${id}"]`);
    let i = 0, len = triggers.length;
    while (i < len) {
      triggers[i++].on('click', () => setState(true));
    }

    const closeButtons = elements(`${selector} [${DIALOG_CLOSE}]`);
    let j = 0, closeLen = closeButtons.length;
    while (j < closeLen) {
      closeButtons[j++].on('click', () => setState(false));
    }

    const backdrop = element(`${selector} [${DIALOG_BACKDROP}]`);
    if (!modal()) {
      backdrop.on('click', () => setState(false));
    }

    element(selector).attr({
      'data-open': () => state() ? '' : undefined,
      'aria-hidden': () => state() ? 'false' : 'true',
      role: 'dialog',
      'aria-modal': () => modal() ? 'true' : 'false'
    });

    state(initialOpen);
    flush();
  });

  return {
    open: () => exec(() => setState(true)),
    close: () => exec(() => setState(false)),
    toggle: () => exec(() => setState(!state())),
    isOpen: () => state(),
    onLoad: (callback: () => void) => exec(callback)
  };
};
