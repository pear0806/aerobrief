import { describe, expect, it } from "vitest";

import { getTileConfig } from "../config/mapTiles.js";

describe("getTileConfig", () => {
	it("with a CARTO key: uses the keyed rastertiles URL (no more API KEY REQUIRED watermark)", () => {
		const c = getTileConfig({ VITE_CARTO_KEY: "abc123" });
		expect(c.provider).toBe("carto");
		expect(c.url).toBe("https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=abc123");
		expect(c.attribution).toMatch(/OpenStreetMap/);
		expect(c.attribution).toMatch(/CARTO/);
	});

	it("key is URL-encoded and trimmed", () => {
		expect(getTileConfig({ VITE_CARTO_KEY: "  a b&c " }).url).toMatch(/key=a%20b%26c$/);
	});

	it.each([undefined, "", "   "])("without a usable key (%j): falls back to a keyless provider", (v) => {
		const c = getTileConfig({ VITE_CARTO_KEY: v });
		expect(c.provider).toBe("esri");
		expect(c.url).not.toMatch(/cartocdn/);
		expect(c.attribution).toMatch(/Esri/);
	});

	it("never returns the old keyless CARTO URL", () => {
		for (const env of [{}, { VITE_CARTO_KEY: "k" }]) {
			expect(getTileConfig(env).url).not.toMatch(/basemaps\.cartocdn\.com\/dark_all/);
		}
	});
});
