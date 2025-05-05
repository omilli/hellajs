import { render, html, Component, createContext, useContext, Provider } from '../lib';

const UserContext = createContext<string>('Guest');

const UserDisplay = Component(() => {
  const username = useContext(UserContext);
  return html.div(
    { class: 'user-display' },
    `Hello, ${username}!`
  );
});

const App = Component(() => {
  return html.div(
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
