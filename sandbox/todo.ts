import { computed, html, mount, signal } from "../lib";

const { div, ul, li, input, button, span, main } = html;

const todos = signal([
	{ id: 1, text: "Learn HellaJS", completed: false },
	{ id: 2, text: "Build an app", completed: false },
]);

const completedTodos = computed(() => todos().filter((todo) => todo.completed));

const newTodo = signal("");

const addTodo = () => {
	if (newTodo().trim()) {
		todos.update((list) => [
			...list,
			{ id: Date.now(), text: newTodo(), completed: false },
		]);
		newTodo.set("");
	}
};

const toggleTodo = (id: number) => {
	todos.update((list) =>
		list.map((todo) =>
			todo.id === id ? { ...todo, completed: !todo.completed } : todo,
		),
	);
};

const TodoList = computed(() =>
	ul(
		...todos().map((todo) =>
			li(
				{
					style: todo.completed ? "color:red" : "",
					onclick: () => toggleTodo(todo.id),
				},
				todo.text,
			),
		),
	),
);

const TodoInput = computed(() =>
	input({
		value: newTodo(),
		oninput: (_, el) => {
			newTodo.set((el as HTMLInputElement).value);
		},
		placeholder: "What needs to be done?",
	}),
);

const TodoApp = () =>
	main(
		div(TodoInput(), button({ onclick: addTodo }, "Add Todo")),
		span(`Completed: ${completedTodos().length}`),
		TodoList(),
	);

mount(TodoApp);
