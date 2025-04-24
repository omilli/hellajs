import { computed, html, render, signal, When, List } from "../lib";

const { Div, Button, Span } = html;

const count = signal(0);
const countList = computed(() => Array.from({ length: count() }, (_, i) => ({
	id: i,
	text: `Count: ${i + 1}`,
	double: (i + 1) * 2,
})));

const Counter = Div(
	{ id: count },
	Button({ onclick: () => count.set(count() - 1) }, "-"),
	Span(count),
	Button({ onclick: () => count.set(count() + 1) }, "+"),
	When(
		() => count() % 2 === 0,
		Div({ id: "even" }, "Even"),
		Div({ id: "odd" }, "Odd")
	),
	List(countList, (item) => {
		const { id, text, double } = item();
		const label = computed(() => `${text} : ${double}`);
		return Div({ id }, label);
	})
);

// Render the main component
render(Counter, "#root");
