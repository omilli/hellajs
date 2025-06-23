import { setCurrentSub } from "./effect";

export function untracked<T>(fn: () => T): T {
  const prevSub = setCurrentSub(undefined);
  try {
    return fn();
  } finally {
    setCurrentSub(prevSub);
  }
}
