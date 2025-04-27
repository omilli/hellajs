import { computed, signal } from "../../lib";
import { buildData } from "./data";

const selected = signal<number | undefined>(undefined);

export interface BenchData {
	id: number;
	label: string;
}

export const benchState = {
	items: signal<BenchData[]>([]),
	selected: computed<number | undefined>(() => selected())
};

// Actions just modify benchContext, they don't trigger renders
export function create(count: number): void {
	benchState.items.set([...buildData(count)]);
}

export function append(count: number): void {
	benchState.items.set([...benchState.items(), ...buildData(count)]);
}

export function update(): void {
	const newData = [...benchState.items()];
	for (let i = 0; i < newData.length; i += 10) {
		if (i < newData.length) {
			newData[i] = { ...newData[i], label: `${newData[i].label} !!!` };
		}
	}
	benchState.items.set(newData);
}

export function remove(id: number): void {
	const idx = benchState.items().findIndex((d) => d.id === id);
	benchState.items.set([
		...benchState.items().slice(0, idx),
		...benchState.items().slice(idx + 1),
	]);
}

export function select(id: number): void {
	selected.set(id);
}

export function runLots(): void {
	benchState.items.set(buildData(10000));
}

export function clear(): void {
	benchState.items.set([]);
}

export function swapRows(): void {
	if (benchState.items().length > 998) {
		const newData = [...benchState.items()];
		const temp = newData[1];
		newData[1] = newData[998];
		newData[998] = temp;
		benchState.items.set(newData);
	}
}
