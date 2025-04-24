import { computed, html, render, signal, When, List } from "../lib";

const { Div, Button, Span } = html;

// State
const count = signal(0);
const countRecord = signal<number[]>([]);

const updateCount = (changeBy: number) => {
	countRecord.set([
		...countRecord(),
		...[count() + changeBy]
	])

	count.set(count() + changeBy);
}

// DOM
const IncrementButton = (changeBy: number) =>
	Button(
		{ onclick: () => updateCount(changeBy) },
		changeBy > 0 ? "+" : "-",
	)

const Counter = Div(
	{ id: count },
	IncrementButton(-1),
	When(
		() => count() % 2 === 0,
		Span("Even: "),
		Span("Odd: ")
	),
	Span(count),
	IncrementButton(+1),
	List(countRecord, (record) =>
		Div(record)
	)
);

// Render the main component
render(Counter, "#root");
