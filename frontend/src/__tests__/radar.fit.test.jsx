import { render } from "@testing-library/react";
import L from "leaflet";
import { afterEach, describe, expect, it, vi } from "vitest";

import Radar from "../components/Radar.jsx";

const p = (cid, lat, lon, extra = {}) => ({
	cid, callsign: `C${cid}`, aircraft_short: "B77W", departure: "RJAA", arrival: "RCTP",
	latitude: lat, longitude: lon, heading: 90, altitude: 5000, groundspeed: 200, ...extra,
});
const base = { cruisings: [], airportLat: 25.08, airportLon: 121.23, icao: "RCTP" };

afterEach(() => vi.restoreAllMocks());

describe("Radar initial viewport", () => {
	// jsdom 沒有版面，地圖尺寸是 0×0；模擬一個真實大小才會走 fitBounds 分支
	const sized = () => vi.spyOn(L.Map.prototype, "getSize").mockReturnValue(L.point(800, 400));

	it("fits the airport plus nearby traffic, excluding far cruising traffic", () => {
		sized();
		const fit = vi.spyOn(L.Map.prototype, "fitBounds");
		render(<Radar {...base} arrivals={[p(1, 25.4, 121.9), p(2, 25.7, 121.5)]} departures={[p(3, 24.7, 121.6)]}
			cruisings={[p(4, 30, 130, { isCruising: true })]} />);
		expect(fit).toHaveBeenCalledTimes(1);
		const pts = fit.mock.calls[0][0];
		expect(pts).toHaveLength(4); // 機場 + 3 架
		expect(fit.mock.calls[0][1].maxZoom).toBe(11);
	});

	it("does NOT re-fit on data refreshes of the same airport (would fight user panning)", () => {
		sized();
		const fit = vi.spyOn(L.Map.prototype, "fitBounds");
		const { rerender } = render(<Radar {...base} arrivals={[p(1, 25.4, 121.9)]} departures={[]} />);
		rerender(<Radar {...base} arrivals={[p(1, 25.45, 121.85), p(9, 25.0, 121.0)]} departures={[]} />);
		rerender(<Radar {...base} arrivals={[p(1, 25.5, 121.8)]} departures={[]} />);
		expect(fit).toHaveBeenCalledTimes(1);
	});

	it("re-fits when the airport changes", () => {
		sized();
		const fit = vi.spyOn(L.Map.prototype, "fitBounds");
		const { rerender } = render(<Radar {...base} arrivals={[p(1, 25.4, 121.9)]} departures={[]} />);
		rerender(<Radar {...base} icao="RJTT" airportLat={35.55} airportLon={139.78} arrivals={[p(7, 35.7, 140.0)]} departures={[]} />);
		expect(fit).toHaveBeenCalledTimes(2);
	});

	it("falls back to the default view when nothing is nearby, or the map has no size", () => {
		const fit = vi.spyOn(L.Map.prototype, "fitBounds");
		const setView = vi.spyOn(L.Map.prototype, "setView");
		sized();
		render(<Radar {...base} arrivals={[]} departures={[]} />);
		expect(fit).not.toHaveBeenCalled();
		expect(setView).toHaveBeenCalled();
		vi.restoreAllMocks();

		const fit2 = vi.spyOn(L.Map.prototype, "fitBounds"); // 沒 mock getSize → 0×0
		render(<Radar {...base} arrivals={[p(1, 25.4, 121.9)]} departures={[]} />);
		expect(fit2).not.toHaveBeenCalled();
	});

	it("aircraft markers carry an accessible name (title)", () => {
		const { container } = render(<Radar {...base} arrivals={[p(1, 25.4, 121.9)]} departures={[]} />);
		const el = container.querySelector(".custom-airplane-icon");
		expect(el.getAttribute("title")).toBe("C1 B77W 抵達");
		expect(container.querySelector(".airport-icon").getAttribute("title")).toBe("RCTP 機場");
	});
});
