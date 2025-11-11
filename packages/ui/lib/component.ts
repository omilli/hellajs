import { signal } from './deps';

/**
 * Base component initialization handler
 *
 * @returns Component lifecycle utilities
 */
export const component = () => {
  const initialized = signal(false);
  const pendingOps: Array<() => void> = [];

  const exec = (op: () => void) => initialized() ? op() : pendingOps.push(op);

  const flush = () => {
    initialized(true);
    while (pendingOps.length > 0) pendingOps.shift()?.();
  };

  return { exec, flush };
};
