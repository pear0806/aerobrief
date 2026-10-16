import { describe, expect, it } from "vitest";

import { calculateCrosswind } from "../utils/calcRWYwind.js";
import { convertPressure } from "../utils/converter.js";
import {
	calculateDensityAltitude,
	getPerformanceImpact,
} from "../utils/physics.js";
import { formatRunways } from "../utils/RWYformatter.js";

describe("calculateCrosswind", () => {
	it("pure headwind", () => {
		expect(calculateCrosswind(90, 90, 20)).toEqual({
			crosswind: 0,
			headwind: 20,
		});
	});
	it("pure crosswind", () => {
		const r = calculateCrosswind(90, 180, 20);
		expect(r.crosswind).toBe(20);
		expect(r.headwind).toBe(0);
	});
	it("pure tailwind is negative headwind", () => {
		expect(calculateCrosswind(90, 270, 20).headwind).toBe(-20);
	});
	it("wraps correctly across 360/0", () => {
		const r = calculateCrosswind(350, 10, 20); // 20° off
		expect(r.headwind).toBe(Math.round(20 * Math.cos((20 * Math.PI) / 180)));
		expect(r.crosswind).toBe(Math.round(20 * Math.sin((20 * Math.PI) / 180)));
	});
	it("does not return -0 for zero crosswind", () => {
		expect(Object.is(calculateCrosswind(90, 90, 0).crosswind, -0)).toBe(false);
	});
});

describe("density altitude", () => {
	it("ISA sea level = 0 ft", () => {
		expect(calculateDensityAltitude(0, 1013.25, 15)).toBe(0);
	});
	it("accepts inHg (<200) as well as hPa", () => {
		expect(calculateDensityAltitude(0, 29.92, 15)).toBe(
			calculateDensityAltitude(0, 1013.25, 15) +
				Math.round((1013.25 - 29.92 * 33.8639) * 30),
		);
	});
	it("hot day increases DA", () => {
		expect(calculateDensityAltitude(0, 1013.25, 35)).toBeGreaterThan(2000);
	});
	it("BUG: undefined temperature must yield null, not NaN", () => {
		const v = calculateDensityAltitude(100, 1013, undefined);
		expect(Number.isNaN(v)).toBe(false);
	});
	it("BUG: elevation 0 with qnh missing returns null", () => {
		expect(calculateDensityAltitude(0, undefined, 15)).toBeNull();
	});
	it("BUG: temp 0°C is valid (not treated as missing)", () => {
		expect(calculateDensityAltitude(0, 1013.25, 0)).not.toBeNull();
	});
	it("impact thresholds", () => {
		expect(getPerformanceImpact(null, 0).text).toBe("N/A");
		expect(getPerformanceImpact(2500, 0).color).toBe("#ef4444");
		expect(getPerformanceImpact(1500, 0).color).toBe("#f59e0b");
		expect(getPerformanceImpact(500, 0).color).toBe("#22c55e");
	});
});

describe("convertPressure", () => {
	it("hPa passthrough", () => {
		expect(convertPressure(1013, "hPa")).toBe(1013);
	});
	it("hPa -> inHg", () => {
		expect(Number(convertPressure(1013, "inHg"))).toBeCloseTo(29.92, 1);
	});
	it("empty -> dash", () => {
		expect(convertPressure(null, "hPa")).toBe("-");
		expect(convertPressure("", "hPa")).toBe("-");
	});
	it("BUG: value already in inHg (US stations) must not be multiplied again", () => {
		// AVWX 對 KJFK 這類測站回傳 29.92 (inHg)。選 inHg 顯示時不應變成 0.88
		const shown = Number(convertPressure(29.92, "inHg"));
		expect(shown).toBeGreaterThan(28);
	});
});

describe("formatRunways", () => {
	it("flattens and sorts", () => {
		const out = formatRunways([
			{ ident1: "23R", bearing1: 232.3, ident2: "05L", bearing2: 52.3 },
		]);
		expect(out.map((r) => r.name)).toEqual(["05L", "23R"]);
	});
	it("BUG: missing bearing must not become NaN", () => {
		const out = formatRunways([{ ident1: "09", bearing1: null }]);
		expect(Number.isNaN(out[0].heading)).toBe(false);
	});
});
