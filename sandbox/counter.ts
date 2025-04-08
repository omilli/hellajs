import { html, mount, signal } from "../lib";

const { div, span, button } = html;

const count = signal(0);

const increment = () => count.set(count() + 1);
const decrement = () => count.set(count() - 1);

const Counter = () =>
	div(
		button({ onclick: decrement }, "-"),
		span(count()),
		button({ onclick: increment }, "+"),
	);

mount(Counter);
