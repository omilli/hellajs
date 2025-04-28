
// --- Components ---

import { createSignal, createStore, h, setupReactiveVdom, type ReactiveObject, type RNode } from "../lib";

interface Todo {
	id: number;
	text: string;
}

function Counter(): RNode {
	const [count, setCount] = createSignal(0);

	return h("div", {}, [
		h("button", { onClick: () => setCount(count() + 1) }, "Increment"),
		h("p", {}, () => `Count: ${count()}`),
	]);
}

function TodoList(): RNode {
	const [todos, setTodos] = createSignal<ReactiveObject<Todo>[]>([
		createStore({ id: 1, text: "Learn Reactivity" }),
		createStore({ id: 2, text: "Build App" }),
	]);

	const addTodo = () => {
		setTodos([...todos(), createStore({ id: todos().length + 1, text: `Task ${todos().length + 1}` })]);
	};

	const updateTodo = (index: number, text: string) => {
		todos()[index].set("text", text);
	};

	const swapTodos = () => {
		const newTodos = [...todos()];
		if (newTodos.length >= 2) {
			[newTodos[0], newTodos[1]] = [newTodos[1], newTodos[0]];
			setTodos(newTodos);
		}
	};

	const replaceTodo = () => {
		const newTodos = [...todos()];
		if (newTodos.length >= 1) {
			newTodos[0] = createStore({ id: newTodos[0].get("id"), text: `Replaced Task ${Date.now()}` });
			setTodos(newTodos);
		}
	};

	return h("div", {}, [
		h("button", { onClick: addTodo }, "Add Todo"),
		h("button", { onClick: () => updateTodo(0, `Updated Task ${Date.now()}`) }, "Update First Todo"),
		h("button", { onClick: swapTodos }, "Swap First Two Todos"),
		h("button", { onClick: replaceTodo }, "Replace First Todo"),
		h("ul", {}, () =>
			todos().map((todo) => h("li", { key: todo.get("id"), todo }, () => todo.get("text")))
		),
	]);
}

// --- Render ---

function App(): RNode {
	return h("div", {}, [
		h("h1", {}, "Reactive Virtual DOM"),
		Counter(),
		TodoList(),
	]);
}

// Initialize the app
const app = document.getElementById("app");
if (app) {
	const vdom = App();
	setupReactiveVdom(vdom, app, app);
}