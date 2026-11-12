# store-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for @hellajs/store, the deeply reactive state package: store() converting plain objects into granular signals, nested stores, collection containers, and preserved functions; $snapshot copies, $update deep merges and draft mutators with structural diffing; per-key equals and middleware; readonly creation config; $subscribe single-key observation with unsubscribe discipline; $cleanup teardown scope; persistStore with localStorageAdaptor, sessionStorageAdaptor, and custom StoreAdaptors covering hydration, partialize, debounce, and dispose. Every rule is grounded in the package source and test suite.

- Version: 1.0.0
- Organization: HellaJS
- Date: 2026-11-04

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Contents
- 1. Shape and conversion
  - 1.1 Class-instance leaves are whole-value signals (`shape-class-instances-whole-signals`)
  - 1.2 Drive collections through the container surface, never the bare-call copy (`shape-collections-granular-containers`)
  - 1.3 Compose stores by embedding, subscribe on the owner (`shape-compose-stores`)
  - 1.4 Function properties are behavior, not state (`shape-functions-preserved`)
  - 1.5 Read and write store state through the property calls (`shape-properties-are-the-signals`)
- 2. Snapshots and updates
  - 2.1 Draft mutators apply structural diffs and auto-batch their writes (`snap-draft-structural-batching`)
  - 2.2 Gate equal writes with per-key equals comparators (`snap-equals-gates-writes`)
  - 2.3 Grow stores through the reference $update returns (`snap-grow-via-returned-store`)
  - 2.4 $snapshot() returns a point-in-time copy, never live state (`snap-snapshot-copy`)
  - 2.5 Change state through $update, never by recreating the store (`snap-update-never-recreate`)
- 3. Subscriptions and cleanup
  - 3.1 $cleanup tears down nested stores, not leaf signals (`sub-cleanup-tears-down-stores`)
  - 3.2 $subscribe observes one settable key on the owning store (`sub-subscribe-settable-keys`)
  - 3.3 Call the unsubscribe function every subscription returns (`sub-unsubscribe-discipline`)
- 4. Reserved keys and readonly
  - 4.1 Configure readonly at creation; it propagates deep (`res-readonly-at-creation`)
  - 4.2 Keep the $-prefixed method names out of initial state (`res-reserved-keys`)
- 5. Persistence
  - 5.1 Persist through a StoreAdaptor built by the shipped factories (`persist-adaptor-shape`)
  - 5.2 Debounce write bursts and dispose persistence handles (`persist-debounce-dispose`)
  - 5.3 Gate async persistence on the hydrated flag (`persist-hydration-contract`)
  - 5.4 Partialize persistence down to serializable state (`persist-partialize-serializable`)

## 1. Shape and conversion

### 1.1 Class-instance leaves are whole-value signals

**Impact: HIGH** - in-place mutation of a Date, RegExp, or custom instance wakes no subscriber, silently losing reactivity

Conversion recurses only into plain objects - `Date`, `RegExp`, and custom class instances are not plain objects, so each becomes a single signal holding the instance (class instances stay settable like primitives). Reading `session.startedAt()` returns the live instance; mutating it in place changes the object the signal already holds without any signal write, so no subscriber ever wakes - the change is invisible to every effect. Write a new instance through the property call to notify readers.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const session = store({ startedAt: new Date(2026, 0, 1) });

// Mutates the instance the signal already holds: no write, no wake
session.startedAt().setFullYear(2024);
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const session = store({ startedAt: new Date(2026, 0, 1) });

