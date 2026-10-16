import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRunwayAnalysis } from "../hooks/useRunwayAnalysis.js";

const limits = { CrossWindLimit: 25, TailWindLimit: 10, HeadWindLimit: 50 };
const rwys = [
	{ name: "05L", heading: 52 },
	{ name: "23R", heading: 232 },
];
const mk = (dir, spd, gust) => ({
	common: {
		wind_direction: { value: dir },
		wind_speed: { value: spd },
		wind_gust: gust ? { value: gust } : null,
	},
	runways: rwys,
});

describe("useRunwayAnalysis", () => {
	it("recommends the into-wind runway", () => {
		const { result } = renderHook(() => useRunwayAnalysis(mk(50, 15), limits));
		const best = result.current.processedRunways[0];
		expect(best.name).toBe("05L");
		expect(best.isFirst).toBe(true);
	});

	it("flags tailwind over limit", () => {
		const { result } = renderHook(() => useRunwayAnalysis(mk(50, 15), limits));
		const r23 = result.current.processedRunways.find((r) => r.name === "23R");
		expect(r23.isDanger).toBe(true);
	});

	it("empty data returns empty list", () => {
		const { result } = renderHook(() => useRunwayAnalysis(null, limits));
		expect(result.current.processedRunways).toEqual([]);
	});

	it("BUG: VRB wind (null direction) must not be treated as 000°", () => {
		const { result } = renderHook(() => useRunwayAnalysis(mk(null, 5), limits));
		expect(result.current.windDir).toBeNull();
	});

	it("BUG: gusts must be considered for crosswind limit", () => {
		// 150° / 15G40 → 05L 側風 ≈ 39kt（陣風）超過 25kt 限制
		const { result } = renderHook(() =>
			useRunwayAnalysis(mk(142, 15, 40), limits),
		);
		expect(result.current.processedRunways.some((r) => r.isDanger)).toBe(true);
	});

	it("BUG: recommended runway must never be one flagged dangerous", () => {
		const { result } = renderHook(() =>
			useRunwayAnalysis(mk(140, 40, null), { ...limits, CrossWindLimit: 10 }),
		);
		expect(
			result.current.processedRunways.filter((r) => r.isFirst && r.isDanger),
		).toHaveLength(0);
	});
});
