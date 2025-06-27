import type { ComputedBase } from "../computed";
import { Flags, type Reactive, type Link } from "../types";

export function createLink(source: Reactive, target: Reactive): void {
  const { prevDep } = target;
  if (prevDep && prevDep.source === source) return;

  let nextDep: Link | undefined;
  const isTracking = target.flags & Flags.Tracking;

  if (isTracking) {
    nextDep = prevDep ? prevDep.nextDep : target.deps;
    if (nextDep && nextDep.source === source) {
      target.prevDep = nextDep;
      return;
    }
  }

  const prevSub = source.prevSub;

  const newLink = target.prevDep = source.prevSub = {
    source, target, prevDep, nextDep, prevSub, nextSub: undefined,
  };

  if (nextDep) {
    nextDep.prevDep = newLink;
  }

  if (prevDep) {
    prevDep.nextDep = newLink;
  } else {
    target.deps = newLink;
  }

  if (prevSub) {
    prevSub.nextSub = newLink;
  } else {
    source.subs = newLink;
  }
}


export function removeLink(link: Link, target = link.target): Link | undefined {
  const { source, nextDep, prevDep, nextSub, prevSub } = link;

  if (nextDep) {
    nextDep.prevDep = prevDep;
  } else {
    target.prevDep = prevDep;
  }

  if (prevDep) {
    prevDep.nextDep = nextDep;
  } else {
    target.deps = nextDep;
  }

  if (nextSub) {
    nextSub.prevSub = prevSub;
  } else {
    source.prevSub = prevSub;
  }

  if (prevSub) {
    prevSub.nextSub = nextSub;
  }

  else if (!(source.subs = nextSub)) {
    if ((source as ComputedBase).compFn) {
      let remove = source.deps;

      if (remove) {
        source.flags = Flags.Writable | Flags.Dirty;

        do {
          remove = removeLink(remove, source);
        } while (remove);
      }
    }
  }

  return nextDep;
}