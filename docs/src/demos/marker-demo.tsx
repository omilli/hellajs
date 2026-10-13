
import { Marker, MarkerContent, MarkerIcon } from "@components/ui/marker.js";

export function MarkerDemo() {
  return (
    <>
      <Marker>
        <MarkerIcon>✳</MarkerIcon>
        <MarkerContent>Synced 12 entries just now</MarkerContent>
      </Marker>
    </>
  );
}

export function MarkerSeparatorDemo() {
  return (
    <>
      <Marker variant="separator">
        <MarkerContent>Chapter 4</MarkerContent>
      </Marker>
    </>
  );
}

export function MarkerBorderDemo() {
  return (
    <>
      <Marker variant="border">
        <MarkerContent>End of list</MarkerContent>
      </Marker>
    </>
  );
}