// A new instance through the signal is a real write; readers wake
session.startedAt(new Date(2024, 0, 1));
```

Reference: `packages/store/lib/internal/create.ts materializeKey` and `packages/store/docs/concepts/state.mdx` and `packages/store/tests/equals.test.ts`

### 1.2 Drive collections through the container surface, never the bare-call copy

**Impact: HIGH** - pushing into the fresh array a bare collection read returns mutates a throwaway copy and wakes no reader

Array, `Map`, and `Set` keys install granular containers (`signalArray`/`signalMap`/`signalSet` from `@hellajs/core`): plain-object elements convert to element stores, so a field write wakes exactly that field's readers. The write surface is the container's methods - structural operations (`push`, `pop`, `splice`, `insert`), element handles (`get(i)`, `set(i, patch)`, `Map.entry(k)`) - and the whole-callable write, which reconciles position-wise: equal positions write nothing, changed positions patch, length changes restructure. A bare read `todos.todos()` returns a fresh plain array snapshot of the current elements; mutating that copy notifies nobody. `$snapshot()` is the deep-plain form for rendering (element stores flattened to plain objects).

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const todos = store({
  todos: [{ id: 1, text: "write rules", completed: false }],
});

// Bare call returns a fresh plain array: the push lands in a throwaway copy
todos.todos().push({ id: 2, text: "verify", completed: false });
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const todos = store({
  todos: [{ id: 1, text: "write rules", completed: false }],
});

todos.todos.push({ id: 2, text: "verify", completed: false }); // structural wake
todos.todos.get(0)!.completed(true); // field write: wakes completed readers only
todos.todos.set(0, { text: "write rules and refs" }); // partial patch, id kept
const plain = todos.$snapshot().todos; // deep-plain for rendering
```

Reference: `packages/store/lib/internal/deep.ts installCollection` and `packages/store/docs/concepts/state.mdx` and `packages/store/tests/collections.test.ts`

### 1.3 Compose stores by embedding, subscribe on the owner

**Impact: MEDIUM** - subscribing through a parent on a nested store's key throws, so observation silently fails to attach

Passing an existing store as a value inside another store's initial object composes them: the nested store's data signals are shared by reference, so writes propagate in both directions (`appStore.user.name("Bob")` also updates `userStore`) and snapshots flatten through. Composition preserves each store's own config - a readonly store stays readonly inside a writable parent and a writable one stays writable inside a readonly parent. Observation follows ownership: `$subscribe` gates on the store's own settable-key registry, and a nested store's key is not signal-backed, so `appStore.$subscribe("user", ...)` throws. Subscribe through the store that owns the key.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const userStore = store({ name: "Ada" });
const appStore = store({ user: userStore, version: 1 });

// Throws: "user" is a nested-store key, not a signal-backed one
appStore.$subscribe("user", (next) => renderUser(next));
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function renderUser(name: string) {}

const userStore = store({ name: "Ada" });
const appStore = store({ user: userStore, version: 1 });

// Subscribe through the owning store
const stop = userStore.$subscribe("name", (next) => renderUser(next));
stop();

// Writes propagate both directions across the shared signals
appStore.user.name("Bob");
userStore.$update({ name: "Grace" }); // deep merge through the owner flows too
```

Reference: `packages/store/tests/nested.test.ts` and `packages/store/lib/internal/create.ts createStore` and `packages/store/docs/concepts/state.mdx`

### 1.4 Function properties are behavior, not state

**Impact: MEDIUM** - routing a function swap through $update throws, and a swapped function is not what $snapshot reports

`store()` preserves function-valued properties as-is: they never become signals, never enter the settable registry, and `$update` refuses them - a function property throws "is a function property, not state - assign it directly", and a function value on a new key throws too. Swap a function by direct assignment; function properties are the one writable kind. Two follow-ons: `$snapshot()` reports the original `initial` function reference, not a later swap, and function values are dropped by JSON serialization, so they never persist. Keep only stable behavior inside the store; per-render callbacks belong outside it.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const editor = store({
  text: "",
  onSave: () => saveToServer(), // zero-arg handler: preserved as-is
});

// Throws: onSave is a function property, not state
editor.$update({ onSave: () => saveToServer() });
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function saveToServer() {}

const editor = store({
  text: "",
  onSave: () => saveToServer(),
});

// Function properties swap by direct assignment - the writable exemption
editor.onSave = () => saveToServer();
editor.$update({ text: "hello" }); // state flows through $update
```

The typing gate mirrors the runtime one: a function property types as preserved (and stays directly assignable) only when its signature accepts unknown arguments - zero-argument handlers always qualify, while a one-argument handler typed to a narrower parameter types as a signal holding the function.

Reference: `packages/store/lib/internal/create.ts materializeKey` and `packages/store/tests/functions.test.ts` and `packages/store/docs/api/store.mdx`

### 1.5 Read and write store state through the property calls

