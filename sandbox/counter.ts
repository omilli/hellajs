import { html, mount, signal } from "../lib";

const { div, button, span } = html;

const count = signal(0);

const Counter = div(
	{ className: count, dataset: { count } },
	button({ onclick: () => count.set(count() - 1) }, "-"),
	span(count),
	button({ onclick: () => count.set(count() + 1) }, "+"),
);

mount(Counter);
