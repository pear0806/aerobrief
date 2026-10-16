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
	},
});
