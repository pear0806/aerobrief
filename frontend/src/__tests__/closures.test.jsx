import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRunwayAnalysis } from "../hooks/useRunwayAnalysis.js";

const LIMITS = { CrossWindLimit: 30, TailWindLimit: 10, HeadWindLimit: 50 };
const data = (closures, wind = { dir: 50, spd: 12 }) => ({
	common: { wind_direction: { value: wind.dir }, wind_speed: { value: wind.spd }, units: { wind_speed: "kt" } },
	runways: [{ name: "05L", heading: 52 }, { name: "23R", heading: 232 }, { name: "05R", heading: 52 }, { name: "23L", heading: 232 }],
	closures,
});
const run = (d) => renderHook(() => useRunwayAnalysis(d, LIMITS)).result.current;

describe("runway analysis × NOTAM closures", () => {
	it("REGRESSION: a runway closed by NOTAM is never recommended, even with a perfect headwind", () => {
		const r = run(data({ closed_runways: ["05L", "23R"], aerodrome_closed: false }));
		const by = Object.fromEntries(r.processedRunways.map((x) => [x.name, x]));
		expect(by["05L"].isClosed).toBe(true);
		expect(by["05L"].isFirst).toBe(false);
		expect(by["23R"].isClosed).toBe(true);
		expect(by["05R"].isFirst).toBe(true);
		expect(by["05L"].dangerMessage).toMatch(/NOTAM/);
		expect(r.noSafeRunway).toBe(false);
	});

	it("closed runways sort after open ones", () => {
		const r = run(data({ closed_runways: ["05L"], aerodrome_closed: false }));
		const names = r.processedRunways.map((x) => x.name);
		expect(names.slice(-2).sort()).toEqual(["05L", "23R"]);
	});

	it("all runways closed → no recommendation, reason 'closed'", () => {
		const r = run(data({ closed_runways: ["05L", "05R"], aerodrome_closed: false }));
		expect(r.processedRunways.every((x) => x.isClosed && !x.isFirst)).toBe(true);
		expect(r.noSafeRunway).toBe(true);
		expect(r.noSafeReason).toBe("closed");
	});

	it("aerodrome closed → reason 'aerodrome' and nothing recommended", () => {
		const r = run(data({ closed_runways: [], aerodrome_closed: true }));
		expect(r.noSafeReason).toBe("aerodrome");
		expect(r.processedRunways.some((x) => x.isFirst)).toBe(false);
	});

	it("closed + VRB wind still marks closure and never recommends", () => {
		const d = data({ closed_runways: ["ALL"], aerodrome_closed: false });
		d.common.wind_direction = { value: null };
		const r = run(d);
		expect(r.processedRunways.every((x) => x.isClosed)).toBe(true);
		expect(r.noSafeReason).toBe("closed");
	});

	it("no closures → behaves as before; wind-only reason is 'wind'", () => {
		expect(run(data(undefined)).noSafeReason).toBeNull();
		const strong = run(data(undefined, { dir: 140, spd: 60 }));
		expect(strong.noSafeReason).toBe("wind");
	});

	it("estimated headings are carried through for the UI", () => {
		const d = data(undefined);
		d.runways[0].approx = true;
		const r = run(d);
		expect(r.processedRunways.find((x) => x.name === "05L").approx).toBe(true);
	});
});
