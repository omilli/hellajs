import { Flags, type Reactive, type Link } from "../types";

export function createLink(source: Reactive, target: Reactive): void {
  const prevDep = target.lastDep;
  if (prevDep && prevDep.source === source) return;

  let nextDep: Link | undefined;
  const isTracking = target.flags & Flags.Tracking;

  if (isTracking) {
    nextDep = prevDep ? prevDep.nextDep : target.deps;
    if (nextDep && nextDep.source === source) {
      target.lastDep = nextDep;
      return;
    }
  }

  const prevSub = source.lastSub;

  const newLink = target.lastDep = source.lastSub = {
    source, target, prevDep, nextDep, prevSub, nextSub: undefined,
  };

  if (nextDep) nextDep.prevDep = newLink;
  if (prevDep) prevDep.nextDep = newLink; else target.deps = newLink;
  if (prevSub) prevSub.nextSub = newLink; else source.subs = newLink;
}


export function removeLink(link: Link, target = link.target): Link | undefined {
  const { source, nextDep, prevDep, nextSub, prevSub } = link;

  if (nextDep) nextDep.prevDep = prevDep; else target.lastDep = prevDep;
  if (prevDep) prevDep.nextDep = nextDep; else target.deps = nextDep;
  if (nextSub) nextSub.prevSub = prevSub; else source.lastSub = prevSub;

  if (prevSub) {
    prevSub.nextSub = nextSub;
  } else if (!(source.subs = nextSub)) {
    if ('compFn' in source) {
      let remove = source.deps;
      if (remove) {
        source.flags = Flags.Writable | Flags.Dirty;
        do remove = removeLink(remove, source); while (remove);
      }
    }
  }
  return nextDep;
}