**Impact: HIGH** - reassignment throws a TypeError and wrapper-object reads see undefined, so state changes never land

`store(initial)` converts each property into the reactive primitive itself: primitives become `@hellajs/core` signals, nested plain objects become nested stores, collections become granular containers. There is no wrapper object and no proxy - read by calling the property (`settings.theme()`), write by calling it with a value (`settings.theme("dark")`, `settings.user.name("Bob")`). Data properties and the `$`-prefixed methods are defined non-writable, so `settings.theme = "dark"` throws a TypeError in strict-mode ESM instead of updating state; function properties are the one swappable exemption.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const settings = store({ theme: "light", user: { name: "Ada" } });

// Data properties are non-writable: strict-mode ESM throws a TypeError
settings.theme = "dark";

// No wrapper object exists: .value reads undefined, the signal never runs
const userName = settings.user.value.name;
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const settings = store({ theme: "light", user: { name: "Ada" } });

const theme: string = settings.theme(); // read
settings.theme("dark"); // write
settings.user.name("Bob"); // nested write wakes only name readers
```

Reference: `packages/store/lib/internal/utils.ts defineStoreProperty` and `packages/store/lib/types.d.ts Store` and `packages/store/tests/data.test.ts`


## 2. Snapshots and updates

### 2.1 Draft mutators apply structural diffs and auto-batch their writes

**Impact: HIGH** - untouched values are never rewritten, and the extracted writes coalesce per tick, but the draft path still materializes the full snapshot first

`$update(draft => ...)` clones the snapshot, runs the mutator, then `extractChanges` walks the draft and records only structural differences: arrays, Dates, Maps, Sets, and class instances compare by content, so untouched values are never rewritten and their subscribers sleep. Two contract points. Each extracted change is a separate signal write, and core's microtask drain coalesces them: multi-key drafts fire subscribed effects once, with final values (`flush()` forces that drain synchronously). And the draft path materializes the full snapshot first, so calling it inside an effect subscribes that effect to every signal in the tree - keep drafts out of narrow effects.

**Incorrect (what is wrong):**

```ts
import { effect, flush, signal } from "@hellajs/core";
import { store } from "@hellajs/store";

const form = store({ email: "", name: "", touched: false });
const saveCount = signal(0);

effect(() => {
  form.email();
  form.touched();
  saveCount(saveCount() + 1);
});
form.$update((draft) => {
  draft.email = "ada@example.com";
  draft.touched = true;
});
flush();
flush(); // Second drain is a no-op: same-tick writes already coalesced
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const form = store({ email: "", name: "", touched: false });

// Both extracted writes land in one drain: effects fire once with final values
form.$update((draft) => {
  draft.email = "ada@example.com";
  draft.touched = true;
});
```

Reference: `packages/store/lib/internal/draft.ts extractChanges` and `packages/store/tests/draft.test.ts` and `packages/store/docs/api/store.mdx`

### 2.2 Gate equal writes with per-key equals comparators

**Impact: MEDIUM** - identity-defaulted class-instance writes wake every subscriber even when nothing changed by content

Pass `equals` at creation to skip no-op writes: a comparator returning `true` drops the write entirely - the signal keeps its value and no subscriber wakes - and `"structural"` compares content (Dates by time, NaN by SameValueZero, arrays element-wise). Comparators apply on every write path - direct calls, `$update(partial)`, and drafts - and run after middleware, so they see transformed values. Object keys take a nested equals map that threads into the nested store's own keys (anything else throws at create time); Array/Map/Set keys take a per-element comparator: it receives two elements (two values for a Map), never two collections.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const log = store({ at: new Date(2026, 0, 1) });

// Same instant, different instance: the identity default wakes every reader
log.at(new Date(2026, 0, 1));
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const log = store(
  { at: new Date(2026, 0, 1) },
  { equals: { at: "structural" } },
);

// Content-equal: the write is skipped, no subscriber wakes
log.at(new Date(2026, 0, 1));
```

Reference: `packages/store/lib/types.d.ts StoreEquals` and `packages/store/tests/equals.test.ts` and `packages/store/docs/api/store.mdx`

### 2.3 Grow stores through the reference $update returns

