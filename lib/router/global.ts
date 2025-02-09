import { StoreSignals } from "../store";
import { RouterState, RouterEvents } from "./types";

export const ROUTER_STATE = {
  store: null as StoreSignals<RouterState> | null,
  events: {
    beforeNavigate: new Set(),
    afterNavigate: new Set(),
  } as RouterEvents,
};
