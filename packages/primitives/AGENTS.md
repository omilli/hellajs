<primitives-package-instructions>
  Headless DOM behavior functions over real nodes: `trapFocus`, `onEscape`, `onOutside`, `rovingTabIndex`. Zero runtime deps and zero peers by design (the "Radix split" layer `@hellajs/ui` registry components import); state stays in caller signals. Barrel: `lib/index.ts`.

  ## Public exports (`lib/index.ts`)

  | Export | Kind | Source | Throw contract |
  |---|---|---|---|
  | `trapFocus` | function → dispose | `trapFocus.ts` | `[primitives] trapFocus: container is required` when `container == null` |
  | `onEscape` | function → dispose | `onEscape.ts` | `[primitives] onEscape: target is required` / `handler is required` |
  | `onOutside` | function → dispose | `onOutside.ts` | `[primitives] onOutside: targets is required` / `handler is required` |
  | `rovingTabIndex` | function → dispose | `rovingTabIndex.ts` | `[primitives] rovingTabIndex: container is required` when `container == null` |
  | `type *` | interfaces | `types.d.ts` | `TrapFocusOptions`, `RovingTabIndexOptions` (hand-written `.d.ts`, wholesale `export type *`) |

  ## File map

  | File | Responsibility |
  |---|---|
  | `trapFocus.ts` | Document capture-phase keydown; wraps Tab/Shift+Tab when `activeElement` is exactly the first/last focusable. Focuses `initialFocus()` result or the first focusable at trap time; captures pre-trap `activeElement` and restores it on release unless `restoreFocus: false`. Focusables re-queried per keypress (dynamic children join the trap). |
  | `onEscape.ts` | Bubble-phase keydown on the target itself; fires `handler` only on `key === "Escape"`. |
  | `onOutside.ts` | Document capture-phase pointerdown; re-invokes the `targets` getter per event, skips `null` entries, ignores the press when any resolved node `.contains(event.target)`, else fires `handler`. |
  | `rovingTabIndex.ts` | Container bubble-phase keydown over `getFocusables(container, selector)`. Init: first item `tabindex=0`, rest `-1`, never steals focus. Per key: resolve `current` via `indexOf(activeElement)` (`-1` → ignore — arrows act only with focus inside the group); orientation gates the axis; Home/End become deltas; `loop` wraps (`(target + len) % len`) or clamps at the ends; writes `tabindex=0` on the target item, `-1` on the rest. Dispose restores each init-snapshot item's original attribute (`removeAttribute` when it had none). |
  | `internal/focusables.ts` | `FOCUSABLE_SELECTOR` (`a[href]`, enabled `button`/`input`/`select`/`textarea`, `[tabindex]:not([tabindex="-1"])`) + `getFocusables(root, selector?)` — the shared collector for `trapFocus` (default) and `rovingTabIndex` (default + `selector` override). |
  | `types.d.ts` | The two options interfaces. |

  ## Non-obvious

  - **Dispose is REQUIRED in cleanup paths.** `trapFocus` and `onOutside` listen on `document` — the wiring outlives the trapped/observed element; skipping the dispose handle leaks a live global listener against a detached container.
  - **Default collector vs roving's `-1` writes.** `getFocusables` excludes `tabindex="-1"`, and roving writes `-1` onto inactive items. Items collected only via their `tabindex` attribute (spans, not natively focusable) drop out of the default group after the first move; such groups must pass `selector`. Natively focusable items (buttons, links, inputs) stay collected — the selector arms match them regardless of `tabindex`.
  - **No core shim, raw `== null` validation.** Zero-dep by design, so no `lib/internal/core.ts` guards; every public function validates with `== null` (the guide's raw-stays form — null-or-undefined, no guard equivalent). Do not convert these to `typeof` comparisons (eslint-banned in `packages/*/lib`).
  - **`onEscape`/`rovingTabIndex` listeners take `(event: Event)`.** Generic `Node`/`ParentNode` targets only expose the string→`EventListener` overload (no keyed event map, unlike `document`), so those two closures narrow `(event as KeyboardEvent)` once at the top; `trapFocus`/`onOutside` attach to `document` and keep concrete event params.
  - **Wrap only at the exact edges.** `trapFocus` intercepts when `activeElement` is the first or last focusable; focus elsewhere inside the container falls through to native Tab behavior. Pull-back from outside the container is deliberately absent.

  ## Testing

  - Run `bun coverage primitives` (never bare `bun test` — stale bundles; `guides/tests.md` §Triage & Gate Semantics). Shared helpers in `tests/helpers.ts`: `setupButtons` (container + labeled buttons in the body), `pressKey` (bubbling, **`cancelable: true`** keydown — without it `defaultPrevented` asserts fail silently), `pointerDown`. Files: `trapfocus`, `onescape`, `onoutside`, `rovingtabindex` — one `test()` per plan scenario, sequential lifecycle style within each.
</primitives-package-instructions>
