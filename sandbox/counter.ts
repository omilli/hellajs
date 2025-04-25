import { List, type ReadonlySignal, Slot, html, render, signal } from "../lib";

const { Div, Button, Span } = html;

// State
const count = signal(0);
const countRecord = signal<number[]>([]);

const updateCount = (changeBy: number) => {
	countRecord.set([...countRecord(), ...[count() + changeBy]]);

	count.set(count() + changeBy);
};

// DOM
const ChangeButton = (changeBy: number) =>
	Button({ onclick: () => updateCount(changeBy) }, changeBy > 0 ? "+" : "-");

const CountList = (item: ReadonlySignal<number>) => Div(item());

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
	List(countRecord).map(CountList),
);
