import { signal } from "../../lib";
import { buildData } from "./data";

export const benchState = {
	data: signal<
		{
			id: number;
			label: string;
		}[]
	>([]),
	selected: signal<number | undefined>(undefined),
};

// Actions just modify benchContext, they don't trigger renders
export function create(count: number): void {
	benchState.data.set(buildData(count));
}

export function append(count: number): void {
	benchState.data.set([...benchState.data(), ...buildData(count)]);
}

export function update(): void {
	const newData = [...benchState.data()];
	for (let i = 0; i < newData.length; i += 10) {
		if (i < newData.length) {
			newData[i] = { ...newData[i], label: `${newData[i].label} !!!` };
		}
	}
	benchState.data.set(newData);
}

export function remove(id: number): void {
	const idx = benchState.data().findIndex((d) => d.id === id);
	benchState.data.set([
		...benchState.data().slice(0, idx),
		...benchState.data().slice(idx + 1),
	]);
}

export function select(id: number): void {
	benchState.selected.set(id);
}

export function runLots(): void {
	benchState.data.set(buildData(10000));
}

export function clear(): void {
	benchState.data.set([]);
}

export function swapRows(): void {
	if (benchState.data().length > 998) {
		const newData = [...benchState.data()];
		const temp = newData[1];
		newData[1] = newData[998];
		newData[998] = temp;
		benchState.data.set(newData);
	}
}
