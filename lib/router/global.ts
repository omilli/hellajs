import { RouterGuard } from ".";

export const ROUTER_STATE = {
  guards: [] as Array<{ paths: string[]; guard: RouterGuard }>,
  redirects: [] as Array<{ from: string; to: string }>,
};
