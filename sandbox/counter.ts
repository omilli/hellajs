import { List, type ReadonlySignal, Slot, computed, html, render, signal } from "../lib";

const { Div, Button, Span } = html;

// State
const count = signal(0);
const countRecord = signal<number[]>([]);
// Add this line to create a complete state object with multiple signals

const updateCount = (changeBy: number) => {
	countRecord.set([...countRecord(), ...[count() + changeBy]]);
	count.set(count() + changeBy);
};

// DOM
const ChangeButton = (changeBy: number) =>
	Button({ onclick: () => updateCount(changeBy) }, changeBy > 0 ? "+" : "-");

const Conditional = () => {
	if (count() < 0) {
		return Span("Negative");
	} else if (count() > 0) {
		return Span("Positive");
	} else {
		return Span("Zero");
	}
};

const Counter = render(
	"#root",
	ChangeButton(-1),
	Span(count),
	ChangeButton(+1),
	Slot(Conditional),
	// Use the complete state object that has multiple signals
	List({ items: countRecord }).map((item) => Div(item())),
);
