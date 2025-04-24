import { computed, html, render, signal, condition, list } from "../lib";

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
	div({ id: "condition" }),
	div({ id: "double" }),
);

// Render the main component
render(Counter, "#root");

// Render the list using our list helper
list(countList, (item) => {
	const { id, text, double } = item();
	const label = computed(() => `${text} : ${double}`);
	return div({ id }, label);
}, "#double");

// Render a conditional component
condition(() => {
	const isEven = count() % 2 === 0;
	return isEven ? div("Even") : div("Odd");
}, "#condition");
