import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// Invert the logic - build library by default, only build demo when explicitly set
const isDemoMode = process.env.BUILD_MODE === 'demo';

export default defineConfig({
	plugins: [
		// Include dts plugin for library builds (default case)
		...(isDemoMode ? [] : [
			dts({
				include: ["./lib"],
				outDir: "./dist",
				entryRoot: "./lib",
				tsconfigPath: "./tsconfig.json",
			})
		])
	],
	build: {
		target: "esnext",
		minify: "esbuild",
		...(isDemoMode ? {
			// For app preview builds, use the sandbox as entry
			outDir: "./dist",
			rollupOptions: {
				input: {
					main: "./index.html"
				}
			}
		} : {
			// Library build is now the default
			lib: {
				name: "@hellajs/core",
				entry: "./lib/index.ts",
				fileName: (format) => `index.${format}.js`,
				formats: ["es", "umd", "cjs"],
			}
		})
	},
	esbuild: {
		pure: ["console.warn", "console.error"],
		legalComments: "none",
	},
});