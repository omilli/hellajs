import { computed, html, render, signal } from "../lib";

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

render(Counter, "#root");

render(countList, "#double").map((item) => {
	const text = computed(() => `${item().text} - Doubled: ${item().double}`);
	return div({ id: item().id }, text)
})


const conditionalComponent = computed(() => {
	const condition = count() % 2 === 0;
	return [condition ? div({ id: "even" }, "Even") : div({ id: "odd" }, "Odd")];
})

render(conditionalComponent, "#condition").map((item) => item());

