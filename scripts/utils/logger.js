/**
 * Centralized logging utilities for HellaJS build scripts
 */
export const logger = {
	error(message, error) {
		console.error(`❌  ${message}`);
		if (error) console.error(error.stack || error.message);
	},
	warn(message, error) {
		console.warn(`⚠️  ${message}`);
		if (error) console.warn(error.stack || error.message);
	},
	info(message) {
		console.log(message);
	},
	success(message) {
		console.log(`✔️ ${message}`);
	},
};