// HellaJS Core - Single File Bundle

import type {
  Stack,
  Reactive,
  Link,
  EffectValue,
  SignalBase,
  ComputedBase
} from './types'
import { Flags, EffectFlags } from './types'
import { startTracking, endTracking } from './tracking'

const effectQueue: (EffectValue | Reactive | undefined)[] = [];

export let currentValue: Reactive | undefined;

let queueIndex = 0,
  effectCount = 0;

export function executeSignal(signalValue: SignalBase, value: unknown): boolean {
  signalValue.flags = Flags.Writable;
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

    if ((flags & (Flags.Pending | Flags.Dirty)) === Flags.Pending) {
      target.flags = flags | Flags.Dirty;

      if (flags & Flags.Watching) {
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

    if (flags & (Flags.Writable | Flags.Watching)) {
      const m1 = Flags.Tracking | Flags.Computing, m2 = m1 | Flags.Dirty | Flags.Pending;

      if (!(flags & m2)) {
        target.flags = flags | Flags.Pending;
      } else if (!(flags & m1)) {
        flags = Flags.Clean;
      } else {
        flags = Flags.Clean;
      }

      if (flags & Flags.Watching) {
        scheduleEffect(target);
      }

      if (flags & Flags.Writable && subs) {
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

    let isStale = !!(subscriber.flags & Flags.Dirty);

    if (!isStale) {
      if ((flags & (Flags.Writable | Flags.Dirty)) === (Flags.Writable | Flags.Dirty)) {
        if (updateValue(source as SignalBase | ComputedBase)) {
          if (subs?.nextSub) {
            propagate(subs);
          }
          isStale = true;
        }
      } else if ((flags & (Flags.Writable | Flags.Pending)) === (Flags.Writable | Flags.Pending)) {
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
        subscriber.flags &= ~Flags.Pending;
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
      executeEffect(effectValue, effectValue.flags &= ~EffectFlags.ScheduledInQueue);
    }
  }

  queueIndex = effectCount = 0;
}

function updateValue(value: SignalBase | ComputedBase): boolean {
  return (value as ComputedBase).compFn ? executeComputed(value as ComputedBase) : executeSignal(value as SignalBase, (value as SignalBase).currentVal);
}


function scheduleEffect(effectValue: EffectValue | Reactive) {
  const { flags, subs } = effectValue;

  if (!(flags & EffectFlags.ScheduledInQueue)) {
    effectValue.flags = flags | EffectFlags.ScheduledInQueue;
    subs ? scheduleEffect(subs.target as EffectValue) : effectQueue[effectCount++] = effectValue;
  }
}

function executeEffect(effectValue: EffectValue | Reactive, flags: Flags): void {
  if (
    flags & Flags.Dirty
    || (flags & Flags.Pending && validateStale(effectValue.deps!, effectValue))
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
  } else if (flags & Flags.Pending) {
    effectValue.flags = flags & ~Flags.Pending;
  }

  let { deps } = effectValue;

  while (deps) {
    const { source, nextDep } = deps;
    const { flags } = source;

    if (flags & EffectFlags.ScheduledInQueue) {
      executeEffect(source, source.flags = flags & ~EffectFlags.ScheduledInQueue);
    }

    deps = nextDep;
  }
}

