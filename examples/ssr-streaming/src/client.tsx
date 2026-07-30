import { hydrate } from '@hellajs/dom';
import { Dashboard } from './app';

// No router init — this is a single streaming page. hydrate adopts the server-rendered
// nodes instead of rebuilding them. Streamed <Suspense> regions stage resolved children in
// <template>s; hydrate swaps each staged template in automatically (β: hydrate-swap).
const handle = hydrate(<Dashboard />, '#app');
handle.flush(); // fire deferred afterMount hooks before first paint