**Impact: MEDIUM** - added keys widen only the returned reference, so reading them off the original reference is a stale-type trap and draft adds stay untyped

`$update` materializes keys absent from the initial object - there is no `set` API and no pre-declared option. The widening is typed on the return only: the partial-path overload returns the store widened by the partial's new keys, while the original reference's type stays stale (the `Object.assign` seam). Capture the returned reference to read added keys type-safely. The draft path materializes runtime adds too, but the mutator is typed against the current shape, so draft adds stay untyped - the direct partial is the typed way to grow a store. Added keys join the settable registry for later writes and subscriptions but get no middleware or equals; those are keyed by the creation shape. Readonly stores and readonly keys reject additions.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const session = store({ user: "ada" });

session.$update({ expiresAt: 1234 });

// Stale type on the original reference: expiresAt does not exist on it
session.expiresAt();
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function checkExpiry(at: number) {}

const session = store({ user: "ada" });

// The widened reference types the added key
const grown = session.$update({ expiresAt: 1234 });
grown.expiresAt(); // number
grown.$subscribe("expiresAt", (next) => checkExpiry(next));
```

Reference: `packages/store/lib/types.d.ts $update` and `packages/store/tests/future.test.ts` and `packages/store/docs/api/store.mdx`

### 2.4 $snapshot() returns a point-in-time copy, never live state

**Impact: CRITICAL** - a captured snapshot never updates and writes into it never reach the store, so effects reading it go stale forever

`$snapshot()` is a computed that flattens the whole tree into a fresh plain object: nested stores and collection element stores unwrap to plain values, functions report the original references. The result is a copy - mutating it never reaches the store, and a reference captured once freezes at that moment. Call `$snapshot()` fresh inside each tracking context: inside an effect it re-runs on any change because the computed subscribes to every underlying signal. For targeted observation prefer the property signals or `$subscribe`.

**Incorrect (what is wrong):**

```ts
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store";

const cart = store({ items: 2, total: 40 });

// Captured once at module scope: state freezes here forever
const state = cart.$snapshot();

effect(() => {
  // Never re-runs - state is a detached plain object
  badge.textContent = String(state.items);
});
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store";

const cart = store({ items: 2, total: 40 });
const badge = { textContent: "" };

effect(() => {
  // Fresh read inside the effect: any change re-runs it
  badge.textContent = String(cart.$snapshot().items);
});

// For one key, subscribe without flattening the tree
const stop = cart.$subscribe("items", (next) => {
  badge.textContent = String(next);
});
stop();
```

Reference: `packages/store/lib/internal/create.ts snapshotComputed` and `packages/store/tests/snapshot.test.ts` and `packages/store/docs/api/store.mdx`

### 2.5 Change state through $update, never by recreating the store

**Impact: CRITICAL** - a recreated store orphans every subscriber and rendered binding - all keep pointing at dead state while the new copy diverges

`store(initial)` builds a fresh reactive tree; there is no replace-the-whole-state API because the store's properties ARE the signals consumers subscribed to. Reassigning a variable with `store({ ...newState })` strands every prior reader. Mutate in place instead: `$update(partial)` deep-merges plain-object values into nested stores (untouched keys keep their signals and subscribers), or `$update(draft => ...)` applies structural edits. Both paths return the same store object, so the store keeps one identity.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

let settings = store({ theme: "light", fontSize: 12 });

// A new store: every effect, subscription, and rendered binding on the old
// reference now reads dead state
settings = store({ theme: "dark", fontSize: 14 });
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const settings = store({ theme: "light", fontSize: 12 });

// Deep merge: theme's subscribers wake, fontSize's keep sleeping
settings.$update({ theme: "dark" });

// Draft mutator for structural edits, same store identity
settings.$update((draft) => {
  draft.fontSize = 14;
});
```

Reference: `packages/store/lib/internal/create.ts $update` and `packages/store/tests/update.test.ts` and `packages/store/docs/concepts/state.mdx`


## 3. Subscriptions and cleanup

### 3.1 $cleanup tears down nested stores, not leaf signals

**Impact: MEDIUM** - expecting cleanup to stop effects on leaf signals leaves them running - cleanup disposes store structure only

