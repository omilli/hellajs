import { StoreSignals } from "../store";
import { RouterState, RouterEvents, RouterHella } from "./types";

export const HELLA_ROUTER: RouterHella = {
  store: null as StoreSignals<RouterState> | null,
  events: {
    beforeNavigate: new Set(),
    afterNavigate: new Set(),
  } as RouterEvents,
};
