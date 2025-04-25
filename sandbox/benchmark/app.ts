import { computed, html, List, type ReadonlySignal, render } from "../../lib";
import {
	append,
	type BenchData,
	benchState,
	clear,
	create,
	remove,
	select,
	swapRows,
	update,
} from "./store";

// Use consistent PascalCase for all HTML elements
const { Div, Table, Tbody, Tr, Td, Span, Button, A, H1 } = html;

const ActionButton = (label: string, id: string, fn: () => void) =>
	Div(
		{ class: "col-sm-6 smallpad" },
		Button(
			{
				id,
				class: "btn btn-primary btn-block",
				type: "button",
				onclick: fn,
				preventDefault: true,
			},
			label,
		),
	);

const jumbo = Div(
	{ class: "jumbotron" },
	Div(
		{ class: "row" },
		Div({ class: "col-md-6" }, H1("HellaJS Framework")),
		Div(
			{ class: "col-md-6" },
			Div(
				{ class: "row" },
				ActionButton("Create 1,000 rows", "run", () => create(1000)),
				ActionButton("Create 10,000 rows", "runlots", () => create(10000)),
				ActionButton("Append 1,000 rows", "add", () => append(1000)),
				ActionButton("Update every 10th row", "update", () => update()),
				ActionButton("Clear", "clear", () => clear()),
				ActionButton("Swap Rows", "swaprows", () => swapRows()),
			),
		),
	),
);


// Convert to use the inline List component
const TableRows = (item: ReadonlySignal<BenchData>) => {
	const id = item().id;
	// Make sure computed signals are properly detected
	const rowClass = computed(() => benchState.selected() === id ? "danger" : "");
	// Connect label directly to a signal
	const label = computed(() => item().label);

	return Tr(
		{
			data: { id },
			class: rowClass,
			key: id
		},
		Td({ class: "col-md-1" }, id),
		Td({ class: "col-md-4" },
			A(
				{
					class: "lbl",
					onclick: () => select(id)
				},
				label, // Use computed signal for label
			),
		),
		Td(
			{ class: "col-md-1" },
			A(
				{
					class: "remove",
					onclick: () => remove(id)
				},
				Span({
					class: "glyphicon glyphicon-remove",
					ariaHidden: "true",
				}),
			),
		),
		Td({ class: "col-md-6" }),
	);
};


const Benchmark = render("#root", Div(
	{ id: "main" },
	Div(
		{ class: "container" },
		jumbo,
		Table(
			{ class: "table table-hover table-striped test-data" },
			Tbody(
				{ id: "tbody" },
				List(benchState.data).map(TableRows)
			)
		),
		Span({
			class: "preloadicon glyphicon glyphicon-remove",
			ariaHidden: "true",
		}),
	),
));
