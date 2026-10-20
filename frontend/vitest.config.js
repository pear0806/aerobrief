import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 獨立於 vite.config.js，避免測試時載入 PWA plugin
export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		css: false,
		setupFiles: ["./src/__tests__/setup.js"],
		include: ["src/**/*.test.{js,jsx}"],
		coverage: {
			provider: "v8",
			include: ["src/**"],
			exclude: ["src/__tests__/**", "src/main.jsx"],
			// 目前約 97 / 89 / 96 / 97；留一點餘裕，退化太多才會讓 CI 失敗
			thresholds: { statements: 92, branches: 82, functions: 90, lines: 92 },
		},
	},
});
