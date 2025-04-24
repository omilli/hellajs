import { List, html, render, signal, computed, Slot } from "../lib";

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

const CountList = List(countRecord).map((item) => Div(item()))

const Conditional = Slot(() => {
	if (count() < 0) {
		return Span("Negative");
	} else if (count() > 0) {
		return Span("Positive");
	} else {
		return Span("Zero");
	}
}, Div({ id: "conditional" }));

const Counter = Div(
	{ id: count },
	IncrementButton(-1),
	Span(count),
	IncrementButton(+1),
	Conditional,
	CountList,
);


// Render the main component
render(Counter, "#root");