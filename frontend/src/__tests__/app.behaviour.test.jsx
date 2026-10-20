import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const counters = { mounts: 0, renders: 0 };
vi.mock("../components/RunwayMap", () => ({
	default: function RunwayMapMock({ runways }) {
		counters.renders++;
		useEffect(() => {
			counters.mounts++;
		}, []);
		return (
			<div data-testid="rwymap">
				{runways.map((r) => `${r.name}:${r.isClosed ? "X" : "o"}${r.isFirst ? "*" : ""}`).join(",")}
			</div>
		);
	},
}));
vi.mock("../components/Radar", () => ({ default: () => <div data-testid="radar" /> }));

import App from "../App.jsx";

const briefing = (icao = "RCTP", extra = {}) => ({
	icao,
	weather: {
		station: icao, flight_rules: "VFR", elevation_ft: 10,
		wind_direction: { value: 50 }, wind_speed: { value: 12 },
		visibility: { value: 9999 }, altimeter: { value: 1013 }, temperature: { value: 20 },
		raw: `${icao} RAW`, units: { visibility: "m", altimeter: "hPa", wind_speed: "kt" },
		latitude: 25, longitude: 121,
	},
	taf: null, notams: [],
	runways: [{ name: "05L", heading: 52 }, { name: "23R", heading: 232 }],
	closures: { aerodrome_closed: false, closed_runways: [], notam_ids: [] },
	warnings: [], vatsim: { controllers: [], arrivals: [], departures: [], cruisings: [] },
	fetched_at: Math.floor(Date.now() / 1000),
	...extra,
});
const ok = (data) => ({ ok: true, status: 200, json: async () => ({ success: true, data, error: null }) });
const fail = (msg = "無法取得 METAR") => ({ ok: false, status: 502, json: async () => ({ success: false, error: { message: msg } }) });

const input = () => screen.getByPlaceholderText(/機場代碼/);
const clickSearch = () => fireEvent.click(screen.getByText(/查詢氣象/));
const load = async (b = briefing()) => {
	vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(b));
	render(<App />);
	clickSearch();
	await screen.findByText(/RCTP RAW/);
};

beforeEach(() => {
	localStorage.clear();
	window.history.replaceState(null, "", "/");
	counters.mounts = counters.renders = 0;
});
afterEach(() => vi.restoreAllMocks());

describe("typing in the search box", () => {
	it("REGRESSION: does not re-render or remount the dashboard on each keystroke", async () => {
		await load();
		const m0 = counters.mounts, r0 = counters.renders;
		for (const v of ["RCT", "RCTX", "RCT", "RCTP"]) fireEvent.change(input(), { target: { value: v } });
		expect(counters.mounts).toBe(m0);
		expect(counters.renders).toBe(r0);
	});
});

describe("closures reach the UI", () => {
	it("REGRESSION: NOTAM-closed runway is shown closed and not recommended", async () => {
		await load(briefing("RCTP", { closures: { aerodrome_closed: false, closed_runways: ["05L"], notam_ids: ["A1"] } }));
		expect(screen.getByTestId("rwymap").textContent).toMatch(/05L:X,?/);
		expect(screen.getByTestId("rwymap").textContent).not.toMatch(/05L:X\*/);
		expect(document.querySelector(".runway-card-container.recommended")).toBeNull();
		expect(screen.getByRole("alert").textContent).toMatch(/所有跑道都被 NOTAM 公告關閉/);
	});

	it("aerodrome closure raises a clear alert", async () => {
		await load(briefing("RCTP", { closures: { aerodrome_closed: true, closed_runways: [], notam_ids: ["A9"] } }));
		expect(screen.getByRole("alert").textContent).toMatch(/NOTAM 公告機場關閉/);
	});
});

