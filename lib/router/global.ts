import { StoreSignals } from "../reactive";
import { RouterState, RouterEvents } from "./types";

export const ROUTER_STATE = {
  redirects: [] as Array<{ from: string; to: string }>,
  store: null as StoreSignals<RouterState> | null,
  events: {
    beforeNavigate: new Set(),
    afterNavigate: new Set(),
  } as RouterEvents,
};