`$cleanup()` recursively invokes cleanup on nested stores and collection element stores - the structural members of the tree. Individual leaf signals are functions and are never disposed: they stay functional, so effects reading `todos.items` keep firing after `$cleanup()`. Cleanup is idempotent, does not null properties (the store object stays intact and readable), and never invokes preserved user functions. Use it to tear down a subtree's element stores; use each effect's own disposer, or `$subscribe`'s unsubscribe, to stop leaf-level observation.

**Incorrect (what is wrong):**

```ts
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store";

const todos = store({ items: [{ text: "a", done: false }] });

effect(() => {
  void todos.$snapshot().items.length;
});

todos.$cleanup();

// Wrong expectation: the effect above keeps running - leaf signals survive
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store";

const todos = store({ items: [{ text: "a", done: false }] });

// Own the effect disposer for leaf-level teardown
const dispose = effect(() => {
  void todos.$snapshot().items.length;
});

dispose(); // stops the effect
todos.$cleanup(); // tears down the element stores of the tree
```

Reference: `packages/store/lib/internal/create.ts $cleanup` and `packages/store/tests/cleanup.test.ts` and `packages/store/docs/api/store.mdx`

### 3.2 $subscribe observes one settable key on the owning store

**Impact: HIGH** - subscribing to a nested-store, function, or reserved key throws, so observation never attaches

`$subscribe(key, callback)` wraps a core effect over one signal-backed property. It throws for anything outside the store's settable-key registry: nested-store keys, preserved functions, reserved keys, unknown keys. The callback receives `(next, prev)` on writes only - never the initial value - and runs untracked, so signal reads inside it never widen the subscription. Readonly keys are observable read-only: subscribing is legal but the callback never fires. Collection keys are container-level: structural operations and whole-collection writes fire, element field writes never do.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const app = store({ user: { name: "Ada" }, version: 1 });

// Throws: "user" is a nested store, not a signal-backed key
app.$subscribe("user", (next) => renderUser(next));
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function audit(message: string) {}

const app = store({ user: { name: "Ada" }, version: 1 });

// Observe a settable leaf; callback runs untracked with (next, prev)
const stop = app.$subscribe("version", (next, prev) => {
  audit(`version ${String(prev)} -> ${String(next)}`);
});
stop();
```

Reference: `packages/store/lib/internal/create.ts $subscribe` and `packages/store/tests/subscribe.test.ts` and `packages/store/docs/api/store.mdx`

### 3.3 Call the unsubscribe function every subscription returns

**Impact: CRITICAL** - a dropped unsubscribe leaks the subscription effect - the callback and everything it captures outlive the consumer

`$subscribe` returns an unsubscribe function (a core effect disposer). Dropping it leaves the effect alive for the rest of the session: the callback keeps firing on every write and pins everything its closure captures. Call the disposer when the consumer unmounts - component teardown, route leave, test end; calling it more than once is safe.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const stats = store({ score: 0 });

// Return value dropped: the subscription can never be undone
stats.$subscribe("score", (next) => updateScoreboard(next));
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

function updateScoreboard(score: number) {}

const stats = store({ score: 0 });

// Keep the disposer and call it on teardown (idempotent)
const stopScore = stats.$subscribe("score", (next) => updateScoreboard(next));

function teardown() {
  stopScore();
}
```

Reference: `packages/store/lib/types.d.ts $subscribe` and `packages/store/tests/subscribe.test.ts` and `packages/store/docs/api/store.mdx`


## 4. Reserved keys and readonly

### 4.1 Configure readonly at creation; it propagates deep

**Impact: HIGH** - readonly cannot be toggled later, and writes through any path on a readonly key throw at runtime

`readonly` is creation-time config: `readonly: true` freezes every key and propagates into every nested plain-object level (each nested store derives its own full key set, so no name-collision false lockdown), while `readonly: ["id"]` freezes listed keys, deep for listed object keys. Enforcement is a runtime throwing guard on every write path: setter calls (`doc.id(8)`), `$update`, and every collection mutator throw. Composed stores keep their own config - a readonly store stays readonly inside a writable parent and a writable one stays writable inside a readonly parent. Readonly stores reject new keys; subscribing to a readonly key is legal read-only observation that never fires.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

