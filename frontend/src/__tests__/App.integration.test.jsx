import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App.jsx";

// Leaflet 在 jsdom 不可用，且與這裡要驗證的邏輯無關
vi.mock("../components/Radar", () => ({ default: () => <div data-testid="radar" /> }));

const briefing = (icao, extra = {}) => ({
	icao,
	weather: {
		station: icao, flight_rules: "VFR", elevation_ft: 10,
		wind_direction: { value: 90 }, wind_speed: { value: 10 },
		visibility: { value: 9999 }, altimeter: { value: 1013 },
		temperature: { value: 20 }, raw: `${icao} RAW`,
		units: { visibility: "m", altimeter: "hPa", wind_speed: "kt" },
	},
	taf: null, notams: [], runways: [{ name: "09", heading: 90 }],
	warnings: [], vatsim: { controllers: [], arrivals: [], departures: [], cruisings: [] },
	...extra,
});

const ok = (data) => ({ ok: true, status: 200, json: async () => ({ success: true, data, error: null }) });

const deferred = () => {
	let resolve;
	const promise = new Promise((r) => (resolve = r));
	return { promise, resolve };
};

beforeEach(() => {
	localStorage.clear();
	window.history.replaceState(null, "", "/"); // App 會把 ?icao= 寫進網址，避免測試間互相汙染
});
afterEach(() => vi.restoreAllMocks());

const search = (icao) => {
	fireEvent.change(screen.getByPlaceholderText(/機場代碼/), { target: { value: icao } });
	fireEvent.click(screen.getByText(/查詢氣象/));
};

describe("App", () => {
	it("rejects malformed ICAO without calling the API", async () => {
		const spy = vi.spyOn(globalThis, "fetch");
		render(<App />);
		search("AB");
		expect(await screen.findByText(/4 碼 ICAO/)).toBeTruthy();
		expect(spy).not.toHaveBeenCalled();
	});

	it("shows backend error message from non-200 JSON body", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue({
			ok: false, status: 502,
			json: async () => ({ success: false, error: { message: "無法取得 METAR" } }),
		});
		render(<App />);
		search("RCTP");
		expect(await screen.findByText(/無法取得 METAR/)).toBeTruthy();
	});

	it("renders degraded warnings from backend", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(briefing("RCTP", { warnings: ["NOTAM 暫時無法取得（HTTP 500）"] })));
		render(<App />);
		search("RCTP");
		expect(await screen.findByText(/NOTAM 暫時無法取得/)).toBeTruthy();
	});

	it("a late background VATSIM poll for the old airport cannot overwrite the new airport", async () => {
		const stalePoll = deferred();
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		fetchSpy.mockResolvedValueOnce(ok(briefing("RCTP")));

		vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
		try {
			render(<App />);
			search("RCTP");
			await waitFor(() => expect(screen.getByText(/RCTP RAW/)).toBeTruthy());

			// 15 秒輪詢觸發，但回應被卡住
			fetchSpy.mockImplementationOnce(() => stalePoll.promise);
			await vi.advanceTimersByTimeAsync(15000);

			// 使用者此時改查 KJFK
			fetchSpy.mockResolvedValueOnce(ok(briefing("KJFK")));
			search("KJFK");
			await waitFor(() => expect(screen.getByText(/KJFK RAW/)).toBeTruthy());

			// 舊機場的輪詢回應晚到
			stalePoll.resolve(
				ok({ controllers: [{ callsign: "RCTP_TWR", frequency: "118.1", name: "OLD" }], arrivals: [], departures: [], cruisings: [] }),
			);
			await new Promise((r) => setTimeout(r, 30));
			expect(screen.queryByText("RCTP_TWR")).toBeNull();
			expect(screen.getByText(/KJFK RAW/)).toBeTruthy();
		} finally {
			vi.useRealTimers();
		}
	});

	it("one broken panel does not blank the whole page", async () => {
		const bad = briefing("RCTP");
		bad.notams = [{ category: null, raw: null, start_time: 1, end_time: 2 }];
		bad.taf = { raw: "x", forecast: [{ wind_speed: { value: 1 }, wx_codes: [{}] }] };
		vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(bad));
		vi.spyOn(console, "error").mockImplementation(() => {});
		render(<App />);
		search("RCTP");
		expect(await screen.findByText(/RCTP RAW/)).toBeTruthy();
	});
});
