import { batch } from "../deps";
import type { AccordionState } from "./types";

export const getState = (accordion: AccordionState, id: string) =>
  accordion.state().get(id) ?? false;

export const setState = (accordion: AccordionState, id: string, value: boolean) => {
  batch(() => {
    const current = accordion.state();
    const isOpen = current.get(id) ?? false;

    if (isOpen === value) return;

    if (accordion.multiple) {
      if (!value && accordion.alwaysOpen) {
        let openCount = 0;
        for (const isOpen of current.values()) isOpen && openCount++;
        if (openCount <= 1) return;
      }
      const newStates = new Map(current);
      newStates.set(id, value);
      accordion.state(newStates);
    } else {
      if (value) {
        const newStates = new Map(current);
        let i = 0, len = accordion.itemIds.length;
        while (i < len) {
          newStates.set(accordion.itemIds[i], accordion.itemIds[i] === id);
          i++;
        }
        accordion.state(newStates);
      } else if (!accordion.alwaysOpen) {
        const newStates = new Map(current);
        newStates.set(id, false);
        accordion.state(newStates);
      }
    }
  });
};

export const queueOrExecute = (accordion: AccordionState, operation: () => void) => {
  accordion.initialized ? operation() : accordion.pendingOperations.push(operation);
};