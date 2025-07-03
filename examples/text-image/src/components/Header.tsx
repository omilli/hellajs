import { css } from "@hellajs/css";
import { forEach } from "@hellajs/dom";
import { navigate } from "@hellajs/router";

const links = [
  { path: '/', label: 'Collection' },
  { path: '/create', label: 'Create' }
];

const style = css({
  padding: "1rem",
  backgroundColor: '#f0f0f0',
  textAlign: 'center',
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
  },
  h1: {
    marginTop: 0
  },
})

export const Header = () =>
  <header class={style}>
    <h1>Text Images</h1>
    <nav>
      {forEach(links, (link) =>
        <a onclick={() => navigate(link.path)}> {link.label} </a>
      )}
    </nav>
  </header>
