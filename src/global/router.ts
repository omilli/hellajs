import { RouterGuard } from "../types";

export const ROUTER_STATE = {
  guards: [] as Array<{ paths: string[]; guard: RouterGuard }>,
  redirects: [] as Array<{ from: string; to: string }>,
};

(window as any).HELLA_ROUTER_STATE = ROUTER_STATE;
