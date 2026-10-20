import { fireEvent, render, screen } from "@testing-library/react";
import L from "leaflet";
import { describe, expect, it, vi } from "vitest";

import DataFreshness from "../components/DataFreshness.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import Radar from "../components/Radar.jsx";
import RunwayCard from "../components/RunwayCard.jsx";
import RunwayMap from "../components/RunwayMap.jsx";
import TafTimeline from "../components/TafTimeline.jsx";
import VatsimStatus from "../components/VatsimStatus.jsx";
import VatsimTraffic from "../components/VatsimTraffic.jsx";
import { ageMinutes, formatAge, formatTafTime } from "../utils/time.js";

const pilot = (over = {}) => ({
	callsign: "CAL1", cid: 1, aircraft_short: "B77W", departure: "RJAA", arrival: "RCTP",
	altitude: 35000, groundspeed: 480, latitude: 25, longitude: 121, heading: 90, ...over,
});

describe("time utils", () => {
	it("formatTafRange: same day collapses, cross-day spells both days", async () => {
		const { formatTafRange } = await import("../utils/time.js");
		expect(formatTafRange("1712", "1718")).toBe("17日 12–18Z");
		expect(formatTafRange("1718", "1800")).toBe("17日 18Z → 18日 00Z");
		expect(formatTafRange("x", "y")).toBe("xZ → yZ");
	});
	it("formatTafTime reads ddhh, not hhmm", () => {
		expect(formatTafTime("1606")).toBe("16日 06Z");
		expect(formatTafTime("abc")).toBe("abcZ");
		expect(formatTafTime(undefined)).toBe("?");
	});
	it("formatAge", () => {
		expect(formatAge(0)).toBe("剛剛");
		expect(formatAge(25)).toBe("25 分鐘前");
		expect(formatAge(60)).toBe("1 小時前");
		expect(formatAge(135)).toBe("2 小時 15 分鐘前");
		expect(formatAge(null)).toBe("未知");
	});
	it("ageMinutes", () => {
		const now = Date.parse("2026-10-17T12:30:00Z");
		expect(ageMinutes("2026-10-17T12:00:00Z", now)).toBe(30);
		expect(ageMinutes("garbage", now)).toBeNull();
		expect(ageMinutes("2026-10-17T13:00:00Z", now)).toBe(0); // 未來時間不出現負數
	});
});

describe("DataFreshness", () => {
	const now = Date.parse("2026-10-17T12:30:00Z");
	const ago = (min) => new Date(now - min * 60000).toISOString();
	const nowSec = Math.floor(now / 1000);

	it("fresh METAR shows UTC time and age, no warning", () => {
		const { container } = render(<DataFreshness metarTime={ago(20)} fetchedAt={nowSec} now={now} />);
		expect(screen.getByText(/METAR 發布 12:10Z（20 分鐘前）/)).toBeTruthy();
		expect(container.firstChild.className).toContain("ok");
		expect(screen.queryByText(/已過期/)).toBeNull();
	});
	it("≥70 min warns, ≥90 min says it may be expired", () => {
		const a = render(<DataFreshness metarTime={ago(75)} fetchedAt={nowSec} now={now} />);
		expect(a.container.firstChild.className).toContain("warn");
		a.unmount();
		const b = render(<DataFreshness metarTime={ago(95)} fetchedAt={nowSec} now={now} />);
		expect(b.container.firstChild.className).toContain("stale");
		expect(screen.getByText(/可能已過期/)).toBeTruthy();
	});
	it("background refresh failing for >10 min is called out", () => {
		render(<DataFreshness metarTime={ago(5)} fetchedAt={nowSec - 15 * 60} now={now} />);
		expect(screen.getByText(/背景更新似乎失敗/)).toBeTruthy();
	});
	it("renders nothing without any timestamps", () => {
		const { container } = render(<DataFreshness />);
		expect(container.firstChild).toBeNull();
	});
});

