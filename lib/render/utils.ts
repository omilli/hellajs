/**
 * Escapes special HTML characters in a string to prevent XSS attacks and ensure proper HTML rendering.
 * Replaces the following characters with their HTML entity equivalents e.g `&` becomes `&amp;`
 *
 * @param str - The string to escape
 * @returns The escaped HTML string
 */
export function escapeHTML(str: string): string {
	// Only process strings that need escaping
	if (!/[&<>"']/.test(str)) return str;

	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