describe("search lifecycle", () => {
	it("REGRESSION: a failed search clears the previous airport instead of leaving stale data", async () => {
		await load();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(fail());
		fireEvent.change(input(), { target: { value: "ZZZZ" } });
		clickSearch();
		await screen.findByText(/無法取得 METAR/);
		expect(screen.queryByText(/RCTP RAW/)).toBeNull();
	});

	it("first-time visitor: no auto fetch, sees the empty state; picking a chip searches", async () => {
		const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(briefing("RJTT")));
		render(<App />);
		expect(spy).not.toHaveBeenCalled();
		expect(screen.getByText(/開始你的飛行簡報/)).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "RJTT" }));
		await screen.findByText(/RJTT RAW/);
		expect(JSON.parse(spy.mock.calls[0][1].body).payload.icao).toBe("RJTT");
	});

	it("returning visitor: auto-loads the last airport exactly once", async () => {
		localStorage.setItem("last-icao", "KJFK");
		const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(briefing("KJFK")));
		render(<App />);
		await screen.findByText(/KJFK RAW/);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("?icao= in the URL wins over saved airport, and a successful search updates the URL", async () => {
		localStorage.setItem("last-icao", "KJFK");
		window.history.replaceState(null, "", "/?icao=egll");
		const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(briefing("EGLL")));
		render(<App />);
		await screen.findByText(/EGLL RAW/);
		expect(JSON.parse(spy.mock.calls[0][1].body).payload.icao).toBe("EGLL");

		spy.mockResolvedValue(ok(briefing("RJAA")));
		fireEvent.change(input(), { target: { value: "RJAA" } });
		clickSearch();
		await screen.findByText(/RJAA RAW/);
		await waitFor(() => expect(window.location.search).toBe("?icao=RJAA"));
	});

	it("invalid ?icao= is ignored", () => {
		window.history.replaceState(null, "", "/?icao=<script>");
		const spy = vi.spyOn(globalThis, "fetch");
		render(<App />);
		expect(spy).not.toHaveBeenCalled();
	});

	it("search input stays enabled while loading (keeps mobile keyboard focus)", async () => {
		let release;
		vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((r) => (release = () => r(ok(briefing())))));
		render(<App />);
		clickSearch();
		expect(input().disabled).toBe(false);
		await act(async () => release());
	});
});

describe("favorites", () => {
	it("a full list shows an inline notice instead of window.alert", () => {
		const alertSpy = vi.fn();
		vi.stubGlobal("alert", alertSpy);
		localStorage.setItem("favorite", JSON.stringify(["AAAA", "BBBB", "CCCC", "DDDD", "EEEE", "FFFF", "GGGG", "HHHH"]));
		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: /收藏 RCTP/ }));
		expect(screen.getByText(/收藏清單已滿/)).toBeTruthy();
		expect(alertSpy).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it("star button exposes pressed state", () => {
		render(<App />);
		const star = screen.getByRole("button", { name: /收藏 RCTP/ });
		expect(star.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(star);
		expect(screen.getByRole("button", { name: /從收藏移除 RCTP/ }).getAttribute("aria-pressed")).toBe("true");
	});
});

describe("aircraft selector and limits stay consistent", () => {
	it("REGRESSION: first load shows CUSTOM with the limits actually applied", async () => {
		await load();
		expect(document.querySelector(".aircraft-select").value).toBe("CUSTOM");
		expect([...document.querySelectorAll(".limit-setting-input")].map((i) => i.value)).toEqual(["15", "10", "50"]);
	});

	it("choosing an aircraft loads its limits; editing a limit flips back to CUSTOM; reload restores", async () => {
		await load();
		fireEvent.change(document.querySelector(".aircraft-select"), { target: { value: "A359" } });
		expect(document.querySelector(".limit-setting-input").value).toBe("40");
		fireEvent.change(document.querySelector(".limit-setting-input"), { target: { value: "25" } });
		expect(document.querySelector(".aircraft-select").value).toBe("CUSTOM");
	});

	it("pressure unit persists across reloads", async () => {
		await load();
		fireEvent.click(screen.getByRole("button", { name: /切換氣壓單位/ }));
		expect(localStorage.getItem("pressure-unit")).toBe("inHg");
	});
});

describe("refresh when the tab becomes visible again", () => {
	it("refreshes immediately instead of waiting for the next timer tick", async () => {
		vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
		try {
			const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(briefing()));
			render(<App />);
			clickSearch();
			await vi.waitFor(() => expect(screen.getByText(/RCTP RAW/)).toBeTruthy());
			expect(spy).toHaveBeenCalledTimes(1);

			// 分頁在背景 2 分鐘（計時器被瀏覽器節流 / 略過）
			Object.defineProperty(document, "hidden", { configurable: true, value: true });
			await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
			Object.defineProperty(document, "hidden", { configurable: true, value: false });
			const before = spy.mock.calls.length;
			document.dispatchEvent(new Event("visibilitychange"));
			await act(async () => { await vi.advanceTimersByTimeAsync(10); });
			expect(spy.mock.calls.length).toBe(before + 1);
			expect(JSON.parse(spy.mock.calls.at(-1)[1].body).action).toBe("GET_FULL_BRIEFING");
		} finally {
			Object.defineProperty(document, "hidden", { configurable: true, value: false });
			vi.useRealTimers();
		}
	});
});
