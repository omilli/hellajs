export const adjectives = [
	"pretty",
	"large",
	"big",
	"small",
	"tall",
	"short",
	"long",
	"handsome",
	"plain",
	"quaint",
	"clean",
	"elegant",
	"easy",
	"angry",
	"crazy",
	"helpful",
	"mushy",
	"odd",
	"unsightly",
	"adorable",
	"important",
	"inexpensive",
	"cheap",
	"expensive",
	"fancy",
];

export const colours = [
	"red",
	"yellow",
	"blue",
	"green",
	"pink",
	"brown",
	"purple",
	"brown",
	"white",
	"black",
	"orange",
];

export const nouns = [
	"table",
	"chair",
	"house",
	"bbq",
	"desk",
	"car",
	"pony",
	"cookie",
	"sandwich",
	"burger",
	"pizza",
	"mouse",
	"keyboard",
];

let nextId = 1;

export const data: { id: number; label: string }[] = [];

export function buildData(count = 1000): { id: number; label: string }[] {
	const data: { id: number; label: string }[] = [];
	for (let i = 0; i < count; i++) {
		data.push({
			id: nextId++,
			label: `${adjectives[random(adjectives.length)]} ${
				colours[random(colours.length)]
			} ${nouns[random(nouns.length)]}`,
		});
	}
	return data;
}

function random(max: number): number {
	return Math.round(Math.random() * 1000) % max;
}