describe("VatsimTraffic", () => {
	it("REGRESSION: a flight that is both arriving and cruising counts once", () => {
		const p = pilot();
		render(<VatsimTraffic arrivals={[p]} departures={[]} cruisings={[p]} />);
		expect(document.querySelector(".flight-badge").textContent).toMatch(/共 1 架次/);
	});
	it("distinct flights add up; empty airspace message", () => {
		const { unmount } = render(
			<VatsimTraffic arrivals={[pilot({ cid: 1 })]} departures={[pilot({ cid: 2, callsign: "EVA2" })]} cruisings={[]} />,
		);
		expect(document.querySelector(".flight-badge").textContent).toMatch(/共 2 架次/);
		unmount();
		render(<VatsimTraffic arrivals={[]} departures={[]} cruisings={[]} />);
		expect(screen.getByText(/空域非常安靜/)).toBeTruthy();
	});
});

describe("VatsimStatus", () => {
	it("lists controllers with LIVE badge; shows UNICOM when nobody is online", () => {
		const { unmount } = render(<VatsimStatus controller={[{ callsign: "RCTP_TWR", cid: 5, name: "X", frequency: "118.1" }]} />);
		expect(screen.getByText("RCTP_TWR")).toBeTruthy();
		expect(screen.getByText(/LIVE/)).toBeTruthy();
		unmount();
		render(<VatsimStatus controller={[]} />);
		expect(screen.getByText(/UNICOM 122.800/)).toBeTruthy();
	});
	it("loading state", () => {
		render(<VatsimStatus controller={[]} loading />);
		expect(screen.getByText(/正在掃描 VATSIM/)).toBeTruthy();
	});
});

describe("TafTimeline", () => {
	const taf = {
		raw: "TAF X", units: { wind_speed: "kt" },
		forecast: [{
			type: "TEMPO", probability: { value: 30 },
			start_time: { repr: "1606" }, end_time: { repr: "1612" },
			wind_direction: { value: 90, repr: "090" }, wind_speed: { value: 12 },
			visibility: { repr: "3000" }, flight_rules: "MVFR",
			clouds: [{ repr: "FEW010", type: "FEW" }, { repr: "BKN012", type: "BKN" }],
		}],
	};
	it("REGRESSION: shows cloud layers, highlights the ceiling, PROB and ddhh times", () => {
		const { container } = render(<TafTimeline tafData={taf} />);
		expect(screen.getByText("BKN012").className).toContain("ceiling-layer");
		expect(screen.getByText("FEW010").className).not.toContain("ceiling-layer");
		expect(container.querySelector(".time-type").textContent).toMatch(/TEMPO PROB30/);
		expect(container.querySelector(".time-text").textContent).toMatch(/16日 06–12Z/);
	});
	it("falls back to type+altitude when repr is missing", () => {
		const t = JSON.parse(JSON.stringify(taf));
		t.forecast[0].clouds = [{ type: "OVC", altitude: 8 }];
		render(<TafTimeline tafData={t} />);
		expect(screen.getByText("OVC008")).toBeTruthy();
	});
});

describe("RunwayMap", () => {
	const rw = [
		{ name: "05L", heading: 52, isFirst: true, isClosed: false },
		{ name: "23R", heading: 232, isFirst: false, isClosed: true },
	];
	it("labels each runway end, styles closed ones, and is accessible", () => {
		const { container } = render(<RunwayMap runways={rw} windDir={50} />);
		const labels = [...container.querySelectorAll(".runway-label")].map((t) => t.textContent);
		expect(labels).toEqual(["05L", "23R"]);
		expect(container.querySelector(".runway-label.closed").textContent).toBe("23R");
		expect(container.querySelector(".closed-runway")).toBeTruthy();
		expect(container.querySelector("svg").getAttribute("role")).toBe("img");
		expect(container.querySelector("svg").getAttribute("aria-label")).toMatch(/05L、23R.*50°/);
		expect(screen.getByText(/NOTAM 關閉/)).toBeTruthy();
	});
	it("label of an upright-heading runway sits just beyond the threshold end", () => {
		const { container } = render(<RunwayMap runways={[{ name: "18", heading: 180 }]} windDir={null} />);
		const t = container.querySelector(".runway-label");
		// 航向 180°：入口端在畫面上方 → y 應小於圓心(160)
		expect(Number(t.getAttribute("y"))).toBeLessThan(160 - 100);
		expect(Math.abs(Number(t.getAttribute("x")) - 160)).toBeLessThan(1);
	});
});

