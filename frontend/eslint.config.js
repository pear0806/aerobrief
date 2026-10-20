import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

export default defineConfig([
	globalIgnores(["dist", "coverage", "playwright-report", "test-results"]),
	{
		files: ["**/*.{js,jsx}"],
		extends: [
			js.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
			parserOptions: {
				ecmaVersion: "latest",
				ecmaFeatures: { jsx: true },
				sourceType: "module",
			},
		},
		plugins: { "simple-import-sort": simpleImportSort },
		rules: {
			"no-unused-vars": ["error", { varsIgnorePattern: "^(motion|[A-Z_])" }],
			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error",
		},
	},
	{
		// Node 端的檔案（e2e、各種設定、以 fs / process 讀檔的測試）需要 Node 全域變數
		files: [
			"e2e/**",
			"*.config.js",
			"security-headers.js",
			"src/__tests__/securityHeaders.test.js",
		],
		languageOptions: { globals: { ...globals.node, ...globals.browser } },
	},
]);
