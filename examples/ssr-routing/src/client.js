import { html, hydrate } from '@hellajs/dom';
import { router } from '@hellajs/router';
import { routes, App, notFound } from './app.js';

// Omit `url`: the client reads window.location and resolves synchronously — the
// same URL the server resolved — so currentView matches the server-rendered view
// and hydrate adopts the existing nodes rather than rebuilding them.
router({ routes, notFound });

// afterMount fires automatically during hydrate — no flush() needed.
hydrate(html`<${App} />`, '#app');
