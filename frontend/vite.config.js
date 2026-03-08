import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate", // 自動更新 App 內容
			includeAssets: [
				"favicon.ico",
				"apple-touch-icon.png",
				"masked-icon.svg",
			],
			manifest: {
				name: "AeroBrief", // 安裝後顯示的全名
				short_name: "AeroBrief", // 手機桌面上顯示的短名
				description: "Pilots' Weather Decision Tool",
				theme_color: "#0f172a", // 你的 App 背景色 (深藍)
				background_color: "#0f172a",
				display: "standalone", // 讓它看起來像原生 App (沒有網址列)
				icons: [
					// 這裡需要設定 icon，不然手機不讓你安裝
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
				],
			},
		}),
	],
});