const doc = store(
  { id: 7, title: "draft", meta: { locked: false } },
  { readonly: ["id"] },
);

// Throws at runtime: id is guarded - readonly is not advisory
doc.id(8);
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

const doc = store(
  { id: 7, title: "draft", meta: { locked: false } },
  { readonly: ["id"] },
);

// Writable keys update normally; the readonly key only reads
doc.$update({ title: "final", meta: { locked: true } });
const id: number = doc.id();
```

Reference: `packages/store/lib/internal/create.ts materializeKey` and `packages/store/tests/readonly.test.ts` and `packages/store/docs/api/store.mdx`

### 4.2 Keep the $-prefixed method names out of initial state

**Impact: CRITICAL** - any non-store initial object containing $snapshot, $update, $cleanup, or $subscribe throws at create time

`$snapshot`, `$update`, `$cleanup`, and `$subscribe` are the store's method namespace - `createStore` defines them on every store. An initial object containing any of them throws at create time ("reserved key collision") for every value type, including functions, and `$update` rejects writes targeting them, so a store cannot be hijacked through its own update path. The one exemption is composition: passing an existing store as a value has its reserved keys recognized and skipped. Data keys never need the `$` prefix - keep state keys unprefixed.

**Incorrect (what is wrong):**

```ts
import { store } from "@hellajs/store";

// Throws at create time: $snapshot is a reserved method name
const broken = store({
  count: 0,
  $snapshot: { version: 2 },
});
```

**Correct (what is right):**

```ts
import { store } from "@hellajs/store";

// Unprefixed data keys; the $ methods come with the store
const state = store({
  count: 0,
  snapshotVersion: 2,
});

const snap = state.$snapshot(); // the method, not a collision
```

Reference: `packages/store/lib/internal/utils.ts reservedKeys` and `packages/store/tests/reserved.test.ts` and `packages/store/docs/api/store.mdx`


## 5. Persistence

### 5.1 Persist through a StoreAdaptor built by the shipped factories

**Impact: MEDIUM** - passing raw storage objects or key strings fails the adaptor contract - read, write, and clear are the whole backend

`persistStore(store, adaptor, options?)` takes a `StoreAdaptor` - `{ read, write, clear }` - not a storage object and not a key. Build the shipped backends with their factories: `localStorageAdaptor("key")` and `sessionStorageAdaptor("key")` defer storage access to call time, so importing and constructing them on the server is safe. Every method may return a promise: the contract is async-first, so an IndexedDB adaptor implements the same three methods as localStorage. A synchronous read settles hydration before `persistStore` returns; a promise read settles when it resolves.

**Incorrect (what is wrong):**

```ts
import { persistStore, store } from "@hellajs/store";

const settings = store({ theme: "light" });

// Wrong on both counts: the global storage object is not an adaptor,
// and the key belongs inside a factory
persistStore(settings, localStorage);
```

**Correct (what is right):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const settings = store({ theme: "light", fontSize: 12 });

// Factory takes the storage key; persistStore drives read/write/clear
const persist = persistStore(settings, localStorageAdaptor("settings"));

settings.theme("dark"); // written through to localStorage
```

Exceptions: custom backends implement the `StoreAdaptor` interface directly - an IndexedDB persistence layer wraps its promise API in the same three methods.

Reference: `packages/store/lib/persistStore.ts persistStore` and `packages/store/lib/localStorageAdaptor.ts` and `packages/store/docs/api/persiststore.mdx`

### 5.2 Debounce write bursts and dispose persistence handles

**Impact: MEDIUM** - an undisposed persistence effect outlives its owner and keeps writing to storage; un-debounced bursts write per keystroke

By default every post-hydration change writes to storage immediately. `debounce` (milliseconds) coalesces bursts into one write per window carrying the final state, with a `pagehide` flush so the tail is not lost. The handle's `dispose()` stops write-through permanently: it kills the persistence effect, cancels a pending debounced write, and removes the pagehide listener. Keep the handle and call `dispose()` when the persisted store's owner tears down (SPA route unmount, test end); dropping the handle leaves the effect writing for the rest of the session. Dispose is idempotent, and disposing before an async read settles abandons hydration with the store keeping its current state.

