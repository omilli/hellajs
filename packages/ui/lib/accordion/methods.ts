import { batch, computed } from "../deps";
import type { AccordionState } from "./types";
import { getState, queueOrExecute, setState } from "./utils";

export const accordionOpenItem = (accordion: AccordionState, id: string) =>
  queueOrExecute(accordion, () => setState(accordion, id, true));

export const accordionCloseItem = (accordion: AccordionState, id: string) =>
  queueOrExecute(accordion, () => setState(accordion, id, false));

export const accordionToggleItem = (accordion: AccordionState, id: string) =>
  queueOrExecute(accordion, () => setState(accordion, id, !getState(accordion, id)));

export const accordionOpenAll = (accordion: AccordionState) =>
  queueOrExecute(accordion, () => {
    if (!accordion.multiple) return;
    batch(() => {
      const newStates = new Map(accordion.state());
      let i = 0, len = accordion.itemIds.length;
      while (i < len) newStates.set(accordion.itemIds[i++], true);
      accordion.state(newStates);
    });
  });

export const accordionCloseAll = (accordion: AccordionState) =>
  queueOrExecute(accordion, () => {
    if (!accordion.multiple || accordion.alwaysOpen) return;
    batch(() => {
      const newStates = new Map(accordion.state());
      let i = 0, len = accordion.itemIds.length;
      while (i < len) newStates.set(accordion.itemIds[i++], false);
      accordion.state(newStates);
    });
  });

export const accordionGetOpenItems = (accordion: AccordionState) =>
  computed(() => {
    const open: string[] = [];
    for (const [id, isOpen] of accordion.state()) isOpen && open.push(id);
    return open;
  });

export const accordionIsOpen = (accordion: AccordionState) =>
  accordionGetOpenItems(accordion)().length > 0;

export const accordionOnLoad = (accordion: AccordionState, callback: () => void) =>
  accordion.initialized ? callback() : accordion.loadCallbacks.push(callback);