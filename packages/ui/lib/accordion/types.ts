import type { Signal } from "../deps";

export type AccordionState = {
  selector: string;
  initialized: boolean;
  multiple: boolean;
  alwaysOpen: boolean;
  state: Signal<Map<string, boolean>>;
  itemIds: string[];
  pendingOperations: Array<() => void>;
  loadCallbacks: Array<() => void>;
};