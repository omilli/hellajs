import { html, render, signal } from "../lib";

const { div, button, span } = html;

const count = signal(0);

const Counter = div(
	{ id: count },
	button({ onclick: () => count.set(count() - 1) }, "-"),
	span(count),
	button({ onclick: () => count.set(count() + 1) }, "+"),
);

render(Counter, "#root");
