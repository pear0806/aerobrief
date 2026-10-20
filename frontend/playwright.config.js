import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const API = "https://api.aerobrief.test"; // 假的 HTTPS 後端；所有請求都在 e2e 裡被攔截，不會真的連線

export default defineConfig({
	testDir: "e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: `http://localhost:${PORT}`,
		serviceWorkers: "block", // PWA service worker 會干擾請求攔截
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
	// 用 vite preview（帶 vercel.json 同源的 CSP 標頭）跑 build 後的產物
	webServer: {
		command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		env: { VITE_API_URL: API },
	},
});
