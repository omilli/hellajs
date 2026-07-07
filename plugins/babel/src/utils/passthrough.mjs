import { ensureForEachImport, ensurePortalImport, ensureLazyImport } from "./imports.mjs";

export const PASSTHROUGH_INJECTORS = {
  ForEach: ensureForEachImport,
  Portal: ensurePortalImport,
  Lazy: ensureLazyImport,
};
