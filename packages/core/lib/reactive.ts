// HellaJS Core - Single File Bundle

import type {
  Stack,
  Reactive,
  Link,
  EffectValue,
  SignalBase,
  ComputedBase
} from './types'
import { Flags, SCHEDULED } from './types'
import { startTracking, endTracking } from './tracking'

const effectQueue: (EffectValue | Reactive | undefined)[] = [];

export let currentValue: Reactive | undefined;

let queueIndex = 0,
  effectCount = 0;

export function executeSignal(signalValue: SignalBase, value: unknown): boolean {
  signalValue.flags = Flags.W;
  return signalValue.lastVal !== (signalValue.lastVal = value);
}

export function executeComputed<T = unknown>(computedValue: ComputedBase<T>): boolean {
  const prevSubValue = setCurrentSub(computedValue);
  const { cachedVal, compFn } = computedValue;

  startTracking(computedValue);

  try {
    const prevValue = cachedVal;
    const newValue = compFn(prevValue);

    computedValue.cachedVal = newValue;
    return prevValue !== newValue;
  } finally {
    setCurrentSub(prevSubValue);
    endTracking(computedValue);
  }
}


export function setCurrentSub(sub: Reactive | undefined) {
  const prev = currentValue;
  currentValue = sub;
  return prev;
}


export function propagate(link: Link): void {
  do {
    const { target, nextSub } = link;
    const { flags } = target;

    if ((flags & (Flags.P | Flags.D)) === Flags.P) {
      target.flags = flags | Flags.D;

      if (flags & Flags.G) {
        scheduleEffect(target);
      }
    }

    link = nextSub!;

  } while (link);
}

export function propagateChange(link: Link): void {
  let { nextSub } = link;
  let stack: Stack<Link | undefined> | undefined;

  process: do {
    const { target } = link;
    let { flags, subs } = target;

    if (flags & (Flags.W | Flags.G)) {
      const m1 = Flags.T | Flags.M, m2 = m1 | Flags.D | Flags.P;

      if (!(flags & m2)) {
        target.flags = flags | Flags.P;
      } else if (!(flags & m1)) {
        flags = Flags.C;
      } else {
        flags = Flags.C;
      }

      if (flags & Flags.G) {
        scheduleEffect(target);
      }

      if (flags & Flags.W && subs) {
        link = subs;

        if (subs.nextSub) {
          stack = { value: nextSub, prev: stack };
          nextSub = link.nextSub;
        }
        continue;
      }
    }

    if ((link = nextSub!)) {
      nextSub = link.nextSub;
      continue;
    }

    while (stack) {
      link = stack.value!;
      stack = stack.prev;

      if (link) {
        nextSub = link.nextSub;
        continue process;
      }
    }
    break;
  } while (true);
}

export function validateStale(link: Link, subscriber: Reactive): boolean {
  let stack: Stack<Link> | undefined, depth = 0;

  validate: do {
    const { source, nextSub, prevSub, nextDep } = link;
    const { flags, subs } = source;

    let isStale = !!(subscriber.flags & Flags.D);

    if (!isStale) {
      if ((flags & (Flags.W | Flags.D)) === (Flags.W | Flags.D)) {
        if (updateValue(source as SignalBase | ComputedBase)) {
          if (subs?.nextSub) {
            propagate(subs);
          }
          isStale = true;
        }
      } else if ((flags & (Flags.W | Flags.P)) === (Flags.W | Flags.P)) {
        stack = nextSub || prevSub ? { value: link, prev: stack } : stack;
        link = source.deps!;
        subscriber = source;
        ++depth;
        continue;
      }
    }

    if (!isStale && nextDep) {
      link = nextDep;
      continue;
    }

    while (depth) {
      --depth;
      const firstSub = subscriber.subs!;
      const hasManySubs = !!firstSub.nextSub;

      link = hasManySubs ? stack!.value : firstSub;
      const { target, nextDep } = link;

      if (hasManySubs) {
        stack = stack!.prev;
      }

      if (isStale && updateValue(subscriber as SignalBase | ComputedBase)) {
        if (hasManySubs) {
          propagate(firstSub);
        }
        subscriber = target;
        continue;
      } else {
        subscriber.flags &= ~Flags.P;
      }

      subscriber = target;

      if (nextDep) {
        link = nextDep;
        continue validate;
      }

      isStale = false;
    }

    return isStale;

  } while (true);
}

export function processQueue(): void {
  while (queueIndex < effectCount) {
    const effectValue = effectQueue[queueIndex];
    effectQueue[queueIndex++] = undefined;

    if (effectValue) {
      executeEffect(effectValue, effectValue.flags &= ~SCHEDULED);
    }
  }

  queueIndex = effectCount = 0;
}

function updateValue(value: SignalBase | ComputedBase): boolean {
  return (value as ComputedBase).compFn ? executeComputed(value as ComputedBase) : executeSignal(value as SignalBase, (value as SignalBase).currentVal);
}


function scheduleEffect(effectValue: EffectValue | Reactive) {
  const { flags } = effectValue;

  if (!(flags & SCHEDULED)) {
    effectValue.flags = flags | SCHEDULED;
    effectQueue[effectCount++] = effectValue;
  }
}

function executeEffect(effectValue: EffectValue | Reactive, flags: number): void {
  if (
    flags & Flags.D
    || (flags & Flags.P && validateStale(effectValue.deps!, effectValue))
  ) {
    const prevSub = setCurrentSub(effectValue);

    startTracking(effectValue);

    try {
      (effectValue as EffectValue).execFn();
    } finally {
      setCurrentSub(prevSub);
      endTracking(effectValue);
    }

    return;
  } else if (flags & Flags.P) {
    effectValue.flags = flags & ~Flags.P;
  }

  let { deps } = effectValue;

  while (deps) {
    const { source, nextDep } = deps;
    const { flags } = source;

    if (flags & SCHEDULED) {
      executeEffect(source, source.flags = flags & ~SCHEDULED);
    }

    deps = nextDep;
  }
}

