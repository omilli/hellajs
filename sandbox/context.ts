import { render, html, Component, context, consume, Provider } from '../lib';

const UserContext = context<string>('Guest');

const UserDisplay = Component(() => {
  const username = consume(UserContext);
  return html.div(
    { class: 'user-display' },
    `Hello, ${username}!`
  );
});

const App = Component(() => {
  return html.$(
    { class: 'app' },
    html.h1('Simple Context API Example'),
    Provider({
      context: UserContext,
      value: 'Alice',
      children: [UserDisplay]
    })
  );
});

render(App, '#app');
