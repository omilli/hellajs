import { Flags, type Reactive } from "../types";
import { removeLink } from "./link";

export function startTracking(subscriber: Reactive): void {
  subscriber.prevDep = undefined;
  subscriber.flags = (subscriber.flags & ~(Flags.Computing | Flags.Dirty | Flags.Pending)) | Flags.Tracking;
}

export function endTracking(subscriber: Reactive): void {
  let remove = subscriber.prevDep ? subscriber.prevDep.nextDep : subscriber.deps;
  while (remove) {
    remove = removeLink(remove, subscriber);
  }
  subscriber.flags &= ~Flags.Tracking;
}
