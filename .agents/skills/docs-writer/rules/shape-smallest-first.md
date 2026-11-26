---
title: Open with the smallest complete example
impact: MEDIUM
impactDescription: a forty-line first example with a dozen components buries the one line the reader needed
tags: example, progressive, first, setup
---

## Open with the smallest complete example

The first example on a page, and the first in each section, is the smallest use case that runs: one import line, the fewest values the point needs, the result in a trailing comment. Everything else, extra components, every route the app will have, error handling, config, edge cases, follows the basics. Measure it: when the setup block is longer than the line making the point, the point is not first; cut the setup or move the example down. A reader who copies only the first block gets a working program.

**Incorrect (what is wrong):**

````mdx
<!-- packages/router/docs/concepts/routing.mdx ## Mental Model, first example: 12 components declared before router() is called -->
const HomePage = () => <div>Home</div>;
const AboutPage = () => <div>About</div>;
const TodoDetail = ({ id }: { id?: string }) => <div>Todo {id}</div>;
const NotFound = ({ attempted }: { attempted?: string }) => <div>Not found: {attempted}</div>;
type UserTodoProps = { userId?: string; todoId?: string };

const UserTodo = ({ userId, todoId }: UserTodoProps) => (
  <div>Todo {todoId} of user {userId}</div>
);
const AdminDashboard = () => <div>Admin</div>;
const UsersList = () => <div>Users</div>;
const UserDetail = ({ id }: { id?: string }) => <div>User {id}</div>;
const AdminSettings = () => <div>Settings</div>;
type SearchResultsProps = { term?: string; sort?: string };

const SearchResults = ({ term, sort }: SearchResultsProps) => (
  <div>Results for {term} (sorted by {sort})</div>
);
const FileViewer = ({ path }: { path?: string }) => <div>File {path}</div>;
const AdminPanel = () => <div>Admin</div>;
const Feed = () => <div>Feed</div>;
const Chat = () => <div>Chat</div>;
const currentView = signal(<div>Loading…</div>);

router({
  routes: {
    '/': () => currentView(<HomePage />),
    '/about': () => currentView(<AboutPage />),
    '/todos/:id': (params) => currentView(<TodoDetail id={params.id} />)
  },
  notFound: (path) => currentView(<NotFound attempted={path} />)
});
````

**Correct (what is right):**

````mdx
<!-- packages/core/docs/concepts/reactivity.mdx ### Reactive State -->
```typescript
import { signal } from '@hellajs/core';

const count = signal(0);

console.log(count()); // 0

count(5); // Write a new value

console.log(count()); // 5
```
````

A router opener in this shape: one `signal` holding the view, one route, one handler line, `router({ routes: { '/': () => view(<Home />) } })`; the twelve-page table belongs in a later section or nowhere.

Exceptions: tutorials build one app progressively, so their first block is the scaffold the guide's §Tutorial Docs template fixes; index docs' `### Example` demonstrates the primary use case in 15-40 lines (guide §Index Docs) and is the one sanctioned longer opener.

Reference: `packages/core/docs/concepts/reactivity.mdx ### Reactive State` and `guides/docs.md §Content Strategy → Progressive Depth`
