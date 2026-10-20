import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const c = { weather: 0, taf: 0, notam: 0, status: 0, traffic: 0, card: 0, landing: 0 };
vi.mock("../components/WeatherDashboard", () => ({ default: function W() { c.weather++; return <div />; } }));
vi.mock("../components/TafTimeline", () => ({ default: function T() { c.taf++; return <div />; } }));
vi.mock("../components/NotamDashboard", () => ({ default: function N() { c.notam++; return <div />; } }));
vi.mock("../components/VatsimStatus", () => ({ default: function S() { c.status++; return <div />; } }));
vi.mock("../components/VatsimTraffic", () => ({ default: function V() { c.traffic++; return <div />; } }));
vi.mock("../components/RunwayCard", () => ({ default: function R() { c.card++; return <div />; } }));
vi.mock("../components/LandingWarning", () => ({ default: function L() { c.landing++; return <div />; } }));
vi.mock("../components/RunwayMap", () => ({ default: () => <div /> }));
vi.mock("../components/Radar", () => ({ default: () => <div /> }));

import Dashboard from "../components/Dashboard.jsx";

const base = {
	icao: "RCTP",
	weather: { flight_rules: "VFR", wind_direction: { value: 50 }, wind_speed: { value: 12 }, units: { wind_speed: "kt" } },
	taf: null,
	notams: Array.from({ length: 50 }, (_, i) => ({ id: i, category: "📝 一般資訊", state: "active", raw: "x" })),
	runways: [{ name: "05L", heading: 52 }, { name: "23R", heading: 232 }],
	closures: { aerodrome_closed: false, closed_runways: [], notam_ids: [] },
	warnings: [], fetched_at: 1,
	vatsim: { controllers: [], arrivals: [], departures: [], cruisings: [] },
};
const props = {
	aircraft: "CUSTOM", limits: { cross: 15, tail: 10, head: 50 }, pressureUnit: "hPa",
	setPressureUnit() {}, selectAircraft() {}, setLimit() {},
};

describe("Dashboard re-render discipline", () => {
	it("REGRESSION: a VATSIM-only update re-renders only the traffic panels", () => {
		const { rerender } = render(<Dashboard briefing={base} {...props} />);
		const before = { ...c };
		for (let i = 0; i < 4; i++) {
			// useBriefing 輪詢：只換 vatsim，其餘欄位保持同一個引用
			rerender(<Dashboard briefing={{ ...base, vatsim: { ...base.vatsim, arrivals: [{ cid: i }] } }} {...props} />);
		}
		const delta = Object.fromEntries(Object.keys(c).map((k) => [k, c[k] - before[k]]));
		expect(delta.weather).toBe(0);
		expect(delta.taf).toBe(0);
		expect(delta.notam).toBe(0);
		expect(delta.card).toBe(0);
		expect(delta.landing).toBe(0);
		expect(delta.traffic).toBe(4); // 真的有變的面板仍會更新
	});

	it("a real weather change does re-render the weather panels", () => {
		const { rerender } = render(<Dashboard briefing={base} {...props} />);
		const before = c.weather;
		rerender(<Dashboard briefing={{ ...base, weather: { ...base.weather, wind_speed: { value: 20 } } }} {...props} />);
		expect(c.weather).toBeGreaterThan(before);
	});

	it("shows the summary strip above everything and links to the runway analysis", () => {
		render(<Dashboard briefing={base} {...props} />);
		expect(screen.getByRole("region", { name: /RCTP 簡報摘要/ })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "跑道分析" }).id).toBe("runway-analysis");
		expect(screen.getByRole("link", { name: /查看跑道分析/ })).toBeTruthy();
	});
});
