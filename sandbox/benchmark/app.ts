import { computed } from "../../lib";
import { html } from "../../lib/html";
import { list, mount } from "../../lib/mount";
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

// Rendering
const { div, table, tbody, tr, td, span, button, a, h1 } = html;

const actionButton = (label: string, id: string, fn: () => void) =>
	div(
		{ className: "col-sm-6 smallpad" },
		button(
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

const jumbo = div(
	{ className: "jumbotron" },
	div(
		{ className: "row" },
		div({ className: "col-md-6" }, h1("HellaJS Framework")),
		div(
			{ className: "col-md-6" },
			div(
				{ className: "row" },
				actionButton("Create 1,000 rows", "run", () => create(1000)),
				actionButton("Create 10,000 rows", "runlots", () => create(10000)),
				actionButton("Append 1,000 rows", "add", () => append(1000)),
				actionButton("Update every 10th row", "update", () => update()),
				actionButton("Clear", "clear", () => clear()),
				actionButton("Swap Rows", "swaprows", () => swapRows()),
			),
		),
	),
);

// Add optimized keyed rendering for better performance
const dataRows = list(benchState.data, "#tbody", (item) => {
	const id = item().id;
	const className = computed(() => benchState.selected() === id ? "danger" : "");

	return tr(
		{
			dataset: { id }, // Use ID from signal directly - faster access
			className,
			// Add key property for better diffing
			key: id
		},
		td({ className: "col-md-1" }, id),
		td({ className: "col-md-4" },
			a(
				{
					className: "lbl",
					onclick: (e) => {
						e.preventDefault(); // Prevent default for better performance
						select(id);
					}
				},
				item().label, // Direct access
			),
		),
		td(
			{ className: "col-md-1" },
			a(
				{
					className: "remove",
					onclick: (e) => {
						e.preventDefault(); // Prevent default for better performance
						remove(id);
					}
				},
				span({
					className: "glyphicon glyphicon-remove",
					ariaHidden: "true",
				}),
			),
		),
		td({ className: "col-md-6" }),
	);
});

// Optimize table rendering with memoized tbody
const dataTable = table(
	{ className: "table table-hover table-striped test-data" },
	tbody(
		{ id: "tbody" },
		// The list function now handles the children more efficiently
	)
);

const render = div(
	{ id: "main" },
	div(
		{ className: "container" },
		jumbo,
		dataTable,
		span({
			className: "preloadicon glyphicon glyphicon-remove",
			ariaHidden: "true",
		}),
	),
);

mount(render, "#root");
