import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BriefingSummary from "../components/BriefingSummary.jsx";
import VatsimTraffic, { VISIBLE_DEFAULT } from "../components/VatsimTraffic.jsx";
import { buildSummary, closedRunwayText, formatWind } from "../utils/summary.js";
import { computeTrafficBounds, distanceKm } from "../utils/trafficBounds.js";

describe("formatWind", () => {
	it.each([
		[{ windDir: 50, windSpeed: 14, windGust: 24 }, "kt", "050° 14G24 kts"],
		[{ windDir: 5, windSpeed: 8, windGust: null }, "kt", "005° 8 kts"],
		[{ windDir: null, windSpeed: 6, isVariable: true }, "kt", "VRB 6 kts"],
		[{ windDir: 0, windSpeed: 0 }, "kt", "靜風"],
		[{ windDir: 270, windSpeed: 5 }, "mps", "270° 5 m/s"],
		[{ windSpeed: null }, "kt", "風資料不可用"],
	])("%j → %s", (a, unit, out) => expect(formatWind(a, unit)).toBe(out));
});

describe("closedRunwayText", () => {
	it("covers aerodrome / ALL / list / none", () => {
		expect(closedRunwayText({ aerodrome_closed: true, closed_runways: [] })).toBe("機場關閉");
		expect(closedRunwayText({ closed_runways: ["ALL"] })).toBe("全部跑道");
		expect(closedRunwayText({ closed_runways: ["05R", "23L"] })).toBe("05R / 23L");
		expect(closedRunwayText({ closed_runways: [] })).toBeNull();
		expect(closedRunwayText(null)).toBeNull();
	});
});

const analysis = (over = {}) => ({
	processedRunways: [{ name: "05L", isFirst: true, headwind: 14.4, crosswind: -1.2 }],
	windDir: 50, windSpeed: 14, windGust: 24, isVariable: false, noSafeReason: null, ...over,
});

describe("buildSummary", () => {
	const weather = { flight_rules: "vfr", units: { wind_speed: "kt" } };

	it("ok: recommends the runway with head/cross components", () => {
		const s = buildSummary({ weather, analysis: analysis(), closures: {}, atcCount: 3 });
		expect(s.tone).toBe("ok");
		expect(s.flightRules).toBe("VFR");
		expect(s.runway).toEqual({ name: "05L", wind: "頂風 14 · 側風 1" });
		expect(s.atcCount).toBe(3);
	});
	it("tailwind is labelled as tailwind", () => {
		const a = analysis({ processedRunways: [{ name: "23R", isFirst: true, headwind: -6, crosswind: 3 }] });
		expect(buildSummary({ weather, analysis: a }).runway.wind).toBe("順風 6 · 側風 3");
	});
	it("warn: closed runways or IFR", () => {
		expect(buildSummary({ weather, analysis: analysis(), closures: { closed_runways: ["05R"] } }).tone).toBe("warn");
		expect(buildSummary({ weather: { flight_rules: "IFR" }, analysis: analysis() }).tone).toBe("warn");
	});
	it("danger: no safe runway, with the reason", () => {
		const a = analysis({ processedRunways: [{ name: "05L", isFirst: false }], noSafeReason: "closed" });
		const s = buildSummary({ weather, analysis: a, closures: { closed_runways: ["ALL"] } });
		expect(s.tone).toBe("danger");
		expect(s.runway).toBeNull();
		expect(s.reason).toMatch(/NOTAM/);
	});
	it("tolerates missing data", () => {
		const s = buildSummary({});
		expect(s.tone).toBe("ok");
		expect(s.runway).toBeNull();
		expect(s.atcCount).toBe(0);
	});
});

