import { signal } from '@hellajs/core';
import { html } from '@hellajs/dom';
import { route } from '@hellajs/router';

// The view signal holds the currently-rendered view node. Route handlers are
// pure setters — they update this signal and nothing else. The same handlers
// fire on the server (driven by router({ url })) and on the client (driven by
// router({ routes }) + hydrate), so the rendered view matches. The
// () => mount(...) style is client-only — mount needs a document and throws on
// the server.
export const currentView = signal(html`<h1>Loading…</h1>`);

const Home = () => html`<h1>Home</h1>`;
const User = ({ id }) => html`<h1>User ${id}</h1>`;
const NotFound = () => html`<h1>Not Found</h1>`;

export const routes = {
  '/': () => currentView(Home()),
  '/users/:id': (params) => currentView(User({ id: params.id })),
};

export const notFound = () => currentView(NotFound()); 

const activeClass = (path) => route().active(path) ? 'active' : '';

export const App = () => html`
  <nav>
    <a href="/" class=${() => activeClass('/')}>Home</a>
    <a href="/users/1" class=${() => activeClass('/users/1')}>User</a>
  </nav>
  <main>${currentView}</main>
`;
