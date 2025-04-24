import { computed, html, List, render } from "../../lib";
import {
	append,
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
		{ className: "col-sm-6 smallpad" },
		Button(
			{
				id,
				className: "btn btn-primary btn-block",
				type: "button",
				onclick: fn,
				preventDefault: true,
			},
			label,
		),
	);

const jumbo = Div(
	{ className: "jumbotron" },
	Div(
		{ className: "row" },
		Div({ className: "col-md-6" }, H1("HellaJS Framework")),
		Div(
			{ className: "col-md-6" },
			Div(
				{ className: "row" },
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
const TableRows = List(benchState.data, Tbody({ id: "tbody" })).map((item) => {
	const id = item().id;
	const className = computed(() => benchState.selected() === id ? "danger" : "");

	return Tr(
		{
			dataset: { id },
			className,
			key: id
		},
		Td({ className: "col-md-1" }, id),
		Td({ className: "col-md-4" },
			A(
				{
					className: "lbl",
					onclick: () => {
						select(id);
					}
				},
				item().label,
			),
		),
		Td(
			{ className: "col-md-1" },
			A(
				{
					className: "remove",
					onclick: () => {
						remove(id);
					}
				},
				Span({
					className: "glyphicon glyphicon-remove",
					ariaHidden: "true",
				}),
			),
		),
		Td({ className: "col-md-6" }),
	);
});


const Benchmark = Div(
	{ id: "main" },
	Div(
		{ className: "container" },
		jumbo,
		Table(
			{ className: "table table-hover table-striped test-data" },
			TableRows
		),
		Span({
			className: "preloadicon glyphicon glyphicon-remove",
			ariaHidden: "true",
		}),
	),
);

render(Benchmark, "#root");