describe("RunwayCard", () => {
	const base = { runwayName: "05L", heading: 52, windDir: 50, crosswind: 1, headwind: 10, isHeadwind: true, index: 0 };
	it("closed card shows the NOTAM message and never the recommended badge", () => {
		const { container } = render(<RunwayCard {...base} isFirst isClosed dangerMessage="🚫 NOTAM 公告關閉" />);
		expect(container.querySelector(".runway-card-container.closed")).toBeTruthy();
		expect(screen.getByText(/NOTAM 公告關閉/)).toBeTruthy();
		expect(screen.queryByText(/最佳推薦/)).toBeNull();
	});
	it("estimated heading is flagged", () => {
		render(<RunwayCard {...base} approx />);
		expect(screen.getByText("估算")).toBeTruthy();
		expect(screen.getByText(/≈/)).toBeTruthy();
	});
});

describe("ErrorBoundary", () => {
	it("catches, shows retry, and resets when resetKey changes", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		let boom = true;
		const Bomb = () => {
			if (boom) throw new Error("x");
			return <div>fine</div>;
		};
		const { rerender } = render(<ErrorBoundary resetKey="A" label="面板"><Bomb /></ErrorBoundary>);
		expect(screen.getByRole("alert").textContent).toMatch(/面板顯示失敗/);
		boom = false;
		rerender(<ErrorBoundary resetKey="B" label="面板"><Bomb /></ErrorBoundary>);
		expect(screen.getByText("fine")).toBeTruthy();
		vi.restoreAllMocks();
	});
	it("manual retry button re-renders children", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		let boom = true;
		const Bomb = () => (boom ? (() => { throw new Error("x"); })() : <div>ok now</div>);
		render(<ErrorBoundary><Bomb /></ErrorBoundary>);
		boom = false;
		fireEvent.click(screen.getByText("重試"));
		expect(screen.getByText("ok now")).toBeTruthy();
		vi.restoreAllMocks();
	});
});

describe("Radar (real Leaflet in jsdom)", () => {
	const mk = (n) => Array.from({ length: n }, (_, i) => pilot({ cid: i, callsign: `C${i}`, latitude: 25 + i * 0.001, heading: (i * 7) % 360 }));
	const props = { arrivals: [], cruisings: [], airportLat: 25, airportLon: 121, icao: "RCTP" };

	it("renders one marker per distinct aircraft, deduped across lists", () => {
		const p = pilot({ cid: 9 });
		const { container } = render(<Radar {...props} arrivals={[p]} departures={[p]} cruisings={[p]} />);
		expect(container.querySelectorAll(".custom-airplane-icon")).toHaveLength(1);
	});

	it("REGRESSION: a data refresh reuses cached icons instead of building new ones", () => {
		const spy = vi.spyOn(L, "divIcon");
		const { rerender } = render(<Radar {...props} departures={mk(40)} />);
		spy.mockClear();
		rerender(<Radar {...props} departures={mk(40)} />);
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it("renders nothing without airport coordinates", () => {
		const { container } = render(<Radar {...props} airportLat={null} airportLon={null} departures={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("exposes the map as a labelled region", () => {
		render(<Radar {...props} departures={[]} />);
		expect(screen.getByRole("region", { name: /RCTP.*雷達/ })).toBeTruthy();
	});
});
