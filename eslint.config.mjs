import js from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

export default tseslint.config(
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/out/**",
			"**/.cache/**",
			"**/coverage/**",
			"docs/**",
			".agents/**",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		plugins: {
			"@stylistic": stylistic,
		},
		languageOptions: {
			parserOptions: {
				projectService: {
					defaultProject: "tsconfig.lint.json",
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-wrapper-object-types": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-this-alias": "off",
			"@stylistic/semi": ["error", "always"],
			"no-constant-condition": ["error", { checkLoops: false }],
			"no-useless-assignment": "error",
			"no-unused-labels": "error",
			"prefer-const": "error",
		},
	},
	{
		files: ["packages/dom/**/*.{ts,tsx,js,jsx,mjs}"],
		plugins: {
			"@stylistic": stylistic,
		},
		rules: {
			"@stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: "always" }],
			"@stylistic/jsx-quotes": ["error", "prefer-double"],
		},
	},
	{
		files: ["plugins/**/*.{ts,tsx,js,jsx,mjs}"],
		plugins: {
			"@stylistic": stylistic,
		},
		rules: {
			"@stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: "always" }],
		},
	},
	{
		files: ["**/*.mjs", "**/*.js"],
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
	{
		files: ["scripts/**/*.{js,mjs}", "utils/**/*.js", "commitlint.config.ts"],
		languageOptions: {
			globals: {
				...globals.node,
				document: "readonly",
			},
		},
	},
);
