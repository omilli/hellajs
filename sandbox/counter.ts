import { computed, html, list, mount, signal } from "../lib";

const { div, button, span } = html;

const count = signal(0);

Array.from({ length: 10 }, (_, i) => i).forEach((item) => {
	return {
		value: item,
	}
});


const nums = signal([1, 2, 3, 4, 5].map(item => ({
	value: item,
})));

const clicky = () => {
	nums.set(nums().map((i) => {
		return {
			...i,
			value: i.value + 1,
		}
	}));
}

const ButtonList = list(nums, '#button-list', (item) => {
	const newValue = computed(() => item().value);

	return button({
		className: newValue,
		onclick: clicky,
	}, newValue)
})

const Counter = div(
	{ id: count },
	button({ onclick: () => count.set(count() - 1) }, "-"),
	span(count),
	button({ onclick: () => count.set(count() + 1) }, "+"),
	div({ id: "button-list" }, ...ButtonList),
);

mount(Counter);
