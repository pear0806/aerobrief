// 在 jsdom 用 axe-core 檢查整頁無障礙（結構 / ARIA / 名稱 / 標題層級 / 地標）。
// 色彩對比 jsdom 算不出來（沒有版面與樣式計算），改由 e2e（真實瀏覽器）檢查。
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App.jsx";

const pilot = (i, extra = {}) => ({
	cid: i, callsign: `CAL${i}`, aircraft_short: "B77W", departure: "RJAA", arrival: "RCTP",
	altitude: 5000, groundspeed: 200, latitude: 25.2 + i * 0.05, longitude: 121.5, heading: 120, ...extra,
});
const briefing = {
	icao: "RCTP",
	weather: {
		station: "RCTP", flight_rules: "MVFR", elevation_ft: 10, latitude: 25.08, longitude: 121.23,
		wind_direction: { value: 50 }, wind_speed: { value: 14 }, wind_gust: { value: 24 },
		visibility: { value: 4000 }, altimeter: { value: 1011 }, temperature: { value: 27 },
		time: { dt: new Date(Date.now() - 20 * 60000).toISOString() }, raw: "RCTP RAW",
		units: { visibility: "m", altimeter: "hPa", wind_speed: "kt" },
	},
	taf: { raw: "TAF X", units: { wind_speed: "kt" }, forecast: [{
		type: "FROM", start_time: { repr: "1712" }, end_time: { repr: "1718" }, wind_direction: { value: 50, repr: "050" },
		wind_speed: { value: 12 }, visibility: { repr: "4000" }, flight_rules: "MVFR", clouds: [{ repr: "BKN015", type: "BKN" }], wx_codes: [],
	}] },
	notams: [
		{ id: "A1", category: "🚨 跑道關閉", state: "active", raw: "E) RWY 05R CLSD", start_time: "x", end_time: "y" },
		{ id: "A2", category: "📝 一般資訊", state: "active", raw: "E) AIP SUP", start_time: "x", end_time: "y" },
	],
	runways: [{ name: "05L", heading: 49 }, { name: "23R", heading: 229 }, { name: "05R", heading: 49 }, { name: "23L", heading: 229 }],
	closures: { aerodrome_closed: false, closed_runways: ["05R", "23L"], notam_ids: ["A1"] },
	warnings: [], fetched_at: Math.floor(Date.now() / 1000),
	vatsim: {
		controllers: [{ callsign: "RCTP_TWR", cid: 1, name: "A", frequency: "118.100" }],
		arrivals: Array.from({ length: 6 }, (_, i) => pilot(i)),
		departures: Array.from({ length: 5 }, (_, i) => pilot(10 + i, { departure: "RCTP", arrival: "VHHH" })),
		cruisings: [pilot(20, { altitude: 35000 })],
	},
};

beforeEach(() => {
	localStorage.clear();
	window.history.replaceState(null, "", "/");
});
afterEach(() => vi.restoreAllMocks());

const render_ = async () => {
	vi.spyOn(globalThis, "fetch").mockResolvedValue({
		ok: true, status: 200, json: async () => ({ success: true, data: briefing, error: null }),
	});
	const utils = render(<App />);
	fireEvent.click(screen.getByText(/查詢氣象/));
	await screen.findByText(/RCTP RAW/);
	await waitFor(() => expect(document.querySelector(".leaflet-container")).toBeTruthy());
	return utils;
};

const run = async (container) => {
	const r = await axe.run(container, {
		runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
		rules: { "color-contrast": { enabled: false }, region: { enabled: false } }, // region：partial render 會誤報
	});
	return r.violations.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}: ${v.nodes[0].html.slice(0, 90)}`);
};

describe("accessibility (axe-core)", () => {
	it("empty state has no violations", async () => {
		const { container } = render(<App />);
		expect(await run(container)).toEqual([]);
	});

	it("REGRESSION: full dashboard has no violations (marker names, scroll regions, headings, landmarks)", async () => {
		const { container } = await render_();
		expect(await run(container)).toEqual([]);
	});

	it("page has exactly one h1, one main and one banner landmark; headings never skip a level", async () => {
		await render_();
		expect(document.querySelectorAll("h1")).toHaveLength(1);
		expect(document.querySelectorAll("main")).toHaveLength(1);
		expect(document.querySelectorAll("header")).toHaveLength(1);
		let prev = 0;
		for (const h of document.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
			const level = Number(h.tagName[1]);
			expect(level - prev, `<${h.tagName.toLowerCase()}> "${h.textContent.trim().slice(0, 20)}" 跳級`).toBeLessThanOrEqual(1);
			prev = level;
		}
	});

	it("every aircraft marker (focusable button) has an accessible name", async () => {
		await render_();
		const markers = [...document.querySelectorAll(".custom-airplane-icon")];
		expect(markers.length).toBeGreaterThan(0);
		for (const m of markers) expect(m.getAttribute("title")).toMatch(/CAL\d+/);
	});

	it("collapsed flight lists have no inner scroll containers", async () => {
		await render_();
		for (const el of document.querySelectorAll(".flight-list")) {
			expect(el.style.overflowY).toBe("");
		}
		expect(screen.getAllByRole("button", { name: /顯示全部/ }).length).toBeGreaterThan(0);
	});
});
