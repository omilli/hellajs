/**
 * Converts camelCase to kebab-case for CSS properties
 */
export function kebabCase(str: string): string {
	return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function PascalCase(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