**Incorrect (what is wrong):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const draft = store({ text: "" });

// Handle dropped: the effect writes on every debounce window for the rest
// of the session and can never be stopped
persistStore(draft, localStorageAdaptor("draft"), { debounce: 200 });
```

**Correct (what is right):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const draft = store({ text: "" });
const persist = persistStore(draft, localStorageAdaptor("draft"), {
  debounce: 200, // one write per 200ms window, flushed on pagehide
});

function teardown() {
  persist.dispose(); // stops write-through, cancels pending writes
}
```

Reference: `packages/store/lib/persistStore.ts persistStore` and `packages/store/docs/api/persiststore.mdx` and `packages/store/tests/persist.test.ts`

### 5.3 Gate async persistence on the hydrated flag

**Impact: HIGH** - rendering persisted state before an async adaptor settles flashes initial state and can mislead the user

Hydration timing depends on the adaptor's read. A plain-value read (localStorage) applies before `persistStore` returns - no flash of initial state. A promise read (IndexedDB, custom adaptors) applies when it resolves: gate rendering on the handle's reactive `hydrated()` flag, or await `ready`, which never rejects. Races self-resolve: if a persisted key changes before the read settles, the in-memory state wins (dirty-skip), and changes to partialized-away keys never trigger the skip. Corrupt stored state self-heals - storage is cleared, the initial state is kept, `onError` fires, and hydration still flips - so a bad stored value never bricks the app. On the server the handle is inert and `hydrated()` is true immediately.

**Incorrect (what is wrong):**

```ts
import { persistStore, store } from "@hellajs/store";
import type { StoreAdaptor } from "@hellajs/store";

const idbAdaptor: StoreAdaptor = {
  read: () => Promise.resolve('{"draft":"persisted"}'),
  write: () => {},
  clear: () => {},
};

const editor = store({ draft: "" });
persistStore(editor, idbAdaptor);

// Async read has not settled: this renders "" and flashes
renderPanel(editor.draft());
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { persistStore, store } from "@hellajs/store";
import type { StoreAdaptor } from "@hellajs/store";

function renderPanel(draft: string) {}

const idbAdaptor: StoreAdaptor = {
  read: () => Promise.resolve('{"draft":"persisted"}'),
  write: () => {},
  clear: () => {},
};

const editor = store({ draft: "" });
const persist = persistStore(editor, idbAdaptor);

effect(() => {
  if (persist.hydrated()) {
    renderPanel(editor.draft()); // persisted state applied
  } else {
    renderPanel(""); // still reading
  }
});
```

Reference: `packages/store/lib/persistStore.ts persistStore` and `packages/store/docs/api/persiststore.mdx` and `packages/store/tests/persist.test.ts`

### 5.4 Partialize persistence down to serializable state

**Impact: CRITICAL** - class instances round-trip through JSON as plain data - a hydrated Date becomes a string and a custom class loses its prototype, corrupting state silently

The default pipeline is `JSON.stringify`/`JSON.parse` over the projected snapshot, and `partialize` selects which keys persist (default: all of them). Persist only what survives a JSON round-trip - class instances do not. A `Date` serializes to a string and hydrates back as one; a custom class instance hydrates as a plain object without its prototype or methods: the store's types now lie about the runtime shape, silently. Function properties are dropped by serialization entirely - they are behavior, not state. Project transient and rich-typed keys away with `partialize`, and re-instantiate rich leaves after hydration when they matter.

**Incorrect (what is wrong):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const audit = store({
  theme: "light",
  openedAt: new Date(2026, 0, 1),
});

// Dates persist as strings: hydrated state claims Date but holds string
persistStore(audit, localStorageAdaptor("audit"));
```

**Correct (what is right):**

```ts
import { localStorageAdaptor, persistStore, store } from "@hellajs/store";

const audit = store({
  theme: "light",
  openedAt: new Date(2026, 0, 1),
});

persistStore(audit, localStorageAdaptor("audit"), {
  // Persist only the JSON-safe projection
  partialize: (s) => ({ theme: s.theme }),
});
```

Reference: `packages/store/lib/persistStore.ts` and `packages/store/docs/api/persiststore.mdx` and `packages/store/tests/persist.test.ts`

