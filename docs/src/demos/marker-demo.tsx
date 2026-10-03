
import Marker, { MarkerContent, MarkerIcon } from "@registry/marker/css/marker.js";
import { stack } from "./demo-kit";

export default function MarkerDemo() {
  return (
    <div class={stack}>
      <Marker>
        <MarkerIcon>✳</MarkerIcon>
        <MarkerContent>Synced 12 entries just now</MarkerContent>
      </Marker>
    </div>
  );
}

export function MarkerSeparatorDemo() {
  return (
    <div class={stack}>
      <Marker variant="separator">
        <MarkerContent>Chapter 4</MarkerContent>
      </Marker>
    </div>
  );
}

export function MarkerBorderDemo() {
  return (
    <div class={stack}>
      <Marker variant="border">
        <MarkerContent>End of list</MarkerContent>
      </Marker>
    </div>
  );
}
