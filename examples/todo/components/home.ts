import { html } from "../../../src";

const { div, h1 } = html;

export function Home() {
  return div([h1("Hello World!")]);
}
