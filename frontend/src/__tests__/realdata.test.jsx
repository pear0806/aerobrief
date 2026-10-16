// 以下 fixture 取自 2026-10-16 實際 AVWX 回應（live_probe.py 輸出）
import { render, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TafTimeline from "../components/TafTimeline.jsx";
import WeatherDashboard from "../components/WeatherDashboard.jsx";
import { useRunwayAnalysis } from "../hooks/useRunwayAnalysis.js";

const limits = { CrossWindLimit: 25, TailWindLimit: 10, HeadWindLimit: 50 };

const ZBAA = {
	station: "ZBAA",
	flight_rules: "VFR",
	elevation_ft: 116,
	raw: "ZBAA 160800Z VRB01MPS CAVOK 19/05 Q1022 NOSIG",
	units: {
		altimeter: "hPa",
		temperature: "C",
		visibility: "m",
		wind_speed: "m/s",
	},
	wind_direction: { repr: "VRB", value: null },
	wind_speed: { repr: "01", value: 1 },
	wind_gust: null,
	visibility: { repr: "CAVOK", value: 9999 },
	altimeter: { repr: "Q1022", value: 1022 },
	temperature: { value: 19 },
};
const KJFK = {
	station: "KJFK",
	flight_rules: "VFR",
	elevation_ft: 13,
	raw: "KJFK 160751Z 16011KT 10SM",
	units: {
		altimeter: "inHg",
		temperature: "C",
		visibility: "sm",
		wind_speed: "kt",
	},
	wind_direction: { repr: "160", value: 160 },
	wind_speed: { value: 11 },
	wind_gust: null,
	visibility: { repr: "10", value: 10 },
	altimeter: { repr: "A3004", value: 30.04 },
	temperature: { value: 17 },
};
const RCTP = {
	station: "RCTP",
	flight_rules: "VFR",
	elevation_ft: 106,
	raw: "RCTP 160800Z 04009KT 010V080 9999",
	units: {
		altimeter: "hPa",
		visibility: "m",
		wind_speed: "kt",
		temperature: "C",
	},
	wind_direction: { repr: "040", value: 40 },
	wind_speed: { value: 9 },
	wind_gust: null,
	visibility: { repr: "9999", value: 9999 },
	altimeter: { value: 1013 },
	temperature: { value: 31 },
};
const rctpRunways = [
	{ name: "05L", heading: 49 },
	{ name: "23R", heading: 229 },
	{ name: "05R", heading: 49 },
	{ name: "23L", heading: 229 },
];

const text = (data, unit) => {
	const { container } = render(
		<WeatherDashboard
			data={{ common: data }}
			pressureUnit={unit}
			setPressureUnit={() => {}}
		/>,
	);
	return container.textContent;
};

describe("real AVWX payloads", () => {
	it("ZBAA: wind shown in m/s, VRB, visibility in m", () => {
		const t = text(ZBAA, "hPa");
		expect(t).toContain("VRB");
		expect(t).toMatch(/1\s*m\/s/);
		expect(t).not.toMatch(/\bkts\b/);
		expect(t).toMatch(/9999\s*m/);
	});

	it("KJFK: shows 30.04 inHg, converts to ~1017 hPa, never 0.89", () => {
		expect(text(KJFK, "inHg")).toContain("30.04");
		expect(text(KJFK, "hPa")).toMatch(/101[67]/);
		expect(text(KJFK, "inHg")).not.toContain("0.89");
		expect(text(KJFK, "inHg")).toMatch(/10\s*sm/);
	});

	it("ZBAA VRB 1 m/s: no wind components, no danger, no recommendation", () => {
		const rw = [
			{ name: "01", heading: 353 },
			{ name: "19", heading: 173 },
		];
		const { result } = renderHook(() =>
			useRunwayAnalysis({ common: ZBAA, runways: rw }, limits),
		);
		expect(result.current.windDir).toBeNull();
		expect(result.current.isVariable).toBe(true);
		expect(result.current.windSpeed).toBe(2); // 1 m/s ≈ 2 kt
		expect(
			result.current.processedRunways.every((r) => !r.isDanger && !r.isFirst),
		).toBe(true);
	});

	it("m/s is converted to knots before the limits are applied", () => {
		const windy = {
			...ZBAA,
			wind_direction: { value: 90 },
			wind_speed: { value: 15 },
		}; // 15 m/s ≈ 29 kt
		const rw = [{ name: "36", heading: 0 }]; // 純側風
		const { result } = renderHook(() =>
			useRunwayAnalysis({ common: windy, runways: rw }, limits),
		);
		expect(result.current.windSpeed).toBe(29);
		expect(result.current.processedRunways[0].isDanger).toBe(true);
	});

	it("RCTP 040/09: recommends 05L/05R (into wind), 23x flagged tailwind-free but not recommended", () => {
		const { result } = renderHook(() =>
			useRunwayAnalysis({ common: RCTP, runways: rctpRunways }, limits),
		);
		const first = result.current.processedRunways
			.filter((r) => r.isFirst)
			.map((r) => r.name)
			.sort();
		expect(first).toEqual(["05L", "05R"]);
	});

	it("ZBAA TAF 10004MPS is labelled m/s, P6SM keeps its repr", () => {
		const taf = {
			units: { wind_speed: "m/s" },
			forecast: [
				{
					type: "FROM",
					flight_rules: "IFR",
					wind_direction: { repr: "100", value: 100 },
					wind_speed: { value: 4 },
					visibility: { repr: "4000", value: 4000 },
					start_time: { repr: "1606" },
					end_time: { repr: "1616" },
				},
			],
		};
		const { container } = render(<TafTimeline tafData={taf} />);
		expect(container.textContent).toMatch(/4\s*m\/s/);
		expect(container.textContent).not.toMatch(/kts/);
		const us = {
			units: { wind_speed: "kt" },
			forecast: [
				{
					type: "FROM",
					flight_rules: "VFR",
					wind_direction: { repr: "150", value: 150 },
					wind_speed: { value: 7 },
					visibility: { repr: "P6", value: null },
					start_time: { repr: "1606" },
					end_time: { repr: "1608" },
				},
			],
		};
		expect(
			render(<TafTimeline tafData={us} />).container.textContent,
		).toContain("P6");
	});
});
