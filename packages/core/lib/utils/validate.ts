import { Flags, type Link, type Reactive, type Stack } from "../types";
import type { ComputedValue } from "../computed";
import { propagate } from "./propagate";
import type { SignalValue } from "../signal";
import { updateValue } from "./value";

export function validateStale(link: Link, subscriber: Reactive): boolean {
  let stack: Stack<Link> | undefined, depth = 0;

  validate: do {
    const { source, nextSub, prevSub, nextDep } = link;
    const { flags, subs } = source;
    let isStale = !!(subscriber.flags & Flags.Dirty);

    if (!isStale) {
      if ((flags & (Flags.Writable | Flags.Dirty)) === (Flags.Writable | Flags.Dirty)) {
        if (updateValue(source as SignalValue | ComputedValue)) {
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

      if (isStale && updateValue(subscriber as SignalValue | ComputedValue)) {
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