import { Flags, type Link, type Stack } from "../types";
import { scheduleEffect } from "../effect";

export function propagate(link: Link): void {
  do {
    const { target, nextSub } = link;
    const { flags } = target;

    if ((flags & (Flags.Pending | Flags.Dirty)) === Flags.Pending) {
      target.flags = flags | Flags.Dirty;
      if (flags & Flags.Watching) scheduleEffect(target);
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

      if (!(flags & m2)) target.flags = flags | Flags.Pending;
      else if (!(flags & m1)) flags = Flags.Clean;
      else flags = Flags.Clean;

      if (flags & Flags.Watching) scheduleEffect(target);

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