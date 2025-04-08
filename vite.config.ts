import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	plugins: [
		dts({
			include: ["./lib"],
			outDir: "./dist",
			entryRoot: "./lib",
			tsconfigPath: "./tsconfig.json",
		}),
	],
	build: {
		target: "esnext",
		minify: "esbuild",
		lib: {
			name: "@hellajs/core",
			entry: "./lib/index.ts",
			fileName: (format) => `index.${format}.js`,
			formats: ["es", "umd", "cjs"],
		},
	},
	esbuild: {
		pure: ["console.warn", "console.error"],
		legalComments: "none",
	},
});
