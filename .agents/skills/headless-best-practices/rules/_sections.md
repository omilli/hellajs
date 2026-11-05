| prefix | title | impact | description |
|---|---|---|---|
| util | Utils entry and dispose handles | HIGH | The @hellajs/headless/utils subpath and the dispose-handle cleanup contract over document/window listeners |
| int | Interaction primitives | CRITICAL | trapFocus, onEscape, onOutside, rovingTabIndex, hoverIntent, menuTypeahead wiring, live getters, and teardown |
| pos | Anchor positioning | HIGH | anchorPosition live fixed overlays, computeAnchorPosition flip-then-clamp placement math |
| gest | Pointer gestures | HIGH | onDrag cumulative deltas, onSwipe commit gates, onPinch two-pointer pairs, timed presses |
| layer | Layered dismissal and modality | CRITICAL | layerDismissal stack discipline, modal node-scoped re-armable arming |
| comp | Component factories | CRITICAL | Overlay, hover, menu, listbox, press, disclosure, calendar, form, and scroll part sets |
| state | State ownership | CRITICAL | Controlled-or-internal accessors, change reporting, state in user signals |
