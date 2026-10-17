import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { aircraftDatabase } from "../data/aircrafts.js";
import { loadSettings, useSettings } from "../hooks/useSettings.js";

const store = (obj = {}) => ({ getItem: (k) => (k in obj ? obj[k] : null) });

describe("loadSettings", () => {
	it("fresh user: CUSTOM with conservative defaults (selector and limits agree)", () => {
		const s = loadSettings(store());
		expect(s.aircraft).toBe("CUSTOM");
		expect(s.limits).toEqual({ cross: 15, tail: 10, head: 20 });
		expect(s.pressureUnit).toBe("hPa");
	});

	it("saved aircraft with matching limits is kept", () => {
		const a = aircraftDatabase.A359;
		const s = loadSettings(store({
			aircraft: "A359", "crosswind-limit": a.cross, "tailwind-limit": a.tail, "headwind-limit": a.head,
		}));
		expect(s.aircraft).toBe("A359");
		expect(s.limits).toEqual({ cross: a.cross, tail: a.tail, head: a.head });
	});

	it("saved aircraft but no saved limits → loads the aircraft's own limits", () => {
		const s = loadSettings(store({ aircraft: "B738" }));
		expect(s.limits.cross).toBe(aircraftDatabase.B738.cross);
	});

	it("REGRESSION: limits edited away from the aircraft's → falls back to CUSTOM, never shows a mismatched aircraft", () => {
		const s = loadSettings(store({ aircraft: "B77W", "crosswind-limit": "20" }));
		expect(s.aircraft).toBe("CUSTOM");
		expect(s.limits.cross).toBe(20);
	});

	it("a saved limit of 0 is preserved (old `|| 15` ate it)", () => {
		expect(loadSettings(store({ "crosswind-limit": "0" })).limits.cross).toBe(0);
	});

	it("garbage values are ignored; unknown aircraft → CUSTOM", () => {
		const s = loadSettings(store({ aircraft: "NOPE", "crosswind-limit": "abc", "tailwind-limit": "-5", "pressure-unit": "zzz" }));
		expect(s.aircraft).toBe("CUSTOM");
		expect(s.limits).toEqual({ cross: 15, tail: 10, head: 20 });
		expect(s.pressureUnit).toBe("hPa");
	});

	it("survives a throwing storage (privacy mode)", () => {
		const bad = { getItem: () => { throw new Error("denied"); } };
		expect(loadSettings(bad).aircraft).toBe("CUSTOM");
		expect(loadSettings(null).aircraft).toBe("CUSTOM");
	});
});

describe("useSettings", () => {
	beforeEach(() => localStorage.clear());

	it("selecting an aircraft loads its limits; editing a limit switches to CUSTOM; all persisted", () => {
		const { result } = renderHook(() => useSettings());
		act(() => result.current.selectAircraft("A359"));
		expect(result.current.aircraft).toBe("A359");
		expect(result.current.limits.cross).toBe(aircraftDatabase.A359.cross);

		act(() => result.current.setLimit("cross", 22));
		expect(result.current.aircraft).toBe("CUSTOM");
		expect(result.current.limits.cross).toBe(22);
		expect(localStorage.getItem("aircraft")).toBe("CUSTOM");
		expect(localStorage.getItem("crosswind-limit")).toBe("22");

		act(() => result.current.setPressureUnit("inHg"));
		expect(localStorage.getItem("pressure-unit")).toBe("inHg");
	});

	it("selecting CUSTOM keeps the current numbers", () => {
		const { result } = renderHook(() => useSettings());
		act(() => result.current.selectAircraft("B738"));
		act(() => result.current.selectAircraft("CUSTOM"));
		expect(result.current.limits.cross).toBe(aircraftDatabase.B738.cross);
	});

	it("NaN from an emptied number input becomes 0, not NaN", () => {
		const { result } = renderHook(() => useSettings());
		act(() => result.current.setLimit("tail", Number("")));
		expect(result.current.limits.tail).toBe(0);
	});

	it("reload restores a consistent state", () => {
		const first = renderHook(() => useSettings());
		act(() => first.result.current.selectAircraft("B738"));
		first.unmount();
		const second = renderHook(() => useSettings());
		expect(second.result.current.aircraft).toBe("B738");
		expect(second.result.current.limits.cross).toBe(aircraftDatabase.B738.cross);
	});
});
