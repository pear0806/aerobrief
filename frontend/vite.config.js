import react from "@vitejs/plugin-react-oxc";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [react()],
});