describe("BriefingSummary", () => {
	it("shows runway, wind, closures, ATC and a link to the analysis section", () => {
		const summary = buildSummary({
			weather: { flight_rules: "MVFR", units: {} }, analysis: analysis(),
			closures: { closed_runways: ["05R", "23L"] }, atcCount: 2,
		});
		const { container } = render(<BriefingSummary icao="RCTP" summary={summary} />);
		expect(container.querySelector(".briefing-summary.warn")).toBeTruthy();
		expect(screen.getByText("MVFR").className).toContain("rules-MVFR");
		expect(screen.getByText("05L")).toBeTruthy();
		expect(screen.getByText(/050° 14G24/)).toBeTruthy();
		expect(screen.getByText("05R / 23L")).toBeTruthy();
		expect(screen.getByText("2 席")).toBeTruthy();
		expect(screen.getByRole("link", { name: /查看跑道分析/ }).getAttribute("href")).toBe("#runway-analysis");
		expect(screen.getByRole("region", { name: /RCTP 簡報摘要/ })).toBeTruthy();
	});
	it("no safe runway → explicit stop message instead of a runway", () => {
		const summary = buildSummary({
			weather: {}, analysis: analysis({ processedRunways: [], noSafeReason: "aerodrome" }),
			closures: { aerodrome_closed: true },
		});
		render(<BriefingSummary icao="RCTP" summary={summary} />);
		expect(screen.getByText(/無推薦跑道：NOTAM 公告機場關閉/)).toBeTruthy();
	});
});

describe("trafficBounds", () => {
	const c = [25.08, 121.23];
	it("distance sanity (RCTP → RJTT ≈ 2,100 km)", () => {
		expect(distanceKm(c, [35.55, 139.78])).toBeGreaterThan(2000);
		expect(distanceKm(c, c)).toBe(0);
	});
	it("includes nearby arrivals/departures, excludes far and cruising traffic", () => {
		const pilots = [
			{ latitude: 25.3, longitude: 121.9 },
			{ latitude: 24.7, longitude: 121.5 },
			{ latitude: 35.5, longitude: 139.7 },                     // 太遠
			{ latitude: 25.1, longitude: 121.3, isCruising: true },   // 巡航不納入
			{ latitude: null, longitude: 121 },                       // 沒座標
		];
		const pts = computeTrafficBounds(c, pilots);
		expect(pts).toHaveLength(3);
		expect(pts[0]).toEqual(c);
	});
	it("returns null when nothing is nearby", () => {
		expect(computeTrafficBounds(c, [])).toBeNull();
		expect(computeTrafficBounds(c, null)).toBeNull();
		expect(computeTrafficBounds(c, [{ latitude: 40, longitude: 100 }])).toBeNull();
	});
});

describe("VatsimTraffic collapsing (no nested scroll areas)", () => {
	const mk = (n, base = 0) => Array.from({ length: n }, (_, i) => ({
		cid: base + i, callsign: `CAL${base + i}`, aircraft_short: "B77W", departure: "RJAA", arrival: "RCTP", altitude: 5000, groundspeed: 200,
	}));
	it("shows the first few, expands on demand, collapses again", () => {
		render(<VatsimTraffic arrivals={mk(7)} departures={[]} cruisings={[]} />);
		expect(document.querySelectorAll(".arr-card")).toHaveLength(VISIBLE_DEFAULT);
		const btn = screen.getByRole("button", { name: "顯示全部 7 筆" });
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		fireEvent.click(btn);
		expect(document.querySelectorAll(".arr-card")).toHaveLength(7);
		expect(screen.getByRole("button", { name: "收合" }).getAttribute("aria-expanded")).toBe("true");
		fireEvent.click(screen.getByRole("button", { name: "收合" }));
		expect(document.querySelectorAll(".arr-card")).toHaveLength(VISIBLE_DEFAULT);
	});
	it("no toggle when the list is short; columns expand independently", () => {
		render(<VatsimTraffic arrivals={mk(2)} departures={mk(6, 100)} cruisings={[]} />);
		expect(screen.getAllByRole("button")).toHaveLength(1);
		fireEvent.click(screen.getByRole("button", { name: /顯示全部 6 筆/ }));
		expect(document.querySelectorAll(".arr-card")).toHaveLength(2);
		expect(document.querySelectorAll(".dep-card")).toHaveLength(6);
	});
	it("keeps the original card content per column", () => {
		render(<VatsimTraffic arrivals={mk(1)} departures={mk(1, 10)} cruisings={mk(1, 20)} />);
		expect(screen.getByText("FR")).toBeTruthy();
		expect(screen.getByText("TO")).toBeTruthy();
		expect(screen.getByText("RTE")).toBeTruthy();
		expect(screen.getByText(/RJAA ➔ RCTP/)).toBeTruthy();
	});
});
