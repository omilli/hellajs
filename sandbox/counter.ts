import { computed, html, render, signal, When, List } from "../lib";

const { div, button, span } = html;

const count = signal(0);
const countList = computed(() => Array.from({ length: count() }, (_, i) => ({
	id: i,
	text: `Count: ${i + 1}`,
	double: (i + 1) * 2,
})));

const Counter = div(
	{ id: count },
	button({ onclick: () => count.set(count() - 1) }, "-"),
	span(count),
	button({ onclick: () => count.set(count() + 1) }, "+"),
	When(
		() => count() % 2 === 0,
		div({ id: "even" }, "Even"),
		div({ id: "odd" }, "Odd")
	),
	List(countList, (item) => {
		const { id, text, double } = item();
		const label = computed(() => `${text} : ${double}`);
		return div({ id }, label);
	})
);

// Render the main component
render(Counter, "#root");
